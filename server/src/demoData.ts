// Demo requests for local development with the mock identity. Every request names a real
// exercise card in content/exercises/ and repeats that card's own dose and variants, so the
// demo never proposes anything without an acceptance spec (training-rules Decision).

import type { ApprovalService, ProposeInput } from './approvals.js';
import type { TrainingService } from './training.js';

export const DEMO_REQUESTS: readonly ProposeInput[] = [
  {
    kind: 'plan',
    itemId: 'plan-starter',
    content: {
      title: 'Starter plan: three short sessions a week',
      detail: 'About 10 minutes each, never on consecutive days, using only approved exercises.',
    },
  },
  {
    kind: 'exercise',
    itemId: 'squat-to-box',
    content: {
      title: 'Squat to box',
      detail: 'Bodyweight only, 2 sets of 10, 60 s rest.',
    },
  },
  {
    kind: 'exercise',
    itemId: 'lateral-shuffle',
    content: {
      title: 'Lateral shuffle',
      detail: '2 sets of 3 efforts over 4 m.',
    },
  },
  {
    kind: 'harder_version',
    itemId: 'pogo-hops',
    content: {
      title: 'Low pogo hops, a step harder',
      detail: 'Small hops forward and back over a line. Same 3 sets of 6 contacts. Starts once every rep is clean two sessions running.',
    },
  },
];

export async function seedDemoRequests(service: ApprovalService): Promise<void> {
  for (const input of DEMO_REQUESTS) await service.propose(input);
}

/** The demo parent of the invented cast; used only to approve demo content in local development. */
export const DEMO_PARENT = { account: 'sam@example.com', role: 'parent' as const };

/**
 * Local development only: propose today's session and its cards, then approve them as the demo
 * parent, so the keeper's player has an approved session to run. Each exercise dossier (story
 * 115) is proposed too and left in the parent's inbox: the demo shows the parent approving it
 * before the keeper can read it, as production waits for the owner.
 */
export async function seedDemoSession(training: TrainingService, date: string): Promise<void> {
  await training.proposeFor(date);
  await training.dossiers.propose();
  for (const r of await training.approvals.pending()) {
    if (r.itemId.startsWith('card-') || r.itemId.startsWith('session-')) {
      await training.approvals.approve(r.id, DEMO_PARENT);
    }
  }
}
