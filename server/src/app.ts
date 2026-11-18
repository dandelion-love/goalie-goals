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
import { ApprovalService, MemoryApprovalStore, MemoryAuditLog } from './approvals.js';
import { hasBadge, registerApprovalRoutes } from './approvalRoutes.js';
import { seedDemoRequests, seedDemoSession } from './demoData.js';
import { DemoAuditLog, DemoPlan, DemoRefused, localDate, resetDemoHousehold, seedDemoHousehold, type DemoTarget } from './demo.js';
import { loadContent } from './content.js';
import { TrainingService, utcDate } from './training.js';
import { registerTrainingRoutes } from './trainingRoutes.js';
import { InAppNotifier } from './notifier.js';
import { MemoryProgressStore, ProgressService } from './progress.js';
import { registerProgressRoutes } from './progressRoutes.js';
import { MemoryPainStore, PainService } from './pain.js';
import { registerPainRoutes } from './painRoutes.js';
import { WeeklyPlan } from './weeklyPlan.js';
import { MemoryScheduleStore, ScheduleService } from './schedule.js';
import { registerScheduleRoutes } from './scheduleRoutes.js';

declare module 'fastify' {
  interface FastifyRequest {
    identity?: Identity;
  }
}

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
  /** The parent's training days; in memory, on the weekly plan, unless given. */
  schedule?: ScheduleService;
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

export async function buildApp({
  config,
  verifier,
  roles,
  approvals,
  training,
  progress,
  pain,
  schedule,
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
  const ownRoles = roles ? undefined : MemoryRoleStore.fromSeed(config.roleSeed);
  const roleStore: RoleStore = roles ?? ownRoles!;
  const verify = verifier;
  // The app's own in-memory stores, kept by name so the dev-only demo reset can reach them.
  const own = approvals
    ? undefined
    : {
        store: new MemoryApprovalStore(),
        // The dev mock's log can start again on a demo reset; each log is append-only.
        audit: config.devMockIdentity ? new DemoAuditLog() : new MemoryAuditLog(),
        notifier: new InAppNotifier(),
      };
  const approvalService = approvals ?? new ApprovalService(own!);
  // Local development keeps the demo's own plan (the starter session, with the demo week's rest
  // day); otherwise the get-stronger pack, three themed sessions a week (src/weeklyPlan.ts).
  const demoPlan = config.devMockIdentity && !training ? new DemoPlan() : undefined;
  const trainingService =
    training ??
    new TrainingService({
      approvals: approvalService,
      content: loadContent(config.contentRoot || undefined),
      plan: demoPlan ?? new WeeklyPlan(),
    });
  // The parent sets the training days in the app, when the plan is the weekly pack.
  const scheduleService =
    schedule ??
    (trainingService.plan instanceof WeeklyPlan
      ? new ScheduleService({
          store: new MemoryScheduleStore(),
          plan: trainingService.plan,
          audit: approvalService.audit,
          content: () => trainingService.library,
        })
      : undefined);
  await scheduleService?.load();
  if (own && !config.demoSeed) {
    // The app asks the parent for the whole pack: each session and every card it uses. Local
    // development gives the
    // parent's inbox something to show and approves the session as the demo parent, so the
    // player has something to run.
    if (config.devMockIdentity) {
      await seedDemoRequests(approvalService);
      await seedDemoSession(trainingService, utcDate(new Date()));
    } else {
      await trainingService.proposeFor(utcDate(new Date()));
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
  });

  const ownPain = pain ? undefined : new MemoryPainStore();
  const painService =
    pain ?? new PainService({ store: ownPain!, audit: approvalService.audit, notifier: approvalService.notifier });
  registerPainRoutes(app, { pain: painService, roles: roleStore });

  registerTrainingRoutes(app, { training: trainingService, roles: roleStore, isPaused: () => painService.isPaused() });
  if (scheduleService) registerScheduleRoutes(app, { schedule: scheduleService, roles: roleStore });

  const ownProgress = progress ? undefined : new MemoryProgressStore();
  const progressService =
    progress ??
    new ProgressService({
      store: ownProgress!,
      plan: trainingService.plan,
      plannedSets: (version) => trainingService.plannedSets(version),
      pauses: painService,
    });
  registerProgressRoutes(app, { progress: progressService, roles: roleStore });

  // The demo household (src/demo.ts): only on the app's own in-memory stores, with the mock on.
  const demo: DemoTarget | undefined =
    config.devMockIdentity && own && own.audit instanceof DemoAuditLog && ownRoles && demoPlan && ownPain && ownProgress
      ? {
          production: config.production,
          devMockIdentity: config.devMockIdentity,
          roles: ownRoles,
          approvalStore: own.store,
          audit: own.audit,
          notifier: own.notifier,
          approvals: approvalService,
          training: trainingService,
          plan: demoPlan,
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
