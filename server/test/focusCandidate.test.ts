import { expect, it } from 'vitest';
import { loadContent } from '../src/content.js';
import { focusCandidate, reviewedFocus } from '../src/focusCandidate.js';
import type { ApprovalRequest } from '../src/approvals.js';

it('requires distinct exact owner and parent approvals and invalidates changed evidence', () => {
  const source = loadContent().dossiers!.get('squat-to-box')!;
  const candidate = focusCandidate(source, 'Squat to box')!;
  const request: ApprovalRequest = { id: 'focus-request', kind: 'dossier', itemId: candidate.itemId, itemVersion: candidate.itemVersion, content: candidate.content, state: 'approved', createdAt: new Date(), decidedAt: new Date(), decidedBy: 'parent', reason: null };
  expect(reviewedFocus(candidate, new Set(), request)).toBeNull();
  expect(reviewedFocus(candidate, new Set([candidate.itemVersion]), null)).toBeNull();
  expect(reviewedFocus(candidate, new Set([candidate.itemVersion]), { ...request, state: 'pending' })).toBeNull();
  expect(reviewedFocus(candidate, new Set([candidate.itemVersion]), { ...request, itemId: 'dossier-squat-to-box' })).toBeNull();
  expect(reviewedFocus(candidate, new Set([candidate.itemVersion]), request)).toEqual(candidate.preview);
  const changed = structuredClone(source);
  (changed.dossier.muscles as { note: { text: string } }).note.text += ' Changed.';
  const revised = focusCandidate(changed, 'Squat to box')!;
  expect(revised.itemVersion).not.toBe(candidate.itemVersion);
  expect(reviewedFocus(revised, new Set([candidate.itemVersion]), request)).toBeNull();
  const tampered = structuredClone(candidate);
  tampered.preview.note.text += ' Changed.';
  expect(reviewedFocus(tampered, new Set([candidate.itemVersion]), request)).toBeNull();
});
