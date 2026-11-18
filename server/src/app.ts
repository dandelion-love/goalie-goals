import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { ConfigError, DEV_MOCK_FLAG, type Config } from './config.js';
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
import { loadContent } from './content.js';
import { TrainingService, utcDate } from './training.js';
import { registerTrainingRoutes } from './trainingRoutes.js';
import { InAppNotifier } from './notifier.js';

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
  logger?: boolean;
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

export async function buildApp({ config, verifier, roles, approvals, training, logger = false }: AppDeps): Promise<FastifyInstance> {
  if (config.devMockIdentity && config.production) {
    throw new ConfigError(`${DEV_MOCK_FLAG} is refused in production.`);
  }

  const app = Fastify({
    logger: logger && {
      // Never log the identity header or cookies.
      redact: ['req.headers["x-goog-iap-jwt-assertion"]', 'req.headers.cookie'],
    },
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
  const roleStore = roles ?? MemoryRoleStore.fromSeed(config.roleSeed);
  const verify = verifier;
  let approvalService = approvals;
  const ownApprovals = !approvalService;
  if (!approvalService) {
    approvalService = new ApprovalService({
      store: new MemoryApprovalStore(),
      audit: new MemoryAuditLog(),
      notifier: new InAppNotifier(),
    });
    // Local development: give the parent's inbox something to show.
    if (config.devMockIdentity) await seedDemoRequests(approvalService);
  }
  const trainingService =
    training ?? new TrainingService({ approvals: approvalService, content: loadContent(config.contentRoot || undefined) });
  if (ownApprovals) {
    // The app asks the parent for today's session and its cards. Local development approves
    // them as the demo parent so the player has something to run.
    if (config.devMockIdentity) await seedDemoSession(trainingService, utcDate(new Date()));
    else await trainingService.proposeFor(utcDate(new Date()));
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

  registerTrainingRoutes(app, { training: trainingService, roles: roleStore });

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
