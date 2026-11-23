import type { HistoryStore } from './history.js';

export type SquatDoseVersion = { version: string; reps: number };

/** Fail closed until every approved dose has two consecutive parent-confirmed sessions. */
export async function hasCompletedSquatSeries(history: HistoryStore, steps: readonly SquatDoseVersion[], approved: (version: string) => Promise<boolean>, transition: (from: string, to: string, afterSequence: number, beforeSequence: number) => Promise<boolean>, strengthCard?: (id: string, version: string) => boolean | null): Promise<boolean> {
  return hasCompletedSquatPrefix(history, steps, 3, approved, transition, strengthCard);
}

/** The current source dose needs its own clean pair and all earlier guarded decisions. */
export async function hasCompletedSquatPrefix(history: HistoryStore, steps: readonly SquatDoseVersion[], targetStage: number, approved: (version: string) => Promise<boolean>, transition: (from: string, to: string, afterSequence: number, beforeSequence: number) => Promise<boolean>, strengthCard: (id: string, version: string) => boolean | null = (id) => id === 'squat-to-box' ? true : null): Promise<boolean> {
  if (steps.length !== 4 || steps.map((step) => step.reps).join(',') !== '10,12,14,15' || new Set(steps.map((step) => step.version)).size !== steps.length) return false;
  if (!Number.isInteger(targetStage) || targetStage < 0 || targetStage >= steps.length) return false;
  if (!(await Promise.all(steps.slice(0, targetStage + 1).map((step) => approved(step.version)))).every(Boolean)) return false;
  const snapshot = await history.readinessSnapshot();
  if (!snapshot) return false;
  const ordered = snapshot.instances.filter((instance) => instance.sequence !== undefined).sort((a, b) => a.sequence! - b.sequence!);
  if (new Set(ordered.map((instance) => instance.sequence)).size !== ordered.length) return false;
  const records = new Map(snapshot.records.map((record) => [record.id, record]));
  if (records.size !== snapshot.records.length) return false;
  const first = ordered.find((instance) => instance.cards.some((card) => card.cardId === 'squat-to-box') && instance.recordId && records.has(instance.recordId));
  if (!first?.recordId) return false;
  const firstDay = Date.parse(`${records.get(first.recordId)!.date}T00:00:00Z`);
  if (!Number.isFinite(firstDay)) return false;
  const firstDate = new Date(firstDay - ((new Date(firstDay).getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10);
  const boundary = ordered.find((instance) => instance.sequence! <= first.sequence! && instance.recordId && (records.get(instance.recordId)?.date ?? '') >= firstDate) ?? first;
  const bound = new Set(snapshot.instances.map((instance) => instance.recordId).filter(Boolean));
  if (snapshot.records.some((record) => !bound.has(record.id) && record.date >= firstDate && record.cards.some((card) => strengthCard(card.cardId, card.itemVersion) !== false))) return false;
  if (snapshot.instances.some((instance) => instance.sequence === undefined && instance.cards.some((card) => strengthCard(card.cardId, card.itemVersion) !== false) && (!instance.recordId || !records.has(instance.recordId) || records.get(instance.recordId)!.date >= firstDate))) return false;
  let stage = 0, clean = 0, lastCleanSequence = 0;
  let previousDay: number | null = null;
  const weeks = new Map<number, number>();
  for (const instance of ordered) {
    if (instance.sequence! < boundary.sequence!) continue;
    const kinds = instance.cards.map((card) => strengthCard(card.cardId, card.itemVersion));
    if (kinds.some((kind) => kind === null)) return false;
    if (!kinds.includes(true)) continue;
    if (instance.late !== false || !instance.recordId) return false;
    const record = records.get(instance.recordId!);
    if (!record || !(await history.isBound(record))) return false;
    const day = Date.parse(`${record.date}T00:00:00Z`);
    if (!Number.isFinite(day) || (previousDay !== null && (day - previousDay) / 86400000 < 2)) return false;
    previousDay = day;
    const monday = day - ((new Date(day).getUTCDay() + 6) % 7) * 86400000;
    const inWeek = (weeks.get(monday) ?? 0) + 1;
    if (inWeek > 3) return false;
    weeks.set(monday, inWeek);
    const cards = record.cards.filter((card) => card.cardId === 'squat-to-box');
    if (!cards.length) continue;
    if (cards.length !== 1) return false;
    const card = cards[0], stepIndex = steps.findIndex((step) => step.version === card.itemVersion);
    if (stepIndex > targetStage) return false;
    if (stepIndex < 0 || stepIndex > stage + 1) return false;
    if (stepIndex < stage) return false; // A lower-dose session may signal a step-down.
    if (stepIndex === stage + 1) {
      if (clean < 2 || !await transition(steps[stage].version, steps[stage + 1].version, lastCleanSequence, instance.sequence!)) return false;
      stage++; clean = 0;
    }
    const step = steps[stage];
    if (record.outcome !== 'done' || card.setsPlanned !== 2 || card.setsDone !== 2) { clean = 0; continue; }
    if (card.dose.kind !== 'reps' || card.dose.reps !== step.reps || !card.squatSets || card.squatSets.length !== 2 || card.squatSets.some((set) => !set || !Number.isInteger(set.revision) || set.revision! < 1)) { clean = 0; continue; }
    if (card.squatSets.some((set) => !set!.clean || set!.actualReps !== step.reps)) { clean = 0; continue; }
    clean = Math.min(2, clean + 1);
    lastCleanSequence = instance.sequence!;
  }
  return stage === targetStage && clean === 2;
}
