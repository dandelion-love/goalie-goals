import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { ApprovalService, MemoryApprovalStore, MemoryAuditLog } from '../src/approvals.js';
import { loadContent, type Dossier } from '../src/content.js';
import { DossierService } from '../src/dossiers.js';
import { InAppNotifier } from '../src/notifier.js';

it('previews unavailable evidence and its cited context before the same version can be shown', async () => {
  const source = JSON.parse(readFileSync(new URL('../../docs/proposals/candidates/squat-to-box-pause.dossier.json', import.meta.url), 'utf8')) as Dossier;
  const library = loadContent();
  const base = library.cards.get('squat-to-box')!;
  const content = { cards: new Map([['squat-to-box-pause', { ...base, card: { ...base.card, id: 'squat-to-box-pause', name: 'Paused box squat' } }]]), dossiers: new Map([['squat-to-box-pause', { dossier: source, contentHash: 'candidate-test-hash' }]]) };
  const approvals = new ApprovalService({ store: new MemoryApprovalStore(), audit: new MemoryAuditLog(), notifier: new InAppNotifier() });
  const dossiers = new DossierService({ approvals, content: () => content });
  await dossiers.propose();
  const request = (await approvals.pending())[0];
  const preview = await dossiers.forRequest(request);
  expect(preview?.whyUnavailable).toContain('No reviewed');
  expect(preview?.expectUnavailable).toContain('No reviewed');
  expect(preview?.context).toHaveLength(3);
  expect(preview?.sources).toHaveLength(2);
  expect((await dossiers.approved()).size).toBe(0);
  await approvals.approve(request.id, { account: 'parent@example.com', role: 'parent' });
  expect((await dossiers.approved()).get('squat-to-box-pause')).toEqual(preview);
});
