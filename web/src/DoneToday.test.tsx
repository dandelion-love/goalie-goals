// #52: once today's session is recorded, Keeper home says "Done for today" and offers no
// training, even after a reload; a pause still wins; the next day opens as usual.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { App } from './App';
import { MemoryPauseStore } from './pain';
import { keeperServer, todayWith } from './session.fixture';
import type { WakeLockController } from './wakeLock';

const wake: WakeLockController = {
  status: 'off',
  acquire: async () => 'off',
  release: async () => {},
  subscribe: () => () => {},
};

const JAN_5 = () => new Date(2026, 0, 5, 17, 0);
const JAN_6 = () => new Date(2026, 0, 6, 17, 0);

function renderKeeper(dayKind: (date: string) => string | null, now = JAN_5, paused = false) {
  const lastApproved = todayWith().today;
  const server = keeperServer(todayWith({ paused, lastApproved }), dayKind);
  render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={new MemoryPauseStore()} now={now} />);
  return server;
}

afterEach(cleanup);

describe('Done for today (#52)', () => {
  it('AC1: a session recorded today shows Done for today and offers no training', async () => {
    renderKeeper(() => 'together');
    expect(await screen.findByText('Done for today')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start session' })).toBeNull();
    expect(screen.queryByRole('button', { name: /last approved version/i })).toBeNull();
  });

  it('AC1: a solo session counts as done too', async () => {
    renderKeeper(() => 'solo');
    expect(await screen.findByText('Done for today')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start session' })).toBeNull();
  });

  it('AC2: a session stopped for safety counts as done for today', async () => {
    renderKeeper(() => 'safety_stop');
    expect(await screen.findByText('Done for today')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start session' })).toBeNull();
  });

  it('AC3: when training is paused, the home shows the pause and not Done for today', async () => {
    renderKeeper(() => 'together', JAN_5, true);
    expect(await screen.findByText(/Training is paused/)).toBeTruthy();
    // Give the summary time to arrive; the pause must still win.
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText('Done for today')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Start session' })).toBeNull();
  });

  it('AC4: the next day, the next approved session is offered as usual', async () => {
    const dayKind = (date: string) => (date === '2026-01-05' ? 'together' : null);
    const first = renderKeeper(dayKind, JAN_5);
    expect(await screen.findByText('Done for today')).toBeTruthy();
    expect(first.urls).toContain('/api/progress/summary?date=2026-01-05');
    cleanup();

    const next = renderKeeper(dayKind, JAN_6);
    expect(await screen.findByRole('button', { name: 'Start session' })).toBeTruthy();
    expect(next.urls).toContain('/api/progress/summary?date=2026-01-06');
    expect(screen.queryByText('Done for today')).toBeNull();
  });

  it('a planned day with nothing recorded yet still offers the session', async () => {
    renderKeeper(() => null);
    expect(await screen.findByRole('button', { name: 'Start session' })).toBeTruthy();
  });
});
