import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EquipmentSummary, groupedBenefits } from './EquipmentSummary';
import type { EquipmentExercise } from './EquipmentCatalog';
import type { Dossier } from './dossier';

const dossier = (id: string): Dossier => ({ cardId: id, itemVersion: `v-${id}`, name: id, headline: 'Practice', why: [{ label: 'Throws', text: 'Shared gain with practice.', evidence: 'youth', detail: 'Under supervision.', groupId: 'reviewed-gain', sources: [1] }], expect: [], limits: [{ label: 'Limitation', text: 'The study used a different task.', evidence: 'youth', sources: [1] }], sources: [{ n: 1, title: `Source ${id}`, url: `https://example.org/${id}` }] });
const example = (id: string): EquipmentExercise => ({ id, name: `Exercise ${id}`, why: 'Practice', setup: ['Clear space'], cautions: [`Caution ${id}`], needs: { all: ['glove', 'ball'], any: [['wall', 'partner']] }, dossier: dossier(id) });
afterEach(cleanup);

describe('equipment evidence summary', () => {
  it('groups only reviewed matching identities, retains qualifications and links each source and exercise', () => {
    const a = example('a');
    const b = example('b');
    const missing = { ...example('missing'), dossier: null };
    const open = vi.fn();
    render(<EquipmentSummary item="glove" exercises={[a, b, a, missing]} open={open} />);
    expect(screen.getAllByText('Shared gain with practice.', { exact: false })).toHaveLength(1);
    expect(screen.getByText('Throws:')).toBeTruthy();
    expect(screen.getAllByText(/Evidence: youth/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Under supervision/)).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Source a' })[0].getAttribute('href')).toBe('https://example.org/a');
    expect(screen.getAllByRole('link', { name: 'Source b' })[0].getAttribute('href')).toBe('https://example.org/b');
    fireEvent.click(screen.getByRole('button', { name: 'Exercise a' }));
    expect(open).toHaveBeenCalledWith('a', '0:a');
    expect(screen.getByText(/Evidence for Exercise missing is unavailable/)).toBeTruthy();
    const requirements = screen.getByRole('region', { name: 'Exercise b requirements' });
    expect(within(requirements).getByText(/Also required: Ball/)).toBeTruthy();
    expect(within(requirements).getByText(/One of: Wall or Partner/)).toBeTruthy();
    expect(within(requirements).getByText('Caution b')).toBeTruthy();
    expect(within(requirements).getByText(/The study used a different task/)).toBeTruthy();
  });
  it('does not merge wording alone or mismatched qualifications', () => {
    const a = example('a');
    const b = example('b');
    b.dossier!.why[0].detail = 'Different condition.';
    expect(groupedBenefits([a, b])).toHaveLength(2);
    b.dossier!.why[0] = { ...a.dossier!.why[0], groupId: undefined };
    a.dossier!.why[0].groupId = undefined;
    b.dossier!.sources[0].url = a.dossier!.sources[0].url;
    expect(groupedBenefits([a, b])).toHaveLength(2);
  });
  it('groups the real shared glove guidance only when the full evidence and source match', () => {
    const real = (id: string): EquipmentExercise => {
      const file = JSON.parse(readFileSync(resolve(process.cwd(), '../content/exercises', `${id}.dossier.json`), 'utf8'));
      const claim = file.expect.keep_up;
      const refs = claim.sources.map((sourceId: string, i: number) => ({ n: i + 1, ...file.sources.find((s: { id: string }) => s.id === sourceId) }));
      return { ...example(id), dossier: { ...dossier(id), why: [], expect: [{ label: 'Keep it up', text: claim.text, evidence: claim.evidence, detail: claim.detail, sources: refs.map((s: { n: number }) => s.n) }], sources: refs } };
    };
    const a = real('head-height-catch');
    const b = real('wall-chest-pass');
    const grouped = groupedBenefits([a, b]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].contributors.map((c) => c.exercise.id)).toEqual(['head-height-catch', 'wall-chest-pass']);
    expect(grouped[0].contributors[0].sources[0].url).toBe('https://pubmed.ncbi.nlm.nih.gov/26084524/');
    b.dossier!.sources[0].url = 'https://example.org/different';
    expect(groupedBenefits([a, b])).toHaveLength(2);
  });
  it('explains an alternative and empty or unsourced evidence without claiming availability', () => {
    const a = example('a');
    a.needs = { all: ['ball'], any: [['glove', 'partner']] };
    a.dossier!.why[0].sources = [];
    const { rerender } = render(<EquipmentSummary item="glove" exercises={[a]} open={() => {}} />);
    expect(screen.getByText('No sourced exercise benefits are available.')).toBeTruthy();
    expect(screen.getByText(/One declared option: Glove/)).toBeTruthy();
    expect(screen.getByText(/another option may be used if available/)).toBeTruthy();
    rerender(<EquipmentSummary item="glove" exercises={[]} open={() => {}} />);
    expect(screen.getByText(/No linked exercises are known/)).toBeTruthy();
  });
});
