import type { ContentLibrary } from './content.js';
import { focusCandidate } from './focusCandidate.js';

// This exact sourced preview is covered by the recorded library-expansion grant. Parent
// approval remains separate; a changed preview needs its applicable grant and evidence review.
const OWNER_FOCUS_VERSION = 'sha256:903e719b26b4a33ea50da709f80727c5';
export const ownerFocusVersions = (): ReadonlySet<string> => new Set([OWNER_FOCUS_VERSION]);

export function ownerSquatFocus(content: ContentLibrary) {
  const card = content.cards.get('squat-to-box'), dossier = content.dossiers?.get('squat-to-box');
  const candidate = card && dossier ? focusCandidate(dossier, card.card.name) : null;
  return candidate && ownerFocusVersions().has(candidate.itemVersion) ? candidate : null;
}
