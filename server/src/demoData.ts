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
      detail: 'About 10 minutes each, never on consecutive days, using only approved cards.',
    },
  },
  {
    kind: 'exercise',
    itemId: 'squat-to-box',
    content: {
      title: 'Squat to box',
      detail: 'Bodyweight only, 2 sets of 10, 60 s rest (see content/exercises/squat-to-box.spec.md).',
    },
  },
  {
    kind: 'exercise',
    itemId: 'lateral-shuffle',
    content: {
      title: 'Lateral shuffle',
      detail: '2 sets of 3 efforts over 4 m (see content/exercises/lateral-shuffle.spec.md).',
    },
  },
  {
    kind: 'harder_version',
    itemId: 'pogo-hops',
    content: {
      title: 'Low pogo hops, a step harder',
      detail:
        'Small hops forward and back over a line, same 3 sets of 6 contacts, after every rep ' +
        'is clean in two sessions in a row (see content/exercises/pogo-hops.spec.md).',
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
 * parent, so the keeper's player has an approved session to run.
 */
export async function seedDemoSession(training: TrainingService, date: string): Promise<void> {
  await training.proposeFor(date);
  for (const r of await training.approvals.pending()) {
    if (r.itemId.startsWith('card-') || r.itemId.startsWith('session-')) {
      await training.approvals.approve(r.id, DEMO_PARENT);
    }
  }
}
