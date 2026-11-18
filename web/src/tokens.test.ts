// Story #76 AC1: every colour, size and spacing value lives in src/tokens.css. This fails on any
// colour, size or spacing literal outside it, and on a token used but never defined.
import { describe, expect, it } from 'vitest';
import tokensCss from './tokens.css?raw';
import { rootTokens } from './cssCascade';

const TOKEN_FILE = './tokens.css';

// Every stylesheet and every source module under src, as text (tests excluded).
const sources = Object.entries(
  import.meta.glob<string>(['./**/*.{css,ts,tsx}', '!./**/*.test.{ts,tsx}'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
).filter(([path]) => path !== TOKEN_FILE);
const stylesheets = sources.filter(([path]) => path.endsWith('.css'));

const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '');

/** Colour literals: hex, colour functions, and named colours other than the CSS keywords. */
const COLOUR =
  /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(|:\s*(?:white|black|red|green|blue|gray|grey|orange|yellow|purple)\b/i;
/** A number with a length or viewport unit, other than zero. */
const LENGTH = /(?<![\w.-])-?(?:\d*\.)?\d+(?:px|r?em|ex|ch|lh|pt|pc|cm|mm|in|q|vh|vw|vmin|vmax|[sld]v[hw])\b/i;

/** The declarations of every rule in a stylesheet, with the at-rule preludes left out. */
function declarations(css: string): { selector: string; property: string; value: string }[] {
  const out: { selector: string; property: string; value: string }[] = [];
  const text = stripComments(css);
  const rule = /([^{};]*)\{([^{}]*)\}/g;
  for (const m of text.matchAll(rule)) {
    const selector = m[1].trim();
    for (const decl of m[2].split(';')) {
      const colon = decl.indexOf(':');
      if (colon < 0) continue;
      out.push({ selector, property: decl.slice(0, colon).trim(), value: decl.slice(colon + 1).trim() });
    }
  }
  return out;
}

describe('the token file is the one home of colour, size and spacing (story #76, AC1)', () => {
  it('finds the stylesheets it checks', () => {
    expect(stylesheets.map(([path]) => path)).toContain('./styles.css');
  });

  it('has no colour, length or font-weight literal in any stylesheet but tokens.css', () => {
    const found: string[] = [];
    for (const [path, css] of stylesheets) {
      for (const { selector, property, value } of declarations(css)) {
        const literal =
          COLOUR.exec(`: ${value}`)?.[0] ??
          LENGTH.exec(value)?.[0] ??
          (property === 'font-weight' && /^\d+$/.test(value) ? value : undefined) ??
          (property === 'font-size' && !value.startsWith('var(') && value !== 'inherit' ? value : undefined);
        if (literal) found.push(`${path} ${selector} { ${property}: ${value} } (${literal})`);
      }
    }
    expect(found).toEqual([]);
  });

  it('has no colour literal in any source module under src', () => {
    const found = sources
      .filter(([path]) => !path.endsWith('.css'))
      .flatMap(([path, text]) =>
        text
          .split('\n')
          .filter((line) => /#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|\b(?:rgba?|hsla?|oklch)\(/i.test(line))
          .map((line) => `${path}: ${line.trim()}`),
      );
    expect(found).toEqual([]);
  });

  it('catches a literal when one is added (the check itself works)', () => {
    const bad = '.x { color: #ff0000; padding: 7px; font-weight: 600; font-size: 0.9rem; gap: var(--space-2) }';
    const hits = declarations(bad).filter(
      ({ property, value }) =>
        COLOUR.test(`: ${value}`) ||
        LENGTH.test(value) ||
        (property === 'font-weight' && /^\d+$/.test(value)) ||
        (property === 'font-size' && !value.startsWith('var(')),
    );
    expect(hits.map((h) => h.property)).toEqual(['color', 'padding', 'font-weight', 'font-size']);
  });

  it('uses only tokens that tokens.css defines', () => {
    const defined = rootTokens(tokensCss);
    const used = new Set<string>();
    for (const [, css] of stylesheets) for (const m of css.matchAll(/var\((--[\w-]+)/g)) used.add(m[1]);
    // Tokens set in the stylesheets themselves (a scoped override) count as defined.
    for (const [, css] of stylesheets) for (const m of css.matchAll(/(--[\w-]+)\s*:/g)) defined.set(m[1], '');
    expect([...used].filter((name) => !defined.has(name))).toEqual([]);
  });

  it('holds the Decision: type scale, spacing, radii, depth, focus and targets', () => {
    const t = rootTokens(tokensCss);
    expect(t.get('--font-body')).toMatch(/^'Nunito', system-ui/);
    expect(['--text-sm', '--text-md', '--text-lg', '--text-xl', '--text-2xl', '--text-3xl'].map((k) => t.get(k))).toEqual(
      ['0.875rem', '1.125rem', '1.375rem', '1.75rem', '2.25rem', '2.75rem'],
    );
    expect(t.get('--text-cue')).toBe('5rem');
    expect(t.get('--text-timer')).toBe('clamp(9.5rem, 22vmin, 15rem)');
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((n) => t.get(`--space-${n}`))).toEqual(
      ['4px', '8px', '12px', '16px', '24px', '32px', '48px', '64px'],
    );
    expect(['sm', 'md', 'lg', 'xl', 'pill'].map((k) => t.get(`--radius-${k}`))).toEqual(
      ['8px', '16px', '24px', '32px', '999px'],
    );
    expect(t.get('--press-depth')).toBe('4px');
    expect(t.get('--press-depth-session')).toBe('6px');
    expect(t.get('--border-width')).toBe('2px');
    expect(t.get('--focus-width')).toBe('3px');
    expect(t.get('--focus-offset')).toBe('2px');
    expect(t.get('--target')).toBe('44px');
    expect(t.get('--target-session')).toBe('56px');
    for (const role of ['action', 'success', 'warning', 'stop', 'rest']) {
      for (const part of ['', '-on', '-edge', '-ink', '-tint']) {
        expect(t.get(`--${role}${part}`), `--${role}${part}`).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });
});
