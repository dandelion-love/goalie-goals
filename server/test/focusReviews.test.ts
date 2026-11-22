import { expect, it } from 'vitest';
import { ApprovalService, MemoryApprovalStore, MemoryAuditLog } from '../src/approvals.js';
import { loadContent } from '../src/content.js';
import { FocusReviews } from '../src/focusReviews.js';
import { InAppNotifier } from '../src/notifier.js';

it('keeps sourced focus unavailable until separate exact owner and parent decisions', async () => {
  const approvals = new ApprovalService({ store: new MemoryApprovalStore(), audit: new MemoryAuditLog(), notifier: new InAppNotifier() });
  const owner = new Set<string>();
  const reviews = new FocusReviews(approvals, () => owner);
  const candidate = reviews.candidate(loadContent().dossiers!.get('squat-to-box')!, 'Squat to box')!;
  expect(await reviews.propose(candidate)).toBeNull();
  owner.add(candidate.itemVersion);
  const request = (await reviews.propose(candidate))!;
  expect(reviews.preview(candidate, request)).toEqual(candidate.preview);
  expect(await reviews.approved(candidate)).toBeNull();
  await expect(approvals.approve(request.id, { account: 'keeper@example.com', role: 'keeper' })).rejects.toThrow();
  await approvals.approve(request.id, { account: 'parent@example.com', role: 'parent' });
  expect(await reviews.approved(candidate)).toEqual(candidate.preview);
  owner.clear();
  expect(await reviews.approved(candidate)).toBeNull();
});
