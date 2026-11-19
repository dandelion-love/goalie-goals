import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from './App';
import { MemoryPauseStore } from './pain';
import { keeperServer, todayWith } from './session.fixture';

afterEach(cleanup);

describe('a glove-required session', () => {
  it('does not start from a saved offer when the server cannot confirm equipment', async () => {
    const today = todayWith();
    today.today = { ...today.today!, requiresGloves: true };
    const server = keeperServer(today);
    const fetchImpl: typeof fetch = (input, init) => String(input).includes('/api/training/started')
      ? Promise.resolve(new Response(null, { status: 409 }))
      : server.fetchImpl(input, init);
    render(<App fetchImpl={fetchImpl} pauseStore={new MemoryPauseStore()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start session' }));
    expect(await screen.findByText(/check that goalkeeper gloves are available/)).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Session player' })).toBeNull();
  });
});
