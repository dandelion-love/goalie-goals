import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { doseWords, nextStep, rungFor, RUNGS } from './ladders';

// Story 114 AC3: the rung data the keeper's "Your training" reads is checked against its sources,
// the progression-library Decision and the ladder concepts, and covers every card in the repo.

const ROOT = join(__dirname, '..', '..');
const KNOWLEDGE = join(ROOT, 'docs', 'knowledge');
const read = (...p: string[]) => readFileSync(join(...p), 'utf8');

/** The table rows of a markdown file whose first cell is a backticked id or a number. */
function rows(markdown: string): string[][] {
  return markdown
    .split('\n')
    .filter((l) => l.startsWith('| '))
    .map((l) => l.slice(1, -1).split('|').map((c) => c.trim()));
}

const ids = (cell: string) => [...cell.matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]);

/** The Decision's library: id, pattern, rung and prerequisites. */
const decision = rows(read(KNOWLEDGE, 'decisions', 'progression-library.md'))
  .filter((c) => /^`[a-z0-9-]+`$/.test(c[0]))
  .map((c) => ({ id: ids(c[0])[0], ladder: c[1], rung: Number(c[2]), needs: c[3] === 'None' ? [] : ids(c[3]) }));

/** Every ladder concept's rungs: id and the "Unlock at" cell. */
const ladderDir = join(KNOWLEDGE, 'progression-library');
const ladderRows = readdirSync(ladderDir)
  .filter((f) => f.startsWith('ladders-'))
  .flatMap((f) => rows(read(ladderDir, f)))
  .filter((c) => /^\d+$/.test(c[0]))
  .map((c) => ({ id: ids(c[1])[0], unlockAt: c[c.length - 2] }));

const cardIds = readdirSync(join(ROOT, 'content', 'exercises'))
  // A card's dossier (story 115) sits beside it; it is not a card.
  .filter((f) => f.endsWith('.json') && !f.endsWith('.dossier.json'))
  .map((f) => (JSON.parse(read(ROOT, 'content', 'exercises', f)) as { id: string; name: string }));

describe('the rung data matches its sources (story 114 AC3)', () => {
  it('reads the Decision: 56 rungs in 16 ladders', () => {
    expect(decision).toHaveLength(56);
    expect(new Set(decision.map((d) => d.ladder)).size).toBe(16);
    expect(ladderRows).toHaveLength(56);
  });

  it('holds exactly the Decision rungs, with the same ladder, rung and prerequisites', () => {
    expect(RUNGS.map(({ id, ladder, rung, needs }) => ({ id, ladder, rung, needs: [...needs] }))).toEqual(decision);
  });

  it("holds each rung's unlock dose as its ladder concept gives it", () => {
    for (const row of ladderRows) {
      const rung = rungFor(row.id);
      expect(rung, row.id).toBeDefined();
      // The concept may add a note after the dose ("2 x 15, then one band step at a time").
      expect(row.unlockAt.startsWith(rung!.unlockAt), `${row.id}: "${row.unlockAt}"`).toBe(true);
    }
  });

  it('maps every card in the repo to a rung, under the card\'s own name', () => {
    expect(cardIds.length).toBeGreaterThan(0);
    for (const card of cardIds) {
      expect(rungFor(card.id)?.name, card.id).toBe(card.name);
    }
  });

  it('names every rung in a few words', () => {
    for (const rung of RUNGS) {
      expect(rung.name.trim(), rung.id).not.toBe('');
      expect(rung.name.split(/\s+/).length, rung.id).toBeLessThanOrEqual(5);
    }
  });
});

describe("a card's next step (story 114 AC3 and AC5)", () => {
  it('names the next rung and the goal on this card that opens it', () => {
    expect(nextStep('squat-to-box')).toEqual({ kind: 'next', name: 'Paused box squat', goal: '2 sets of 15', alsoNeeds: [] });
    expect(nextStep('split-squat')).toEqual({ kind: 'next', name: 'Step-up', goal: '2 sets of 15 per side', alsoNeeds: [] });
    expect(nextStep('plank')).toEqual({ kind: 'next', name: 'Plank leg lift', goal: '2 sets of 30 s', alsoNeeds: [] });
  });

  it("names another ladder's prerequisite too", () => {
    expect(nextStep('broad-jump-stick')).toEqual({
      kind: 'next',
      name: 'Squat jump and stick',
      goal: '3 sets of 5',
      alsoNeeds: ['Free squat'],
    });
  });

  it('says the top of a ladder, and nothing for a card on no ladder', () => {
    expect(nextStep('line-hops')).toEqual({ kind: 'top' });
    expect(nextStep('push-up')).toEqual({ kind: 'top' });
    expect(nextStep('not-a-card')).toBeUndefined();
  });

  it('gives every card in the repo a next step', () => {
    for (const card of cardIds) expect(nextStep(card.id), card.id).toBeDefined();
  });

  it('writes doses as the app does', () => {
    expect(doseWords('2 x 30 s per side')).toBe('2 sets of 30 s per side');
  });
});
