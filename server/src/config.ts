// Runtime configuration, read from the environment only. No identifier has a default here:
// the proxy audience, the role seed and the deployment's names live outside the repo.

export interface Config {
  /** Expected `aud` of the proxy's signed header. Required unless the dev mock is on. */
  audience: string;
  /** Local development only: sign test identity headers with a key made at startup. */
  devMockIdentity: boolean;
  /** Account the dev mock signs in as when no `dev_as` cookie is set. */
  devMockAccount: string;
  /** Role seed for the in-memory store: `account=role` pairs separated by `,` or `;`. */
  roleSeed: string;
  /** Which role store to use. Only `memory` is wired in the walking skeleton. */
  roleStore: 'memory';
  port: number;
  /** Folder holding the built web app; empty means the API only. */
  webRoot: string;
  production: boolean;
}

export class ConfigError extends Error {}

export const DEV_MOCK_FLAG = 'GOALIE_DEV_MOCK_IDENTITY';

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const production = env.NODE_ENV === 'production';
  const devMockIdentity = env[DEV_MOCK_FLAG] === '1';
  if (devMockIdentity && production) {
    throw new ConfigError(
      `${DEV_MOCK_FLAG} is set while NODE_ENV=production: the mock identity is for local development only.`,
    );
  }
  const audience = (env.IAP_AUDIENCE ?? '').trim();
  if (!audience && !devMockIdentity) {
    throw new ConfigError('IAP_AUDIENCE is not set: refusing to start without an audience to verify against.');
  }
  const roleStore = (env.ROLE_STORE ?? 'memory').trim();
  if (roleStore !== 'memory') {
    throw new ConfigError(`ROLE_STORE=${roleStore} is not wired yet; use memory.`);
  }
  const port = Number(env.PORT ?? 8080);
  if (!Number.isInteger(port) || port <= 0) {
    throw new ConfigError('PORT must be a positive integer.');
  }
  return {
    audience,
    devMockIdentity,
    devMockAccount: (env.GOALIE_DEV_AS ?? 'kai@example.com').trim(),
    roleSeed: env.GOALIE_ROLES ?? '',
    roleStore,
    port,
    webRoot: env.WEB_ROOT ?? '',
    production,
  };
}
