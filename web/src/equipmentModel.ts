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

/** A card fact from declared requirements; it does not assert availability. */
export function cardRequirements(exercise: EquipmentExercise): string {
  if (!exercise.needs) return 'Requirements not recorded';
  const all = exercise.needs.all.filter((id) => id !== 'body only').map(equipmentName);
  const alternatives = exercise.needs.any.map((group) => group.map(equipmentName).join(' or '));
  return [...all, ...alternatives].length ? [...all, ...alternatives].join('; ') : 'No equipment listed';
}

/** Additional declared requirements, preserving alternatives and exercise context. */
export function equipmentAlsoNeeds(id: string, exercises: EquipmentExercise[]): string {
  const linked = exercises.filter((exercise) => relationship(exercise, id));
  if (!linked.length) return 'Requirements not recorded';
  const lines = linked.map((exercise) => {
    const needs = exercise.needs!;
    const required = needs.all.filter((item) => item !== id && item !== 'body only').map(equipmentName);
    const alternatives = needs.any.filter((group) => !group.includes(id)).map((group) => group.map(equipmentName).join(' or '));
    return { name: exercise.name, items: [...required, ...alternatives] };
  });
  const common = lines[0].items.filter((item) => lines.every((line) => line.items.includes(item)));
  const specific = lines.flatMap((line) => line.items.filter((item) => !common.includes(item)).map((item) => `${item} (${line.name})`));
  return [...common, ...specific].join('; ') || 'No other equipment listed';
}

export function equipmentEnables(id: string, exercises: EquipmentExercise[]): string {
  const linked = exercises.filter((exercise) => relationship(exercise, id));
  if (!linked.length) return 'No linked exercises recorded';
  return linked.length <= 2 ? linked.map((exercise) => exercise.name).join('; ') : 'See linked exercises';
}
