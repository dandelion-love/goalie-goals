import type { HistoryRecord } from './history.js';

/** Facts must come from server-owned evidence, never from a client assertion. */
type SafetyState = 'clear' | 'held' | 'unknown';
export type ReadinessFacts = { orderedHistoryComplete: boolean; safety: { pain: SafetyState; growth: SafetyState; breakRestart: SafetyState; stepDown: SafetyState }; approvedCardVersions: ReadonlySet<string> };
export type SquatReadiness = 'unknown' | 'held' | 'one-qualifying' | 'ready-for-parent';

/** Evaluate an authoritative oldest-first history. This never approves or promotes a rung. */
export function evaluateSquatReadiness(records: readonly HistoryRecord[], facts: ReadinessFacts): SquatReadiness {
  const safety = [facts.safety.pain, facts.safety.growth, facts.safety.breakRestart, facts.safety.stepDown];
  if (safety.includes('held')) return 'held';
  if (safety.some((state) => state !== 'clear') || !facts.orderedHistoryComplete) return 'unknown';
  let count = 0;
  const seen = new Set<string>();
  const instances = new Set<string>();
  for (const record of records) {
    if (seen.has(record.id)) return 'unknown';
    seen.add(record.id);
    const matches = record.cards.filter((card) => card.cardId === 'squat-to-box');
    if (matches.length > 1) return 'unknown';
    if (!matches.length) continue;
    const card = matches[0];
    // Zero completed sets does not prove the exercise was never started.
    if (card.setsDone === 0) return 'unknown';
    if (!record.instanceId || instances.has(record.instanceId)) return 'unknown';
    instances.add(record.instanceId);
    if (!facts.approvedCardVersions.has(card.itemVersion)) return 'unknown';
    if (record.outcome !== 'done' || card.setsDone !== card.setsPlanned || card.setsPlanned !== 2) { count = 0; continue; }
    if (card.dose.kind !== 'reps' || !Number.isInteger(card.dose.reps)) return 'unknown';
    if (card.dose.reps !== 15) { count = 0; continue; }
    if (!card.squatSets || card.squatSets.length !== card.setsDone || card.squatSets.some((s) => !s)) return 'unknown';
    if (card.squatSets.some((s) => !Number.isInteger(s!.actualReps) || !Number.isInteger(s!.revision) || s!.revision! < 1)) return 'unknown';
    if (card.squatSets.some((s) => !s!.clean || s!.actualReps !== card.dose.reps)) { count = 0; continue; }
    count = Math.min(2, count + 1);
  }
  return count === 2 ? 'ready-for-parent' : count === 1 ? 'one-qualifying' : 'unknown';
}
