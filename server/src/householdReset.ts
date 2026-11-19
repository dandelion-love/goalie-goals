// Start fresh (story 121): the parent resets the household's training data. Approvals and
// requests, the audit history, day results (XP and streaks), the session history, pain reports
// and pauses (typed notes included) and the started marker are deleted. Roles (config) and the
// parent's training days stay. The generation goes up first, so every device drops what it
// holds from before at its next sync, and the server refuses its old queued events. The reset
// is the first event of the new history, then the app asks the parent for the plan again, as
// on first start.

import type { FastifyInstance } from 'fastify';
import type { ApprovalService } from './approvals.js';
import type { GenerationStore } from './generation.js';
import type { RoleStore } from './roles.js';
import { DATE_RE, utcDate, type TrainingService } from './training.js';

/** The word the parent types to confirm. */
export const RESET_WORD = 'RESET';

/** The audit event's item: the household itself. */
export const RESET_ITEM = 'household';

/** What deletes the household's training data, keeping the training days. */
export interface TrainingData {
  deleteTraining(): Promise<void>;
}

/** Prevent pain reports and deletion from overlapping within this app instance. */
export class ResetPainGate {
  private resetting = false;
  private writes = 0;
  beginWrite(): boolean {
    if (this.resetting) return false;
    this.writes += 1;
    return true;
  }
  endWrite(): void { this.writes -= 1; }
  beginReset(): boolean {
    if (this.resetting || this.writes) return false;
    this.resetting = true;
    return true;
  }
  endReset(): void { this.resetting = false; }
}

export interface HouseholdResetDeps {
  data: TrainingData;
  gate: ResetPainGate;
  generation: GenerationStore;
  /** Called with the new generation once it is stored. */
  onGeneration: (generation: number) => void;
  approvals: ApprovalService;
  training: TrainingService;
  /** What stays in memory beside the stores: the in-app inbox and badge. */
  inbox?: { clear(): void };
  clock?: () => Date;
}

export class HouseholdReset {
  constructor(private readonly deps: HouseholdResetDeps) {}

  /** Reset as the parent; the route has checked the role and the typed word. */
  async reset(actor: { account: string }, date: string): Promise<number> {
    const { data, gate, generation, onGeneration, approvals, training, inbox, clock = () => new Date() } = this.deps;
    if (!gate.beginReset()) throw new Error("reset busy");
    try {
      // The generation first: if a delete fails part way, devices still drop their stale copies
      // and their old events are refused, and the parent can start fresh again.
      const next = await generation.bump();
      onGeneration(next);
      await data.deleteTraining();
      training.clearStarted();
      inbox?.clear();
      // The first event of the new history: the role and the date, never the account in a client.
      await approvals.audit.append({
        at: clock(),
        action: 'reset',
        actorRole: 'parent',
        actor: actor.account,
        requestId: RESET_ITEM,
        kind: 'household',
        itemId: RESET_ITEM,
        itemVersion: '',
        title: "the household's data",
        reason: null,
      });
      // As on first start: the whole pack, then each exercise dossier, wait for the parent.
      await training.proposeFor(date);
      await training.dossiers.propose();
      return next;
    } finally {
      gate.endReset();
    }
  }
}

export function registerHouseholdRoutes(
  app: FastifyInstance,
  { reset, roles }: { reset: HouseholdReset; roles: RoleStore },
): void {
  app.post<{ Body: { confirm?: unknown; date?: unknown } | undefined }>('/api/household/reset', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    const role = await roles.roleFor(req.identity!.account);
    if (role !== 'parent') {
      // Role and reason only: never the account, never the body.
      req.log.info({ role: role ?? 'none', reason: 'not-parent' }, 'household reset refused');
      return reply.code(403).send({ error: 'forbidden' });
    }
    const b = req.body ?? {};
    if (b.confirm !== RESET_WORD) {
      req.log.info({ role, reason: 'not-confirmed' }, 'household reset refused');
      return reply.code(400).send({ error: 'confirm' });
    }
    const date = typeof b.date === 'string' && DATE_RE.test(b.date) ? b.date : utcDate(new Date());
    try {
      const generation = await reset.reset({ account: req.identity!.account }, date);
      req.log.info({ role }, 'household reset');
      return { ok: true, generation };
    } catch {
      // Answer without detail; the parent can try again.
      return reply.code(500).send({ error: 'failed' });
    }
  });
}
