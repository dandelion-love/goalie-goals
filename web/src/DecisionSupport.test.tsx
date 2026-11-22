import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DecisionSupport } from './DecisionSupport';
import type { PendingRequest } from './approvals';

const request: PendingRequest = {
  id: 'demo-request', kind: 'dossier', itemId: 'dossier-demo', itemVersion: 'version-one',
  title: 'Demo exercise', detail: 'A short practice.', state: 'pending',
  createdAt: '2026-01-01T00:00:00Z', expiresAt: '2026-01-08T00:00:00Z',
};
const dossier = {
  cardId: 'demo', itemVersion: 'version-one', name: 'Demo exercise', headline: 'The exercise supports control.',
  why: [], expect: [{ label: 'With practice', text: 'A study found improved control.', sources: [1] }],
  sources: [{ n: 1, title: 'Example study', url: 'https://example.com/study' }],
};
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
afterEach(cleanup);

describe('approval decision support', () => {
  it('shows the exact dossier summary and decision effects before opening its sources', async () => {
    const fetchImpl = vi.fn(async () => json({ itemVersion: request.itemVersion, dossier, cards: null })) as unknown as typeof fetch;
    render(<DecisionSupport request={request} fetchImpl={fetchImpl} />);
    expect((await screen.findAllByText('The exercise supports control.')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('A study found improved control.').length).toBeGreaterThan(0);
    expect(screen.getByText(/does not approve the exercise/)).toBeTruthy();
    expect(screen.getByText(/Declining leaves this version unapproved/)).toBeTruthy();
    expect(screen.getByText(/Leaving it pending does not approve it/)).toBeTruthy();
    fireEvent.click(screen.getByText('Dossier and sources'));
    expect(screen.getByText('Example study')).toBeTruthy();
  });

  it('rejects a different version and offers a retry', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(json({ itemVersion: 'different', dossier, cards: null }))
      .mockResolvedValueOnce(json({ itemVersion: request.itemVersion, dossier, cards: null })) as unknown as typeof fetch;
    render(<DecisionSupport request={request} fetchImpl={fetchImpl} />);
    expect(await screen.findByText(/Evidence could not be verified/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry evidence' }));
    expect((await screen.findAllByText('The exercise supports control.')).length).toBeGreaterThan(0);
  });

  it('makes unavailable evidence explicit for a plan without a matching snapshot', async () => {
    const plan = { ...request, kind: 'plan' as const };
    const fetchImpl = vi.fn(async () => json({ itemVersion: plan.itemVersion, dossier: null, cards: null })) as unknown as typeof fetch;
    render(<DecisionSupport request={plan} fetchImpl={fetchImpl} />);
    expect(await screen.findByText(/Benefits, cautions and prerequisites could not be verified/)).toBeTruthy();
    expect(screen.getByText(/A session also needs its session and exercise versions approved/)).toBeTruthy();
  });

  it('shows linked exercise context and discloses its independently versioned dossier', async () => {
    const plan = { ...request, kind: 'plan' as const };
    const cards = [{ name: 'Demo exercise', itemVersion: 'card-version', why: 'Builds control.',
      cautions: ['Stop if it hurts.'], setup: ['Use a clear floor.'], needs: { all: ['space'], any: [] }, dossier }];
    const fetchImpl = vi.fn(async () => json({ itemVersion: plan.itemVersion, dossier: null, cards })) as unknown as typeof fetch;
    render(<DecisionSupport request={plan} fetchImpl={fetchImpl} />);
    expect(await screen.findByText('Builds control.')).toBeTruthy();
    expect(screen.getByText('Cautions: Stop if it hurts.')).toBeTruthy();
    expect(screen.getByText('Setup: Use a clear floor.')).toBeTruthy();
    expect(screen.getByText('Prerequisites: space.')).toBeTruthy();
    expect(screen.getByText(/cannot verify that it matches/)).toBeTruthy();
    expect(screen.getByText('Dossier and sources')).toBeTruthy();
  });

  it('does not claim a harder version starts automatically', async () => {
    const harder = { ...request, kind: 'harder_version' as const };
    const fetchImpl = vi.fn(async () => json({ itemVersion: harder.itemVersion, dossier: null, cards: null })) as unknown as typeof fetch;
    render(<DecisionSupport request={harder} fetchImpl={fetchImpl} />);
    expect(await screen.findByText(/does not automatically start the harder version/)).toBeTruthy();
    expect(await screen.findByText(/Benefits, cautions and prerequisites could not be verified/)).toBeTruthy();
  });
});
