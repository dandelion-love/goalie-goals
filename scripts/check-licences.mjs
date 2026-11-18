#!/usr/bin/env node
// List every installed package whose licence is not on the allowed list.
// Usage: node scripts/check-licences.mjs [--production]
//   --production  only the packages the runtime image installs (server dependencies)
// Exit 0 clean, 1 findings. Reads package-lock.json; no network.
import { readFileSync } from 'node:fs';

const ALLOWED = new Set([
  'MIT', 'MIT-0', 'Apache-2.0', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', '0BSD',
  'BlueOak-1.0.0', 'CC0-1.0', 'Unlicense',
]);
// Licences that are fine for build tools that never ship in the image or the web bundle.
const DEV_ONLY_OK = new Set(['CC-BY-4.0', 'MPL-2.0', 'Python-2.0']);
// Font licences, for font packages only (story #76: Nunito through Fontsource, whose package
// carries the font's OFL 1.1; the build ships the licence text next to the font files).
const FONT_OK = new Set(['OFL-1.1']);
const isFontPackage = (path) => /node_modules\/@fontsource(-variable)?\//.test(path);

const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
const productionOnly = process.argv.includes('--production');

function ok(licence, dev) {
  // SPDX expressions: an OR is fine if any branch is allowed; an AND needs all.
  const expr = String(licence ?? '').replace(/[()]/g, '');
  if (!expr) return false;
  const allowed = (id) => ALLOWED.has(id) || (dev && DEV_ONLY_OK.has(id));
  if (/ OR /.test(expr)) return expr.split(/ OR /).some((p) => ok(p.trim(), dev));
  if (/ AND /.test(expr)) return expr.split(/ AND /).every((p) => ok(p.trim(), dev));
  return allowed(expr.trim());
}

const findings = [];
for (const [path, pkg] of Object.entries(lock.packages ?? {})) {
  if (!path.includes('node_modules/') || pkg.link) continue; // workspace links are ours (MIT)
  if (productionOnly && pkg.dev) continue;
  if (isFontPackage(path) && FONT_OK.has(pkg.license)) continue;
  if (!ok(pkg.license, Boolean(pkg.dev))) {
    findings.push(`${path.replace(/^.*node_modules\//, '')}@${pkg.version}: ${pkg.license ?? 'unknown'}${pkg.dev ? ' (dev)' : ''}`);
  }
}

if (findings.length) {
  console.error(`check-licences:\n${findings.join('\n')}`);
  process.exit(1);
}
console.log(`check-licences: ok${productionOnly ? ' (production)' : ''}`);
