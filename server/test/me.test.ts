import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { ConfigError, loadConfig, type Config } from '../src/config.js';
import { TestSigner } from '../src/devIdentity.js';
import { IDENTITY_HEADER, ProxyJwtVerifier } from '../src/identity.js';
import { FirestoreRoleStore, MemoryRoleStore, parseRoleSeed, type DocumentReader } from '../src/roles.js';

// Fixtures: the invented cast only, and a header signed by a key made for this test run.
const AUDIENCE = '/test/audience/goalie-goals';
const SEED = 'kai@example.com=keeper; sam@example.com=parent';

function config(overrides: Partial<Config> = {}): Config {
  return {
    audience: AUDIENCE,
    devMockIdentity: false,
    devMockAccount: 'kai@example.com',
    roleSeed: SEED,
    roleStore: 'memory',
    port: 0,
    webRoot: '',
    production: false,
    ...overrides,
  };
}

const signer = new TestSigner();
let app: FastifyInstance | undefined;

async function testApp(): Promise<FastifyInstance> {
  app = await buildApp({
    config: config(),
    verifier: new ProxyJwtVerifier(AUDIENCE, signer.keys),
  });
  return app;
}

async function me(headers: Record<string, string> = {}) {
  const a = await testApp();
  return a.inject({ method: 'GET', url: '/api/me', headers });
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe('GET /api/me', () => {
  it('returns 401 without the identity header', async () => {
    const res = await me();
    expect(res.statusCode).toBe(401);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('returns 401 for a header that is not a JWT', async () => {
    const res = await me({ [IDENTITY_HEADER]: 'not-a-token' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for a header signed by another key', async () => {
    const other = new TestSigner();
    const res = await me({ [IDENTITY_HEADER]: other.sign({ account: 'kai@example.com', audience: AUDIENCE }) });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for the wrong audience', async () => {
    const res = await me({ [IDENTITY_HEADER]: signer.sign({ account: 'kai@example.com', audience: '/other/app' }) });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for the wrong issuer', async () => {
    const token = signer.sign({ account: 'kai@example.com', audience: AUDIENCE, issuer: 'https://issuer.example.com' });
    const res = await me({ [IDENTITY_HEADER]: token });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for an expired header', async () => {
    const token = signer.sign({ account: 'kai@example.com', audience: AUDIENCE, expiresIn: -3600 });
    const res = await me({ [IDENTITY_HEADER]: token });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for a tampered payload', async () => {
    const [h, , s] = signer.sign({ account: 'kai@example.com', audience: AUDIENCE }).split('.');
    const forged = Buffer.from(JSON.stringify({ email: 'sam@example.com' })).toString('base64url');
    const res = await me({ [IDENTITY_HEADER]: `${h}.${forged}.${s}` });
    expect(res.statusCode).toBe(401);
  });

  it('gives an unknown account role null (not set up)', async () => {
    const res = await me({ [IDENTITY_HEADER]: signer.sign({ account: 'new@example.com', audience: AUDIENCE }) });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ role: null });
  });

  it('maps the keeper', async () => {
    const res = await me({ [IDENTITY_HEADER]: signer.sign({ account: 'kai@example.com', audience: AUDIENCE }) });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ role: 'keeper' });
  });

  it('maps the parent, ignoring case in the account', async () => {
    const res = await me({ [IDENTITY_HEADER]: signer.sign({ account: 'Sam@Example.com', audience: AUDIENCE }) });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ role: 'parent' });
  });
});

describe('dev mock identity', () => {
  it('is refused when NODE_ENV=production', () => {
    expect(() =>
      loadConfig({ NODE_ENV: 'production', GOALIE_DEV_MOCK_IDENTITY: '1', IAP_AUDIENCE: AUDIENCE }),
    ).toThrow(ConfigError);
  });

  it('is refused by buildApp in production even if config was built by hand', async () => {
    await expect(buildApp({ config: config({ devMockIdentity: true, production: true }) })).rejects.toThrow(
      ConfigError,
    );
  });

  it('is off unless the flag is set exactly', () => {
    expect(loadConfig({ IAP_AUDIENCE: AUDIENCE, GOALIE_DEV_MOCK_IDENTITY: 'true' }).devMockIdentity).toBe(false);
  });

  it('signs in as the default account, switches by cookie, and acts expired with none', async () => {
    app = await buildApp({ config: config({ audience: '', devMockIdentity: true }) });
    const kai = await app.inject({ method: 'GET', url: '/api/me' });
    expect(kai.json()).toEqual({ role: 'keeper' });
    const sam = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: 'dev_as=sam%40example.com' } });
    expect(sam.json()).toEqual({ role: 'parent' });
    const none = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: 'dev_as=none' } });
    expect(none.statusCode).toBe(401);
  });

  it('has no dev route when the flag is off', async () => {
    const a = await testApp();
    const res = await a.inject({ method: 'GET', url: '/api/dev/as?account=sam@example.com' });
    expect(res.statusCode).toBe(404);
  });
});

describe('web app serving', () => {
  it('serves the shell for app routes, never for unknown /api routes', async () => {
    const root = mkdtempSync(join(tmpdir(), 'gg-web-'));
    writeFileSync(join(root, 'index.html'), '<!doctype html><title>shell</title>');
    app = await buildApp({
      config: config({ webRoot: root }),
      verifier: new ProxyJwtVerifier(AUDIENCE, signer.keys),
    });
    const home = await app.inject({ method: 'GET', url: '/home' });
    expect(home.statusCode).toBe(200);
    expect(home.body).toContain('shell');
    expect(home.headers['cache-control']).toBe('no-cache');
    const api = await app.inject({
      method: 'GET',
      url: '/api/nope',
      headers: { [IDENTITY_HEADER]: signer.sign({ account: 'kai@example.com', audience: AUDIENCE }) },
    });
    expect(api.statusCode).toBe(404);
  });
});

describe('config', () => {
  it('refuses to start without an audience', () => {
    expect(() => loadConfig({})).toThrow(/IAP_AUDIENCE/);
  });
});

describe('role stores', () => {
  it('rejects a seed entry with an unknown role without echoing the account', () => {
    expect(() => parseRoleSeed('kai@example.com=coach')).toThrow(/entry 1/);
    expect(() => parseRoleSeed('kai@example.com=coach')).not.toThrow(/kai/);
  });

  it('memory store returns null for an unknown account', async () => {
    expect(await MemoryRoleStore.fromSeed(SEED).roleFor('nobody@example.com')).toBeNull();
  });

  it('firestore adapter reads members/{account}.role', async () => {
    const docs: Record<string, { role: unknown }> = {
      'kai@example.com': { role: 'keeper' },
      'odd@example.com': { role: 'admin' },
    };
    const fake: DocumentReader = {
      collection: (path) => ({
        doc: (id) => ({
          get: async () => {
            const d = path === 'members' ? docs[id] : undefined;
            return { exists: Boolean(d), get: (f: string) => (d as Record<string, unknown> | undefined)?.[f] };
          },
        }),
      }),
    };
    const store = new FirestoreRoleStore(fake);
    expect(await store.roleFor('KAI@example.com')).toBe('keeper');
    expect(await store.roleFor('odd@example.com')).toBeNull();
    expect(await store.roleFor('sam@example.com')).toBeNull();
  });
});
