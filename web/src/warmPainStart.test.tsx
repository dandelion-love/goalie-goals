import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryPauseStore } from './pain';
import { keeperServer, todayWith } from './session.fixture';
import type { WakeLockController } from './wakeLock';

// Story 106: the keeper's home starts the pain report's warm-up (story 105) only a while after
// Start appears, never in the first second, where a quick Start lands. Its steps then run in
// idle periods only (warmPain.test.tsx).

const asked = vi.hoisted(() => [] as number[]);
vi.mock('./warmPain', () => ({
  warmPainReport: () => {
    asked.push(performance.now());
    return () => {};
  },
  resetPainWarmUp: () => {},
}));

const wake: WakeLockController = {
  status: 'off',
  acquire: async () => 'active',
  release: async () => {},
  subscribe: () => () => {},
};

// The test setup loads the homes before this file's mock: load them again, with it.
let App: typeof import('./App').App;
let WARM_PAIN_AFTER_MS: number;
beforeAll(async () => {
  vi.resetModules();
  const app = await import('./App');
  await app.keeperHome.preload();
  App = app.App;
  ({ WARM_PAIN_AFTER_MS } = await import('./KeeperHome'));
});

afterEach(cleanup);

describe('the pain report warm-up waits for Start to be up a while (story 106)', () => {
  it('is not asked in the first second after Start appears, then once', async () => {
    expect(WARM_PAIN_AFTER_MS).toBeGreaterThanOrEqual(1000);
    render(<App fetchImpl={keeperServer(todayWith()).fetchImpl} wakeLock={wake} pauseStore={new MemoryPauseStore()} />);
    await screen.findByRole('button', { name: 'Start session' });
    const shown = performance.now();
    expect(asked).toEqual([]);
    await vi.waitFor(() => expect(asked).toHaveLength(1), { timeout: WARM_PAIN_AFTER_MS + 2000, interval: 20 });
    expect(asked[0] - shown).toBeGreaterThanOrEqual(1000);
  });
});
