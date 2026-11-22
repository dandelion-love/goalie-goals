import type { Dossier } from './dossier';

export type EquipmentExercise = {
  id: string; name: string; why: string; setup: string[]; cautions: string[];
  needs: { all: string[]; any: string[][] } | null; dossier: Dossier | null;
};

/** Use declared requirement identifiers, never text matches or inferred links. */
export function equipmentIds(exercises: EquipmentExercise[]): string[] {
  const ids = new Set(['other:goalkeeper-gloves']);
  for (const e of exercises) {
    for (const id of e.needs?.all ?? []) if (id !== 'body only') ids.add(id);
    for (const group of e.needs?.any ?? []) for (const id of group) if (id !== 'body only') ids.add(id);
  }
  return [...ids].sort();
}

export function relationship(exercise: EquipmentExercise, item: string): 'required' | 'alternative' | null {
  if (exercise.needs?.all.includes(item)) return 'required';
  if (exercise.needs?.any.some((group) => group.includes(item))) return 'alternative';
  return null;
}

export function equipmentName(id: string): string {
  const name = id.replace(/^other:/, '').replace(/[-_]/g, ' ');
  return name ? name[0].toUpperCase() + name.slice(1) : 'Equipment';
}
