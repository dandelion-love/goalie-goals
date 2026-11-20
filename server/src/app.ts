import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { ConfigError, DEMO_SEED_FLAG, DEV_MOCK_FLAG, type Config } from './config.js';
import { DEV_AUDIENCE, TestSigner } from './devIdentity.js';
import {
  IDENTITY_HEADER,
  ProxyJwtVerifier,
  proxyPublicKeys,
  type Identity,
  type IdentityVerifier,
} from './identity.js';
import { MemoryRoleStore, type Role, type RoleStore } from './roles.js';
import {
  ApprovalService,
  FirestoreApprovalStore,
  FirestoreAuditLog,
  MemoryApprovalStore,
  RenewableAuditLog,
} from './approvals.js';
import { hasBadge, registerApprovalRoutes } from './approvalRoutes.js';
import { seedDemoRequests, seedDemoSession } from './demoData.js';
import {
  assertDemoTarget,
  DemoAuditLog,
  DemoRefused,
  DemoWeeklyPlan,
  localDate,
  resetDemoHousehold,
  seedDemoHousehold,
  type DemoTarget,
} from './demo.js';
import { loadContent } from './content.js';
import { FirestoreStartedStore, TrainingService, utcDate } from './training.js';
import { registerTrainingRoutes } from './trainingRoutes.js';
import { registerDossierRoutes } from './dossierRoutes.js';
import { InAppNotifier } from './notifier.js';
import { FirestoreProgressStore, MemoryProgressStore, ProgressService, type ProgressStore } from './progress.js';
import { registerProgressRoutes } from './progressRoutes.js';
import { registerWeekRoutes } from './weekRoutes.js';
import { FirestorePainStore, MemoryPainStore, PainService, type PainStore } from './pain.js';
import { registerPainRoutes } from './painRoutes.js';
import { WeeklyPlan } from './weeklyPlan.js';
import { FirestoreScheduleStore, MemoryScheduleStore, ScheduleService, type ScheduleStore } from './schedule.js';
import { registerScheduleRoutes } from './scheduleRoutes.js';
import { FirestoreHistoryStore, HistoryService, MemoryHistoryStore, type HistoryStore } from './history.js';
import { registerHistoryRoutes } from './historyRoutes.js';
import type { FsDb } from './firestoreDb.js';
import {
  FirestoreGenerationStore,
  GENERATION_HEADER,
  MemoryGenerationStore,
  requestGeneration,
  type GenerationStore,
} from './generation.js';
import { HouseholdReset, ResetPainGate, registerHouseholdRoutes } from './householdReset.js';
import { FirestoreEquipmentStore, MemoryEquipmentStore, registerEquipmentRoutes } from './equipment.js';

declare module 'fastify' {
  interface FastifyRequest {
    identity?: Identity;
  }
  interface FastifyInstance {
    /** The household's data, as one thing to delete (story 113, story 118). */
    household: Household;
  }
}

/** A store that holds some of the household's data and can delete all of it. */
export interface HouseholdPart {
  deleteAll(): Promise<void>;
}

/**
 * Everything the household keeps in the app's own stores: approvals and their audit log,
 * progress, pain reports, the started marker, the training days and the session history.
 * Deleting the household deletes every one of them (story 118). Roles stay in config.
 * Starting fresh (story 121) deletes the training data and keeps the `kept` parts: the
 * parent's training days.
 */
export class Household {
  constructor(
    private readonly parts: readonly HouseholdPart[],
    private readonly kept: readonly HouseholdPart[] = [],
  ) {}

  async deleteAll(): Promise<void> {
    for (const p of this.parts) await p.deleteAll();
  }

  /** Start fresh: every part but the kept ones (story 121). */
  async deleteTraining(): Promise<void> {
    for (const p of this.parts) if (!this.kept.includes(p)) await p.deleteAll();
  }
}

const isPart = (v: unknown): v is HouseholdPart =>
  !!v && typeof (v as { deleteAll?: unknown }).deleteAll === 'function';

