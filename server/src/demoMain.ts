// `npm run demo:seed --workspace server`: start the server on this machine with the demo
// household (src/demo.ts). It turns on the mock identity and the demo seed, so it refuses to
// run with NODE_ENV=production, and the seed refuses any account outside the demo domain.

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.env.NODE_ENV === 'production') {
  console.error('goalie-goals demo: refused with NODE_ENV=production; the demo runs locally only.');
  process.exit(1);
}

process.env.GOALIE_DEV_MOCK_IDENTITY = '1';
process.env.GOALIE_DEMO_SEED = '1';
process.env.GOALIE_DEV_AS ??= 'kai@example.com';

// Serve the built web app from the same port when it exists (npm run build --workspace web).
if (!process.env.WEB_ROOT) {
  const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../../web/dist');
  if (existsSync(resolve(dist, 'index.html'))) process.env.WEB_ROOT = dist;
}

await import('./index.js');
