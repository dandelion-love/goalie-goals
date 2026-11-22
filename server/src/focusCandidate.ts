import { createHash } from 'node:crypto';
import { itemVersion, type ApprovalRequest, type ItemContent } from './approvals.js';
import type { DossierSource } from './content.js';
import { prepareFocusDraft, type FocusDraft } from './muscleEvidence.js';

export type FocusCandidate = { cardId: string; itemId: string; itemVersion: string; content: ItemContent; preview: FocusDraft };

/** Build the exact sourced review material. This neither proposes nor approves anything. */
export function focusCandidate(source: DossierSource, name: string): FocusCandidate | null {
  const preview = prepareFocusDraft(source.dossier);
  if (!preview) return null;
  const cardId = source.dossier.id;
  const digest = createHash('sha256').update(JSON.stringify(preview)).digest('hex');
  const content: ItemContent = { title: `${name}: training focus`, detail: 'Review the documented regions, evidence and limitations before deciding.', binding: `focus-v1 ${cardId} ${source.contentHash} ${digest}` };
  return { cardId, itemId: `focus-${cardId}`, itemVersion: itemVersion(content), content, preview };
}

export function validFocusCandidate(candidate: FocusCandidate): boolean {
  const digest = createHash('sha256').update(JSON.stringify(candidate.preview)).digest('hex');
  return candidate.itemId === `focus-${candidate.cardId}` && candidate.itemVersion === itemVersion(candidate.content) && !!candidate.content.binding?.startsWith(`focus-v1 ${candidate.cardId} `) && candidate.content.binding.endsWith(` ${digest}`);
}

/** A projection is possible only for matching independent approvals of this exact preview. */
export function reviewedFocus(candidate: FocusCandidate, ownerApprovedVersions: ReadonlySet<string>, request: ApprovalRequest | null): FocusDraft | null {
  if (!validFocusCandidate(candidate) || !ownerApprovedVersions.has(candidate.itemVersion) || !request || request.kind !== 'dossier' || request.state !== 'approved' || request.itemId !== candidate.itemId || request.itemVersion !== candidate.itemVersion) return null;
  return candidate.preview;
}
