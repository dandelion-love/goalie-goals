import { afterEach } from 'vitest';

// The reward moments' lazy chunk (Motion, story #78) is large to transform: load it once here,
// before any test's clock runs, so a screen that fetches it mid-test is not held up.
await import('./rewards');

// The homes and the player are lazy chunks in the app (story 101 AC2). Loaded here, they draw
// at once in a test, as they do in the app once preloaded. (src/chunks.test.tsx covers the
// suspended path.)
if (typeof window !== 'undefined') {
  const [{ keeperHome, parentHome }, { player }] = await Promise.all([import('./App'), import('./KeeperHome')]);
  await Promise.all([keeperHome.preload(), parentHome.preload(), player.preload()]);
}

// The app keeps a little on the device (the pause, the role, today's approved session): start
// every test with none of it.
afterEach(() => {
  try {
    localStorage.clear();
  } catch {
    // No storage in this environment.
  }
});
