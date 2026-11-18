import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { startTransition, useState } from 'react';
import { App } from './App';
import { MemoryPauseStore } from './pain';
import { MemoryOutboxStore, type OutboxEvent } from './outbox';
import { keeperServer, todayWith } from './session.fixture';
import type { WakeLockController } from './wakeLock';

// Story 101 AC4: "Something hurts" and Stop are never deferred or put through a transition. The
// pause is written and the session ends in the tap's own task.
//
// How the tests tell. The tap is a real DOM click, outside act(), so React schedules its work as
// it does in the browser: an urgent update renders in a microtask at the end of the tap's task,
// while a transition or any deferral (a timer, a frame, an idle callback) waits for a later
// task. So: what the tap writes is checked as soon as the click returns, and the screen after
// the microtasks only, before any other task runs. A deferred pause write, or a stop put
// through startTransition, fails these tests (the method is itself checked below).

const wake: WakeLockController = {
  status: 'off',
  acquire: async () => 'active',
  release: async () => {},
  subscribe: () => () => {},
};

/** Run the microtasks queued so far, and nothing else: no timer, frame or other task. */
async function microtasksOnly() {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

/** A real click outside act(), as the browser delivers it. */
async function tapOutsideAct(el: HTMLElement) {
  const env = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const before = env.IS_REACT_ACT_ENVIRONMENT;
  env.IS_REACT_ACT_ENVIRONMENT = false;
  try {
    el.click();
  } finally {
    env.IS_REACT_ACT_ENVIRONMENT = before;
  }
}

const finishes = (store: MemoryOutboxStore) =>
  store.events.filter((e): e is Extract<OutboxEvent, { kind: 'finish' }> => e.kind === 'finish');

async function keeperInPlayer(over: { outbox?: MemoryOutboxStore } = {}) {
  const pauseStore = new MemoryPauseStore();
  const outboxStore = over.outbox ?? new MemoryOutboxStore();
  const server = keeperServer(todayWith());
  render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={pauseStore} outboxStore={outboxStore} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Start session' }));
  await screen.findByRole('region', { name: 'Session player' });
  // The start, sent after the Start tap's paint, has been answered.
  await vi.waitFor(() => expect(outboxStore.read()).toEqual([]));
  return { pauseStore, outboxStore };
}

afterEach(cleanup);

describe('the safety taps run in the tap’s own task (story 101 AC4)', () => {
  it('Something hurts in the player: the pause is written and the session ends before the click returns', async () => {
    const { pauseStore, outboxStore } = await keeperInPlayer();
    expect(pauseStore.value).toBeNull();

    const tap = tapOutsideAct(screen.getByRole('button', { name: 'Something hurts' }));
    // Written in the click handler itself: the pause on the device, and the session's end in
    // the outbox, as the click returns.
    expect(pauseStore.value).not.toBeNull();
    expect(finishes(outboxStore).map((e) => e.outcome)).toEqual(['hurt']);
    await tap;

    // The session has ended on screen after the tap's microtasks, with no other task run.
    await microtasksOnly();
    expect(screen.queryByRole('region', { name: 'Session player' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Good call stopping' })).toBeTruthy();
    expect(screen.getByRole('form', { name: 'Pain report' })).toBeTruthy();
    await act(async () => {});
  });

  it('Stop: the set ends and the stop is kept on the device before the click returns', async () => {
    const { outboxStore } = await keeperInPlayer();

    const tap = tapOutsideAct(screen.getByRole('button', { name: 'Stop' }));
    expect(finishes(outboxStore).map((e) => [e.outcome, e.held])).toEqual([['stopped', true]]);
    await tap;

    await microtasksOnly();
    expect(screen.getByRole('heading', { name: 'Good call' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeTruthy();
    expect(document.querySelector<HTMLElement>('section.player')?.hidden).toBe(true);
    await act(async () => {});
  });

  it('Something hurts on the keeper’s home: the pause is written before the click returns and shows at once', async () => {
    const pauseStore = new MemoryPauseStore();
    render(<App fetchImpl={keeperServer(todayWith()).fetchImpl} wakeLock={wake} pauseStore={pauseStore} />);
    await screen.findByRole('button', { name: 'Start session' });

    const tap = tapOutsideAct(screen.getByRole('button', { name: 'Something hurts' }));
    expect(pauseStore.value).not.toBeNull();
    await tap;

    await microtasksOnly();
    expect(screen.getByRole('heading', { name: 'Training is paused' })).toBeTruthy();
    expect(screen.getByRole('form', { name: 'Pain report' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start session' })).toBeNull();
    await act(async () => {});
  });

  it('the method catches a deferral: a transition has not rendered after the microtasks', async () => {
    function Deferred() {
      const [on, setOn] = useState(false);
      return (
        <button type="button" onClick={() => startTransition(() => setOn(true))}>
          {on ? 'Ended' : 'Running'}
        </button>
      );
    }
    render(<Deferred />);
    await tapOutsideAct(screen.getByRole('button', { name: 'Running' }));
    await microtasksOnly();
    // Had a safety tap been written this way, the tests above would fail here.
    expect(screen.queryByRole('button', { name: 'Ended' })).toBeNull();
    await act(async () => {});
    expect(screen.getByRole('button', { name: 'Ended' })).toBeTruthy();
  });
});

describe('a deferred step that fails later (story 101 AC4)', () => {
  it('shows its error and leaves the finish screen and the pause in place', async () => {
    // An outbox whose send fails after the tap: the device's store breaks once the tap has
    // written the session's end, as a full or blocked storage might.
    class FailingLater extends MemoryOutboxStore {
      broken = false;
      read() {
        if (this.broken) throw new Error('storage failed');
        return super.read();
      }
    }
    const outbox = new FailingLater();
    const { pauseStore } = await keeperInPlayer({ outbox });

    await tapOutsideAct(screen.getByRole('button', { name: 'Something hurts' }));
    outbox.broken = true;
    await microtasksOnly();
    expect(screen.getByRole('heading', { name: 'Good call stopping' })).toBeTruthy();

    // After the paint, the send runs and fails: the finish line says so.
    expect(await screen.findByText("Couldn't reach the app to add up today's XP.")).toBeTruthy();
    // The immediate response stands: the finish screen, the pause and the report form.
    expect(screen.getByRole('heading', { name: 'Good call stopping' })).toBeTruthy();
    expect(screen.getByRole('form', { name: 'Pain report' })).toBeTruthy();
    expect(pauseStore.value).not.toBeNull();
    outbox.broken = false;
  });
});
