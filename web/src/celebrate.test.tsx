// Story #98: the confetti shapes are precomputed and built once (AC1), and a finish that comes
// before they are ready skips the burst rather than waiting for it (AC2). canvas-confetti is
// held back by a gate, so the first test finishes a session while it is still loading.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import tokensCss from './tokens.css?raw';
import { SessionPlayer } from './SessionPlayer';
import { loadRewards } from './motion';
import { PILL_MATRIX, PILL_PATH, celebrate, celebrationReady, preloadCelebration } from './celebrate';
import { PLANK, demoSession } from './session.fixture';
import type { WakeLockController } from './wakeLock';

const confetti = vi.hoisted(() => {
  let open: () => void = () => {};
  const gate = new Promise<void>((resolve) => (open = resolve));
  const fire = Object.assign(vi.fn(async () => undefined), { reset: vi.fn() });
  const lib = Object.assign(vi.fn(), {
    create: vi.fn(() => fire),
    shapeFromPath: vi.fn(({ path, matrix }: { path: string; matrix?: number[] }) => ({ type: 'path', path, matrix })),
  });
  return { fire, lib, gate, open: () => open() };
});
vi.mock('canvas-confetti', async () => {
  await confetti.gate;
  return { default: confetti.lib };
});
vi.mock('./rewards', () => ({
  RewardElement: ({ as, kind, ...props }: { as: string; kind: string }) => createElement(as, { 'data-reward': kind, ...props }),
}));

const wake: WakeLockController = {
  status: 'off',
  acquire: async () => 'active',
  release: async () => {},
  subscribe: () => () => {},
};

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

/** The plank's two held sets, straight to the finish. */
function finishSession(onExit: () => void = () => {}) {
  render(
    <SessionPlayer
      session={demoSession({ warmUp: [], cards: [PLANK], coolDown: [] })}
      layout="medium"
      wakeLock={wake}
      progress={null}
      onExit={onExit}
    />,
  );
  click('Start set 1');
  click('End set');
  click('Skip');
  click('Skip rest');
  click('End set');
  click('Skip');
  expect(screen.getByRole('heading', { name: 'Session done' })).toBeTruthy();
}

beforeAll(async () => {
  const style = document.createElement('style');
  style.textContent = tokensCss;
  document.head.append(style);
  await loadRewards();
});

afterEach(() => {
  cleanup();
  document.querySelectorAll('canvas.confetti').forEach((c) => c.remove());
});

describe('the confetti shapes (story #98)', () => {
  it('AC2: skips the burst when the shapes are not ready at the finish, and the finish works as normal', async () => {
    const onExit = vi.fn();
    finishSession(onExit);
    expect(celebrationReady()).toBe(false);
    // The burst's own task comes and goes while canvas-confetti is still loading.
    await new Promise((r) => setTimeout(r, 20));
    expect(document.querySelector('canvas.confetti')).toBeNull();
    expect(confetti.fire).not.toHaveBeenCalled();

    // The finish card and "Done for today" work at once.
    expect(screen.getByRole('heading', { name: 'Session done' }).closest('section')!.getAttribute('data-reward')).toBe('card');
    click('Done for today');
    expect(onExit).toHaveBeenCalledOnce();

    // No waiting: when the chunk arrives later, the skipped burst never fires late.
    confetti.open();
    await preloadCelebration();
    expect(celebrationReady()).toBe(true);
    // Built once, in its own task after the chunk's, from the precomputed matrix.
    expect(confetti.lib.shapeFromPath).toHaveBeenCalledOnce();
    expect(confetti.lib.shapeFromPath).toHaveBeenCalledWith({ path: PILL_PATH, matrix: PILL_MATRIX });
    await new Promise((r) => setTimeout(r, 20));
    expect(confetti.fire).not.toHaveBeenCalled();
    expect(document.querySelector('canvas.confetti')).toBeNull();
  });

  it('AC1: builds the shapes once, from the precomputed matrix, and reuses them at every finish', async () => {
    await preloadCelebration();
    finishSession();
    // The burst runs in a task of its own, just after the finish screen's.
    expect(confetti.fire).not.toHaveBeenCalled();
    await waitFor(() => expect(confetti.fire).toHaveBeenCalledOnce());
    cleanup();
    finishSession();
    await waitFor(() => expect(confetti.fire).toHaveBeenCalledTimes(2));
    // Built in the test before (mock calls are cleared between tests): never again at a finish.
    expect(confetti.lib.shapeFromPath).not.toHaveBeenCalled();
    const shapes = confetti.fire.mock.calls.map((c) => (c[0 as never] as { shapes: unknown }).shapes);
    expect(shapes[0]).toBe(shapes[1]);
    expect(shapes[0]).toEqual(['circle', { type: 'path', path: PILL_PATH, matrix: PILL_MATRIX }]);
    expect(celebrate()).toBe(true);
    expect(confetti.lib.shapeFromPath).not.toHaveBeenCalled();
  });

  it('AC1: the precomputed matrix is the one canvas-confetti would sample from the pill', () => {
    // The pill: a 6 by 6 box from x 3 to 9 with a half circle of radius 3 at each end. Points on
    // its edge are outside, as `isPointInPath` reports them.
    const inside = (x: number, y: number) =>
      y > 0 && y < 6 && ((x > 3 && x < 9) || Math.hypot(x - 3, y - 3) < 3 || Math.hypot(x - 9, y - 3) < 3);
    expect(PILL_PATH).toBe('M3 0h6a3 3 0 0 1 0 6H3a3 3 0 0 1 0-6z');
    // canvas-confetti's own sampling (shapeFromPath with no matrix): every second point up to 1000.
    let [minX, minY, maxX, maxY] = [1000, 1000, 0, 0];
    for (let x = 0; x < 1000; x += 2) {
      for (let y = 0; y < 1000; y += 2) {
        if (!inside(x, y)) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    const width = maxX - minX;
    const height = maxY - minY;
    const scale = Math.min(10 / width, 10 / height);
    expect([scale, 0, 0, scale, -Math.round(width / 2 + minX) * scale, -Math.round(height / 2 + minY) * scale]).toEqual(PILL_MATRIX);
  });
});
