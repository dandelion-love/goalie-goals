import { afterEach } from 'vitest';

// The app keeps a little on the device (the pause, the role, today's approved session): start
// every test with none of it.
afterEach(() => {
  try {
    localStorage.clear();
  } catch {
    // No storage in this environment.
  }
});
