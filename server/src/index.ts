import { buildApp } from './app.js';
import { ConfigError, loadConfig } from './config.js';

async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (e) {
    if (e instanceof ConfigError) {
      console.error(`goalie-goals server: ${e.message}`);
      process.exit(1);
    }
    throw e;
  }
  const app = await buildApp({ config, logger: true });
  await app.listen({ port: config.port, host: '0.0.0.0' });
}

void main();