export interface AppDeps {
  config: Config;
  verifier?: IdentityVerifier;
  roles?: RoleStore;
  /** Parent approval; in memory with the in-app notifier unless given. */
  approvals?: ApprovalService;
  /** Today's session and the card library; built from `content/` unless given. */
  training?: TrainingService;
  /** XP and streaks; in memory, on the training plan, unless given. */
  progress?: ProgressService;
  /** Pain reports and the training pause; in memory, on the approvals audit log, unless given. */
  pain?: PainService;
  /**
   * The parent's training days, on the weekly plan, unless given. The store follows
   * `config.scheduleStore`: Firestore in production, in memory otherwise.
   */
  schedule?: ScheduleService;
  /** The store for the training days when no `schedule` is given (tests pass a fake). */
  scheduleStore?: ScheduleStore;
  /**
   * The session history (story 113). Its store follows `config.scheduleStore`, the household's
   * data store: Firestore in production, in memory otherwise.
   */
  history?: HistoryService;
  /** The store for the session history when no `history` is given (tests pass a fake). */
  historyStore?: HistoryStore;
  /**
   * The household's Firestore database when `config.scheduleStore` is `firestore` (story 118):
   * approvals, the audit log, progress, pain pauses and the started marker live there, beside
   * the training days and the history. Made from the runtime's credentials unless given (tests
   * pass a fake). With `memory`, every store is in memory, as tests and the demo use.
   */
  firestore?: FsDb;
  /**
   * The household's reset generation (story 121); follows the household's data store unless
   * given: Firestore in production, in memory otherwise.
   */
  generation?: GenerationStore;
  logger?: boolean;
  /** Send log lines here (tests read them); implies the logger at every level. */
  logStream?: { write(line: string): void };
}

export interface MeResponse {
  role: Role | null;
}

/** Cookie the dev mock reads to choose who is signed in; `none` acts as an expired session. */
export const DEV_AS_COOKIE = 'dev_as';

