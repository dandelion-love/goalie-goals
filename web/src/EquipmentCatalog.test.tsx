import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EquipmentCatalog, equipmentIds, relationship, type EquipmentExercise } from './EquipmentCatalog';
import { RoleShell, useDestination } from './RoleShell';

const exercise: EquipmentExercise = { id: 'pass', name: 'Wall pass', why: 'Practise passing', setup: ['Find a wall'], cautions: ['Stop if sore'], needs: { all: ['other:goalkeeper-gloves', 'ball'], any: [['wall', 'partner']] }, dossier: null };
const destinations = [{ id: 'equipment', label: 'Equipment' }, { id: 'plan', label: 'Plan' }] as const;
const fetchImpl = vi.fn(async (url: string | URL | Request) => new Response(JSON.stringify(String(url).endsWith('/exercises') ? { exercises: [exercise] } : { gloves: 'unknown' }), { status: 200 })) as unknown as typeof fetch;
function Example() {
  const { current, navigate, navigation, content } = useDestination(destinations, 'equipment');
  return <RoleShell title="Parent home" destinations={destinations} current={current} navigate={navigate} navigation={navigation} content={content}>{current === 'equipment' && <EquipmentCatalog fetchImpl={fetchImpl} />}</RoleShell>;
}
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });

describe('equipment catalog', () => {
  it('uses only declared identifiers, preserving required and alternative relationships', () => {
    expect(equipmentIds([exercise])).toEqual(['ball', 'other:goalkeeper-gloves', 'partner', 'wall']);
    expect(relationship(exercise, 'ball')).toBe('required');
    expect(relationship(exercise, 'wall')).toBe('alternative');
    expect(relationship(exercise, 'cones')).toBeNull();
    expect(equipmentIds([])).toEqual(['other:goalkeeper-gloves']);
  });
  it('navigates both ways and restores focus on Back within the destination', async () => {
    window.history.replaceState(null, '', '/?view=equipment');
    render(<Example />);
    fireEvent.click(await screen.findByRole('button', { name: 'Goalkeeper gloves' }));
    fireEvent.click(await screen.findByRole('button', { name: /Wall pass/ }));
    expect(screen.getByText(/All required: Goalkeeper gloves, Ball/)).toBeTruthy();
    expect(screen.getByText(/One of: Wall or Partner/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ball (required)' }));
    expect(await screen.findByRole('heading', { name: 'Ball' })).toBeTruthy();
    window.history.back();
    const ballLink = await screen.findByRole('button', { name: 'Ball (required)' });
    await waitFor(() => expect(document.activeElement).toBe(ballLink));
    fireEvent.click(screen.getByRole('button', { name: 'Back to item' }));
    const exerciseLink = await screen.findByRole('button', { name: /Wall pass/ });
    await waitFor(() => expect(document.activeElement).toBe(exerciseLink));
    fireEvent.click(screen.getByRole('button', { name: 'Back to equipment' }));
    const itemLink = await screen.findByRole('button', { name: 'Goalkeeper gloves' });
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
    fireEvent.click(await screen.findByRole('button', { name: 'Goalkeeper gloves' }));
    expect(screen.getByText('No known linked exercises.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to equipment' })).toBeTruthy();
  });
  it('offers a return path for a stale exercise link', async () => {
    window.history.replaceState(null, '', '/?view=equipment&equipment=ball&exercise=missing');
    render(<Example />);
    expect(await screen.findByRole('heading', { name: 'Exercise unavailable' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back to item' }));
    expect(await screen.findByRole('heading', { name: 'Ball' })).toBeTruthy();
  });
});
