import { afterEach } from 'vitest';

// The reward moments' lazy chunk (Motion, story #78) is large to transform: load it once here,
// before any test's clock runs, so a screen that fetches it mid-test is not held up.
await import('./rewards');

// The app keeps a little on the device (the pause, the role, today's approved session): start
// every test with none of it.
afterEach(() => {
  try {
    localStorage.clear();
  } catch {
    // No storage in this environment.
  }
});
