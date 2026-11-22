import type { ApprovalRequest, ApprovalService } from './approvals.js';
import type { DossierSource } from './content.js';
import { focusCandidate, reviewedFocus, validFocusCandidate, type FocusCandidate } from './focusCandidate.js';

/**
 * Isolated review service. Do not wire proposal into the inbox until the parent preview route
 * displays every claim, qualification and source in this exact snapshot before a decision.
 * The owner-version lookup must be server-owned; no client value may supply it.
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
}
