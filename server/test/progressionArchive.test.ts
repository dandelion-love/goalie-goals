import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { defaultContentRoot, loadContent } from '../src/content.js';
import { loadProgressionArchive } from '../src/progressionArchive.js';
import { ownerApprovedSquatVersions } from '../src/ownerProgression.js';

it('loads only the exact approved candidate versions without publishing them', () => {
  const root = defaultContentRoot();
  const versions = loadProgressionArchive(root, 'squat');
  expect(ownerApprovedSquatVersions(root)).toEqual(versions);
  expect(versions.map((entry) => entry.itemVersion)).toEqual(['sha256:ebe9725306de0c55f06f059ca1952118', 'sha256:445e7246d4e46e6d070a28e8be435506', 'sha256:681d68b9e6dfd2f334ba5aa7c4f81d2a', 'sha256:836073df2f6a8c3c94e99bf990df658d']);
  expect(versions[3].dossierVersion).toBe('sha256:8365e00c6b872dd5c864c9e672869701');
  expect(loadContent(root).cards.has('squat-to-box-pause')).toBe(false);
  expect(() => loadProgressionArchive(root, '../squat')).toThrow();
});

it('refuses a changed artifact rather than silently loading a different version', () => {
  const temp = mkdtempSync(join(tmpdir(), 'goalie-archive-test-'));
  const root = join(temp, 'content');
  try {
    cpSync(defaultContentRoot(), root, { recursive: true });
    const spec = join(root, 'progression-versions', 'squat', 'squat-to-box-12.spec.md');
    writeFileSync(spec, readFileSync(spec, 'utf8') + '\nChanged.\n');
    expect(() => loadProgressionArchive(root, 'squat')).toThrow('Progression artifact hash mismatch');
    cpSync(join(defaultContentRoot(), 'progression-versions', 'squat', 'squat-to-box-12.spec.md'), spec);
    const manifestPath = join(root, 'progression-versions', 'squat', 'manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { versions: { dose: string }[] };
    // Even a self-consistent replacement manifest has no corresponding owner decision.
    writeFileSync(manifestPath, JSON.stringify(manifest));
    expect(() => loadProgressionArchive(root, 'squat')).not.toThrow();
    expect(() => ownerApprovedSquatVersions(root)).toThrow('no matching owner decision');
    manifest.versions[0].dose = '2 x 15';
    writeFileSync(manifestPath, JSON.stringify(manifest));
    expect(() => loadProgressionArchive(root, 'squat')).toThrow('Progression dose or prerequisite mismatch');
  } finally {
    const rel = relative(resolve(tmpdir()), resolve(temp));
    if (!rel || rel.startsWith('..') || dirname(resolve(temp)) !== resolve(tmpdir())) throw new Error('Unsafe temporary path');
    rmSync(temp, { recursive: true, force: true });
  }
});
