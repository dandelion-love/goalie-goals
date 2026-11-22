export type Rank = { name: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond'; rung: number };
const names = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'] as const;
/** Only real rungs have ranks; this function never creates or unlocks a rung. */
export function rankForRung(rung: number | undefined): Rank | undefined {
  if (!Number.isInteger(rung) || rung! < 1 || rung! > names.length) return undefined;
  return { name: names[rung! - 1], rung: rung! };
}
