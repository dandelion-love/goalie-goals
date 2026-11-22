import type { HistoryStore } from './history.js';

export type SquatDoseVersion = { version: string; reps: number };

/** Fail closed until every approved dose has two consecutive parent-confirmed sessions. */
export async function hasCompletedSquatSeries(history: HistoryStore, steps: readonly SquatDoseVersion[], approved: (version: string) => Promise<boolean>): Promise<boolean> {
  if (steps.length !== 4 || steps.map((step) => step.reps).join(',') !== '10,12,14,15' || new Set(steps.map((step) => step.version)).size !== steps.length) return false;
  if (!(await Promise.all(steps.map((step) => approved(step.version)))).every(Boolean)) return false;
  const snapshot = await history.readinessSnapshot();
  if (!snapshot) return false;
  const ordered = [...snapshot.instances].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  if (ordered.some((instance) => instance.sequence === undefined || instance.late !== false || !instance.recordId) || new Set(ordered.map((instance) => instance.sequence)).size !== ordered.length) return false;
  const records = new Map(snapshot.records.map((record) => [record.id, record]));
  if (records.size !== snapshot.records.length || snapshot.records.length !== ordered.length) return false;
  let stage = 0, clean = 0;
  for (const instance of ordered) {
    const record = records.get(instance.recordId!);
    if (!record || !(await history.isBound(record))) return false;
    const cards = record.cards.filter((card) => card.cardId === 'squat-to-box');
    if (!cards.length) continue;
    if (cards.length !== 1) return false;
    const card = cards[0], stepIndex = steps.findIndex((step) => step.version === card.itemVersion);
    if (stepIndex < 0 || stepIndex > stage + 1) return false;
    if (stepIndex < stage) return false; // A lower-dose session may signal a step-down.
    if (stepIndex === stage + 1) {
      if (clean < 2) return false;
      stage++; clean = 0;
    }
    const step = steps[stage];
    if (record.outcome !== 'done' || card.setsPlanned !== 2 || card.setsDone !== 2 || card.dose.kind !== 'reps' || card.dose.reps !== step.reps || !card.squatSets || card.squatSets.length !== 2 || card.squatSets.some((set) => !set || !Number.isInteger(set.revision) || set.revision! < 1)) return false;
    if (card.squatSets.some((set) => !set!.clean || set!.actualReps !== step.reps)) { clean = 0; continue; }
    clean = Math.min(2, clean + 1);
  }
  return stage === steps.length - 1 && clean === 2;
}
