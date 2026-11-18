import { buildApp } from './app.js';
import { ConfigError, loadConfig } from './config.js';

async function main(): Promise<void> {
  let config;
  let app;
  try {
    config = loadConfig();
    // A refused demo seed is a ConfigError too: the server does not start.
    app = await buildApp({ config, logger: true });
  } catch (e) {
    if (e instanceof ConfigError) {
      console.error(`goalie-goals server: ${e.message}`);
      process.exit(1);
    }
    throw e;
  }
  await app.listen({ port: config.port, host: '0.0.0.0' });
}

void main();