function cookie(header: string | undefined, name: string): string | undefined {
  for (const part of (header ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

/**
 * The household's database: Firestore when configured (production), else none and every store
 * in memory. One client for every store; the library loads only when used.
 */
async function householdDb(config: Config, given: FsDb | undefined): Promise<FsDb | undefined> {
  if (config.scheduleStore !== 'firestore') return undefined;
  if (given) return given;
  const { Firestore } = await import('@google-cloud/firestore');
  // Application default credentials; the project comes from the runtime, the database from config.
  return new Firestore(config.firestoreDatabase ? { databaseId: config.firestoreDatabase } : {});
}

export async function buildApp({
  config,
  verifier,
  roles,
  approvals,
  training,
  progress,
  pain,
  schedule,
  scheduleStore,
  history,
  historyStore,
  firestore,
  generation,
  logger = false,
  logStream,
}: AppDeps): Promise<FastifyInstance> {
  if (config.devMockIdentity && config.production) {
    throw new ConfigError(`${DEV_MOCK_FLAG} is refused in production.`);
  }
  if (config.demoSeed && (config.production || !config.devMockIdentity)) {
    throw new ConfigError(`${DEMO_SEED_FLAG} needs ${DEV_MOCK_FLAG}=1 and is refused in production.`);
  }

  // Never log the identity header or cookies. Request bodies are never logged, so a pain
  // report's content never reaches the log (tested in pain.test.ts).
  const redact = ['req.headers["x-goog-iap-jwt-assertion"]', 'req.headers.cookie'];
  const app = Fastify({
    logger: logStream ? { level: 'trace', stream: logStream, redact } : logger && { redact },
  });

  let signer: TestSigner | undefined;
  if (!verifier) {
    if (config.devMockIdentity) {
      signer = new TestSigner();
      verifier = new ProxyJwtVerifier(DEV_AUDIENCE, signer.keys);
    } else {
      verifier = new ProxyJwtVerifier(config.audience, proxyPublicKeys());
    }
  }
  // Roles stay seeded from config (GOALIE_ROLES), also with Firestore: see server/README.md.
  const ownRoles = roles ? undefined : MemoryRoleStore.fromSeed(config.roleSeed);
  const roleStore: RoleStore = roles ?? ownRoles!;
  const verify = verifier;
  const db = await householdDb(config, firestore);
  // Story 121: read once at startup (the server runs as one instance), then kept current here.
  const generationStore = generation ?? (db ? new FirestoreGenerationStore(db) : new MemoryGenerationStore());
  let currentGeneration = await generationStore.read();
  const setGeneration = (n: number) => {
    currentGeneration = n;
  };
  // The app's own stores, kept by name so the dev-only demo reset can reach the in-memory ones.
  // With Firestore (production), the household's approvals and audit log live there (story 118).
  const own = approvals
    ? undefined
    : {
        store: db ? new FirestoreApprovalStore(db) : new MemoryApprovalStore(),
        // The memory log can start again (a demo reset, a fresh start); each log is append-only.
        audit: db ? new FirestoreAuditLog(db) : config.devMockIdentity ? new DemoAuditLog() : new RenewableAuditLog(),
        notifier: new InAppNotifier(),
      };
  const approvalService = approvals ?? new ApprovalService(own!);
  // The get-stronger pack, three themed sessions a week (src/weeklyPlan.ts), in local
  // development and the demo too (story 116). The dev mock's copy lets the demo seed start the
  // themes on today (src/demo.ts); unseeded, it keeps the real Monday-first order.
  const startedStore = !training && db ? new FirestoreStartedStore(db) : undefined;
  const equipment = training?.equipment ?? (db ? new FirestoreEquipmentStore(db) : new MemoryEquipmentStore());
  const ownPlan = training ? undefined : config.devMockIdentity ? new DemoWeeklyPlan() : new WeeklyPlan();
  const trainingService =
    training ??
    new TrainingService({
      approvals: approvalService,
      content: loadContent(config.contentRoot || undefined),
      plan: ownPlan!,
      // Story 118: a session started before a restart is still started after it.
      started: startedStore,
      equipment,
    });
  if (!training) await trainingService.loadStarted();
  // The app's own in-memory store for the training days, kept by name for the demo seed.
  const ownScheduleStore =
    !schedule && !scheduleStore && config.scheduleStore !== 'firestore' ? new MemoryScheduleStore() : undefined;
  const usedScheduleStore: ScheduleStore | undefined =
    schedule || !(trainingService.plan instanceof WeeklyPlan)
      ? undefined
      : (scheduleStore ?? ownScheduleStore ?? (db ? new FirestoreScheduleStore(db) : new MemoryScheduleStore()));
  // The parent sets the training days in the app, when the plan is the weekly pack.
  const scheduleService =
    schedule ??
    (trainingService.plan instanceof WeeklyPlan && usedScheduleStore
      ? new ScheduleService({
          store: usedScheduleStore,
          plan: trainingService.plan,
          audit: approvalService.audit,
          content: () => trainingService.library,
        })
      : undefined);
  await scheduleService?.load();
  if (own && !config.demoSeed) {
    // The app asks the parent for the whole pack: each session and every card it uses. Local
    // development gives the parent's inbox something to show and approves the pack as the demo
    // parent, so the player has something to run on each training day.
    if (config.devMockIdentity) {
      await seedDemoRequests(approvalService);
      await seedDemoSession(trainingService, utcDate(new Date()));
    } else {
      await trainingService.proposeFor(utcDate(new Date()));
      // Story 115: each exercise dossier waits for the parent, as the cards do.
      await trainingService.dossiers.propose();
    }
  }

  if (signer) {
    const devSigner = signer;
    app.log.warn('Mock identity is ON: test-signed headers stand in for the sign-in proxy.');
    // Stand in for the proxy: add a test-signed header unless one was sent.
    app.addHook('onRequest', async (req) => {
      if (!req.url.startsWith('/api/') || req.headers[IDENTITY_HEADER]) return;
      const account = cookie(req.headers.cookie, DEV_AS_COOKIE) ?? config.devMockAccount;
      if (account && account !== 'none') {
        req.headers[IDENTITY_HEADER] = devSigner.sign({ account });
      }
    });
    // Switch the mock account: /api/dev/as?account=sam@example.com, or account=none.
    app.get<{ Querystring: { account?: string } }>('/api/dev/as', async (req, reply) => {
      const account = (req.query.account ?? '').trim() || config.devMockAccount;
      reply.header('set-cookie', `${DEV_AS_COOKIE}=${encodeURIComponent(account)}; Path=/; SameSite=Strict`);
      return { ok: true };
    });
  }

  app.decorateRequest('identity', undefined);

  // Story 121: every API response names the household's generation, so a device learns of a
  // reset at its next sync, whatever it asked for.
  app.addHook('onSend', async (req, reply, payload) => {
    if (req.url.startsWith('/api/')) reply.header(GENERATION_HEADER, String(currentGeneration));
    return payload;
  });

  // Every /api route except the dev switch needs a verified identity.
  app.addHook('preHandler', async (req, reply) => {
    if (!req.url.startsWith('/api/') || req.url.startsWith('/api/dev/')) return;
    const token = req.headers[IDENTITY_HEADER];
    if (typeof token !== 'string' || !token) {
      return reply.code(401).header('cache-control', 'no-store').send({ error: 'unauthenticated' });
    }
    try {
      req.identity = await verify.verify(token);
    } catch {
      req.log.info('identity header rejected');
      return reply.code(401).header('cache-control', 'no-store').send({ error: 'unauthenticated' });
    }
    // Story 121: a write made before a reset (queued on a device that has not seen it yet) is
    // refused, never replayed into the new history. A device that sends no generation has
    // never seen a reset: it counts as generation 0.
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const sent = requestGeneration(req.headers[GENERATION_HEADER]);
      if (sent !== currentGeneration) {
        req.log.info({ reason: 'stale-generation' }, 'write refused');
        return reply.code(409).header('cache-control', 'no-store').send({ error: 'stale_generation' });
      }
    }
  });

  app.get('/api/me', async (req, reply): Promise<MeResponse> => {
    reply.header('cache-control', 'no-store');
    const role = await roleStore.roleFor(req.identity!.account);
    return { role };
  });

  registerApprovalRoutes(app, {
    service: approvalService,
    roles: roleStore,
    badge: hasBadge(approvalService.notifier) ? approvalService.notifier : undefined,
    started: async (request) => trainingService.hasStarted(request),
  });

  const ownPain: PainStore | undefined = pain ? undefined : db ? new FirestorePainStore(db) : new MemoryPainStore();
  const painService =
    pain ?? new PainService({ store: ownPain!, audit: approvalService.audit, notifier: approvalService.notifier });
  if (db && own) {
    // The in-app inbox and badge are in memory: after a restart they count again what the
    // household's stores hold, so a waiting request or an open pause is never silent.
    for (const r of await approvalService.pending()) {
      await approvalService.notifier.notify({ to: 'parent', ref: r.id, title: r.content.title });
    }
    await painService.renotify();
  }
  const resetPainGate = new ResetPainGate();
  registerPainRoutes(app, { pain: painService, roles: roleStore, gate: resetPainGate, currentGeneration: () => currentGeneration });

  registerTrainingRoutes(app, { training: trainingService, roles: roleStore, isPaused: () => painService.isPaused() });
  registerEquipmentRoutes(app, equipment, roleStore);
  registerDossierRoutes(app, { dossiers: trainingService.dossiers, approvals: approvalService, roles: roleStore });
  if (scheduleService) registerScheduleRoutes(app, { schedule: scheduleService, roles: roleStore });

  const ownProgress: ProgressStore | undefined = progress
    ? undefined
    : db
      ? new FirestoreProgressStore(db)
      : new MemoryProgressStore();
  const progressService =
    progress ??
    new ProgressService({
      store: ownProgress!,
      plan: trainingService.plan,
      plannedSets: (version) => trainingService.plannedSets(version),
      pauses: painService,
    });
  registerProgressRoutes(app, { progress: progressService, roles: roleStore });
  registerWeekRoutes(app, {
    progress: progressService,
    plan: trainingService.plan,
    roles: roleStore,
    content: () => trainingService.library,
  });

  const historyService =
    history ??
    new HistoryService({
      store: historyStore ?? (db ? new FirestoreHistoryStore(db) : new MemoryHistoryStore()),
      training: trainingService,
    });
  registerHistoryRoutes(app, { history: historyService, roles: roleStore, gate: resetPainGate, isPaused: () => painService.isPaused(), currentGeneration: () => currentGeneration });

  // Every store the app made or was given that can delete its part of the household.
  const parts: HouseholdPart[] = [];
  for (const p of [own?.store, own?.audit, ownPain, ownProgress, startedStore, usedScheduleStore, historyService.store, equipment]) {
    if (isPart(p)) parts.push(p);
  }
  // Starting fresh keeps the parent's training days (story 121).
  const kept: HouseholdPart[] = [equipment];
  if (isPart(usedScheduleStore)) kept.push(usedScheduleStore);
  const household = new Household(parts, kept);
  app.decorate('household', household);

  const notifier = approvalService.notifier as { clear?: unknown };
  registerHouseholdRoutes(app, {
    roles: roleStore,
    reset: new HouseholdReset({
      data: household,
      gate: resetPainGate,
      generation: generationStore,
      onGeneration: setGeneration,
      approvals: approvalService,
      training: trainingService,
      inbox: typeof notifier.clear === 'function' ? { clear: () => (notifier.clear as () => void).call(notifier) } : undefined,
    }),
  });

  // The demo household (src/demo.ts): only on the app's own in-memory stores, with the mock on.
  const demo: DemoTarget | undefined =
    config.devMockIdentity &&
    own &&
    own.store instanceof MemoryApprovalStore &&
    own.audit instanceof DemoAuditLog &&
    ownRoles &&
    ownPlan instanceof DemoWeeklyPlan &&
    scheduleService &&
    ownScheduleStore &&
    ownPain instanceof MemoryPainStore &&
    ownProgress instanceof MemoryProgressStore
      ? {
          production: config.production,
          devMockIdentity: config.devMockIdentity,
          roles: ownRoles,
          approvalStore: own.store,
          audit: own.audit,
          notifier: own.notifier,
          approvals: approvalService,
          training: trainingService,
          plan: ownPlan,
          schedule: scheduleService,
          scheduleStore: ownScheduleStore,
          progressStore: ownProgress,
          progress: progressService,
          pain: ownPain,
        }
      : undefined;
  if (config.demoSeed) {
    if (!demo) throw new ConfigError(`${DEMO_SEED_FLAG} needs the app's own in-memory stores.`);
    await seedDemoHousehold(demo, localDate());
  }
  if (demo) {
    const target = demo;
    // Dev only: restore the seeded demo household (npm run demo:reset --workspace server).
    app.post('/api/dev/demo/reset', async (req, reply) => {
      reply.header('cache-control', 'no-store');
      try {
        const today = localDate();
        // Refused before anything is deleted when the data is not the demo household's.
        await assertDemoTarget(target);
        // Story 121: devices drop what they held of the old demo at their next sync.
        setGeneration(await generationStore.bump());
        // The household's session history goes with it (story 113), and every other store
        // that can delete its part (story 118), before the seed writes the demo again.
        await household.deleteAll();
        await resetDemoHousehold(target, today);
        req.log.info('demo household reset');
        return { ok: true, date: today };
      } catch (e) {
        if (e instanceof DemoRefused) return reply.code(409).send({ error: 'refused', reason: e.message });
        throw e;
      }
    });
  }

  const webRoot = config.webRoot ? resolve(config.webRoot) : '';
  if (webRoot && existsSync(join(webRoot, 'index.html'))) {
    await app.register(fastifyStatic, {
      root: webRoot,
      wildcard: false,
      setHeaders(reply, path) {
        // Hashed assets may be cached for good; the shell, manifest and worker never.
        const hashed = /[\\/]assets[\\/]/.test(path);
        reply.header('cache-control', hashed ? 'public, max-age=31536000, immutable' : 'no-cache');
      },
    });
    app.setNotFoundHandler((req, reply) => {
      if (req.method === 'GET' && !req.url.startsWith('/api/')) {
        reply.header('cache-control', 'no-cache');
        return reply.sendFile('index.html');
      }
      return reply.code(404).send({ error: 'not found' });
    });
  }

  return app;
}
