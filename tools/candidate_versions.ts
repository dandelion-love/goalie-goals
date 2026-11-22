// Print the effective app approval versions for the exact, uninstalled review candidates.
// Run from the repository root with `npx tsx tools/candidate_versions.ts`.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ApprovalService, MemoryApprovalStore, MemoryAuditLog } from '../server/src/approvals.js';
import { loadContent, type CardSource, type Dossier, type ExerciseCard } from '../server/src/content.js';
import { DossierService } from '../server/src/dossiers.js';
import { InAppNotifier } from '../server/src/notifier.js';
import { STARTER_SESSION, TrainingService } from '../server/src/training.js';

const approvals = new ApprovalService({ store: new MemoryApprovalStore(), audit: new MemoryAuditLog(), notifier: new InAppNotifier() });
const original = loadContent();
const candidates = 'docs/proposals/candidates/';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
for (const file of ['squat-to-box-12.json', 'squat-to-box-14.json', 'squat-to-box-target.json', 'squat-to-box-pause.json']) {
  const { approved: _static, ...card } = JSON.parse(readFileSync(candidates + file, 'utf8')) as ExerciseCard & { approved?: unknown };
  const figureSvg = card.id === 'squat-to-box' ? original.cards.get('squat-to-box')!.figureSvg : readFileSync(candidates + 'squat-to-box-pause.svg', 'utf8');
  const contentHash = hash(JSON.stringify(card) + '\0' + figureSvg);
  const source: CardSource = { card, figureSvg, credit: 'candidate', contentHash };
  const library = { cards: new Map([[card.id, source]]), dossiers: new Map() };
  const training = new TrainingService({ approvals, content: library });
  const snap = training.currentSession({ ...STARTER_SESSION, cardIds: [card.id] })!;
  process.stdout.write(`${file}: ${snap.cards[0].itemVersion}\n`);
  if (card.id === 'squat-to-box-pause') {
    const { approved: _ignored, ...dossier } = JSON.parse(readFileSync(candidates + 'squat-to-box-pause.dossier.json', 'utf8')) as Dossier & { approved?: unknown };
    const dossierSource = { dossier, contentHash: hash(JSON.stringify(dossier)) };
    const dossiers = new DossierService({ approvals, content: () => ({ cards: library.cards, dossiers: new Map([[card.id, dossierSource]]) }) });
    process.stdout.write(`squat-to-box-pause.dossier.json: ${dossiers.currentForCard(card.id)!.itemVersion}\n`);
  }
}
