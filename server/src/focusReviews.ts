import type { ApprovalRequest, ApprovalService } from './approvals.js';
import type { DossierSource } from './content.js';
import type { Role } from './roles.js';
import { focusCandidate, reviewedFocus, validFocusCandidate, type FocusCandidate } from './focusCandidate.js';

/**
 * The owner-version lookup is server-owned; the parent reviews the exact snapshot separately.
 */
export class FocusReviews {
  constructor(private readonly approvals: ApprovalService, private readonly ownerVersions: () => ReadonlySet<string>) {}
  candidate(source: DossierSource, name: string): FocusCandidate | null { return focusCandidate(source, name); }
  async propose(candidate: FocusCandidate): Promise<ApprovalRequest | null> {
    if (!validFocusCandidate(candidate) || !this.ownerVersions().has(candidate.itemVersion)) return null;
    return this.approvals.propose({ kind: 'dossier', itemId: candidate.itemId, content: candidate.content });
  }
  preview(candidate: FocusCandidate, request: ApprovalRequest | null) {
    if (!validFocusCandidate(candidate) || !request || !this.ownerVersions().has(candidate.itemVersion) || request.kind !== 'dossier' || request.itemId !== candidate.itemId || request.itemVersion !== candidate.itemVersion) return null;
    return candidate.preview;
  }
  async approved(candidate: FocusCandidate) {
    const request = await this.approvals.store.approvedVersion(candidate.itemId, candidate.itemVersion);
    return reviewedFocus(candidate, this.ownerVersions(), request);
  }
  async approve(candidate: FocusCandidate, actor: { account: string; role: Role }) {
    if (actor.role !== 'parent' || !validFocusCandidate(candidate) || !this.ownerVersions().has(candidate.itemVersion)) return null;
    const request = await this.propose(candidate);
    if (!request) return null;
    if (request.state === 'approved') return request;
    return this.approvals.approveReviewedFocus(request.id, actor, candidate.itemId, candidate.itemVersion);
  }
}
