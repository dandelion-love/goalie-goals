import { useId } from 'react';
import paths from '../../content/anatomy/body-muscles-1.0.0.json';

/** Keys describe documented exercise focus, never the keeper's body or progress. */
const groups: Record<string, { label: string; prefixes: string[] }> = {
  chest: { label: 'Chest', prefixes: ['chest-upper-', 'chest-lower-'] },
  'front-shoulders': { label: 'Front of shoulders', prefixes: ['shoulder-front-'] },
  triceps: { label: 'Back of arms', prefixes: ['triceps-long-', 'triceps-lateral-'] },
  serratus: { label: 'Side of ribs', prefixes: ['serratus-anterior-'] },
  abs: { label: 'Abs', prefixes: ['abs-upper-', 'abs-lower-'] },
  obliques: { label: 'Side of trunk', prefixes: ['obliques-'] },
  'lower-back': { label: 'Lower back', prefixes: ['lower-back-erectors-', 'lower-back-ql-'] },
  'hip-flexors': { label: 'Front of hips', prefixes: ['hip-flexor-'] },
  glutes: { label: 'Glutes', prefixes: ['gluteus-maximus-'] },
  'side-glutes': { label: 'Side of hips', prefixes: ['gluteus-medius-'] },
  quads: { label: 'Front of thighs', prefixes: ['quads-'] },
  adductors: { label: 'Inner thighs', prefixes: ['adductors-'] },
  hamstrings: { label: 'Back of thighs', prefixes: ['hamstrings-medial-', 'hamstrings-lateral-'] },
  calves: { label: 'Calves', prefixes: ['calves-gastroc-medial-', 'calves-gastroc-lateral-', 'calves-soleus-'] },
  shins: { label: 'Front of shins', prefixes: ['tibialis-anterior-'] },
};
export type MuscleFocus = { primary: string[]; secondary: string[]; note?: string };
export function MuscleMap({ focus }: { focus: MuscleFocus | null }) {
  const pattern = `muscle-hatch-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  if (!focus) return <p>Training focus is not available for this card.</p>;
  const unknown = [...focus.primary, ...focus.secondary].filter((key) => !groups[key]);
  const labels = (keys: string[]) => keys.map((key) => groups[key]?.label ?? key).join(', ') || 'None recorded';
  const includes = (keys: string[], id: string) => keys.some((key) => groups[key]?.prefixes.some((prefix) => id.startsWith(prefix)));
  return <section aria-label="Training focus"><div className="muscle-map-views">{(['front', 'back'] as const).map((side) => <figure key={side}><figcaption>{side === 'front' ? 'Front' : 'Back'}</figcaption><svg viewBox={side === 'front' ? '0 0 35 93' : '37 0 35 93'} role="img" aria-label={`${side} training focus; see text key`}><defs><pattern id={`${pattern}-${side}`} width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2" height="2" fill="var(--action-tint)" /><path d="M0 0V2" stroke="var(--action)" strokeWidth="0.6" /></pattern></defs>{paths[side].map((p) => <path key={p.id} d={p.path} fill={includes(focus.primary, p.id) ? 'var(--action)' : includes(focus.secondary, p.id) ? `url(#${pattern}-${side})` : 'var(--action-tint)'} stroke="var(--line)" strokeWidth="0.18" />)}</svg></figure>)}</div><p><strong>Primary:</strong> {labels(focus.primary)}.</p><p><strong>Secondary:</strong> {labels(focus.secondary)}.</p>{unknown.length > 0 && <p>Some documented regions cannot be mapped.</p>}{focus.note && <p>{focus.note}</p>}<p>This shows documented training focus, not measured strength or changes to the body.</p></section>;
}
