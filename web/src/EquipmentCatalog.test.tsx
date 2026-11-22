import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EquipmentCatalog, equipmentIds, relationship, type EquipmentExercise } from './EquipmentCatalog';
import { RoleShell, useDestination } from './RoleShell';
import { equipmentAlsoNeeds, equipmentEnables } from './equipmentModel';

const exercise: EquipmentExercise = { id: 'pass', name: 'Wall pass', why: 'Practise passing', setup: ['Find a wall'], cautions: ['Stop if sore'], needs: { all: ['other:goalkeeper-gloves', 'ball'], any: [['wall', 'partner']] }, dossier: null };
const destinations = [{ id: 'equipment', label: 'Equipment' }, { id: 'plan', label: 'Plan' }] as const;
const fetchImpl = vi.fn(async (url: string | URL | Request) => new Response(JSON.stringify(String(url).endsWith('/exercises') ? { exercises: [exercise] } : { gloves: 'unknown' }), { status: 200 })) as unknown as typeof fetch;
function Example({ fetcher = fetchImpl }: { fetcher?: typeof fetch }) {
  const { current, navigate, navigation, content } = useDestination(destinations, 'equipment');
  return <RoleShell title="Parent home" destinations={destinations} current={current} navigate={navigate} navigation={navigation} content={content}>{current === 'equipment' && <EquipmentCatalog fetchImpl={fetcher} />}</RoleShell>;
}
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });

describe('equipment catalog', () => {
  it('uses only declared identifiers, preserving required and alternative relationships', () => {
    expect(equipmentIds([exercise])).toEqual(['ball', 'other:goalkeeper-gloves', 'partner', 'wall']);
    expect(relationship(exercise, 'ball')).toBe('required');
    expect(relationship(exercise, 'wall')).toBe('alternative');
    expect(relationship(exercise, 'cones')).toBeNull();
    expect(equipmentIds([])).toEqual(['other:goalkeeper-gloves']);
    expect(equipmentAlsoNeeds('other:goalkeeper-gloves', [exercise])).toBe('Ball; Wall or Partner');
    expect(equipmentAlsoNeeds('wall', [exercise])).toBe('Goalkeeper gloves; Ball');
    expect(equipmentAlsoNeeds('ball', [exercise, { ...exercise, id: 'second' }])).toBe('Goalkeeper gloves; Wall or Partner');
    const shorter = { ...exercise, id: 'second', name: 'Catch', needs: { all: ['other:goalkeeper-gloves', 'ball'], any: [] } };
    expect(equipmentAlsoNeeds('other:goalkeeper-gloves', [exercise, shorter])).toBe('Ball; Wall or Partner (Wall pass)');
    expect(equipmentEnables('other:goalkeeper-gloves', [exercise, shorter])).toBe('Wall pass; Catch');
    expect(equipmentAlsoNeeds('cones', [exercise])).toBe('Requirements not recorded');
  });
  it('navigates both ways and restores focus on Back within the destination', async () => {
    window.history.replaceState(null, '', '/?view=equipment');
    render(<Example />);
    fireEvent.click(await screen.findByRole('button', { name: /Equipment: Goalkeeper gloves/ }));
    const back = screen.getByRole('button', { name: 'Back to equipment' });
    const linkedExercise = screen.getByRole('button', { name: /Wall pass/ });
    const hero = screen.getByText('Exercise evidence and requirements');
    expect(back.compareDocumentPosition(linkedExercise) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(linkedExercise.compareDocumentPosition(hero) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: /Wall pass/ }));
    expect(screen.getByRole('button', { name: 'Back to item' }).compareDocumentPosition(screen.getByText('Practise passing')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/All required: Goalkeeper gloves, Ball/)).toBeTruthy();
    expect(screen.getByText(/One of: Wall or Partner/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ball (required)' }));
    expect(await screen.findByRole('heading', { name: 'Ball', level: 3 })).toBeTruthy();
    window.history.back();
    const ballLink = await screen.findByRole('button', { name: 'Ball (required)' });
    await waitFor(() => expect(document.activeElement).toBe(ballLink));
    fireEvent.click(screen.getByRole('button', { name: 'Back to item' }));
    const exerciseLink = await screen.findByRole('button', { name: /Wall pass/ });
    await waitFor(() => expect(document.activeElement).toBe(exerciseLink));
    fireEvent.click(screen.getByRole('button', { name: 'Back to equipment' }));
    const itemLink = await screen.findByRole('button', { name: /Equipment: Goalkeeper gloves/ });
    await waitFor(() => expect(document.activeElement).toBe(itemLink));
  });
  it('reports malformed relationships as unavailable', async () => {
    const bad = vi.fn(async () => new Response(JSON.stringify({ exercises: [{ ...exercise, needs: { all: null, any: [] } }] }), { status: 200 })) as unknown as typeof fetch;
    render(<EquipmentCatalog fetchImpl={bad} />);
    expect(await screen.findByText('Could not load equipment relationships.')).toBeTruthy();
  });
  it('shows an empty relationship state for an item without linked exercises', async () => {
    const empty = vi.fn(async (url: string | URL | Request) => new Response(JSON.stringify(String(url).endsWith('/exercises') ? { exercises: [] } : { gloves: 'unknown' }), { status: 200 })) as unknown as typeof fetch;
    render(<EquipmentCatalog fetchImpl={empty} />);
    fireEvent.click(await screen.findByRole('button', { name: /Equipment: Goalkeeper gloves/ }));
    expect(screen.getByText('No known linked exercises.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to equipment' })).toBeTruthy();
  });
  it('returns focus to the summary link that opened an exercise', async () => {
    window.history.replaceState(null, '', '/?view=equipment');
    const withDossier = { ...exercise, dossier: { cardId: 'pass', itemVersion: 'v1', name: 'Wall pass', headline: 'Practice', why: [{ label: 'Why', text: 'A sourced claim.', sources: [1] }], expect: [], sources: [{ n: 1, title: 'Source', url: 'https://example.org/source' }] } };
    const seeded = vi.fn(async (url: string | URL | Request) => new Response(JSON.stringify(String(url).endsWith('/exercises') ? { exercises: [withDossier] } : { gloves: 'unknown' }), { status: 200 })) as unknown as typeof fetch;
    render(<Example fetcher={seeded} />);
    fireEvent.click(await screen.findByRole('button', { name: /Equipment: Goalkeeper gloves/ }));
    const summary = screen.getByRole('region', { name: 'Exercise evidence summary' });
    expect(screen.getByText('Exercise evidence and requirements').compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const link = within(summary).getByRole('button', { name: 'Wall pass' });
    fireEvent.click(link);
    fireEvent.click(screen.getByRole('button', { name: 'Back to item' }));
    await waitFor(() => expect(document.activeElement).toBe(within(screen.getByRole('region', { name: 'Exercise evidence summary' })).getByRole('button', { name: 'Wall pass' })));
  });
  it('offers a return path for a stale exercise link', async () => {
    window.history.replaceState(null, '', '/?view=equipment&equipment=ball&exercise=missing');
    render(<Example />);
    expect(await screen.findByRole('heading', { name: 'Exercise unavailable' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back to item' }));
    expect(await screen.findByRole('heading', { name: 'Ball', level: 3 })).toBeTruthy();
  });
});
