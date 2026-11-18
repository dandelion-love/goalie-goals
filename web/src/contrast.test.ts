// Story #76 AC3: WCAG 2.2 contrast of every text pair and every control boundary in the token
// file, in the light and the dark theme, with the reviewer's margins over the WCAG minimums:
// text at least 4.6:1 (WCAG AA 4.5:1) and control boundaries at least 3.1:1 (WCAG 3:1).
import { describe, expect, it } from 'vitest';
import tokensCss from './tokens.css?raw';
import stylesCss from './styles.css?raw';
import { parseRules } from './cssCascade';

const TEXT_MIN = 4.6;
const BOUNDARY_MIN = 3.1;
const ROLES = ['action', 'success', 'warning', 'stop', 'rest'] as const;

/** The custom properties of the first block whose selector matches, wherever it is nested. */
function block(css: string, selector: RegExp): Map<string, string> {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of text.matchAll(/([^{};]*)\{([^{}]*)\}/g)) {
    if (!selector.test(m[1].trim())) continue;
    const out = new Map<string, string>();
    for (const decl of m[2].split(';')) {
      const colon = decl.indexOf(':');
      if (colon > 0 && decl.trim().startsWith('--')) out.set(decl.slice(0, colon).trim(), decl.slice(colon + 1).trim());
    }
    return out;
  }
  throw new Error(`no block for ${selector}`);
}

const light = new Map(
  [...parseRules(tokensCss)].filter((r) => r.selectors.includes(':root')).flatMap((r) => [...r.declarations]),
);
const darkMedia = block(tokensCss, /^:root:not\(\[data-theme='light'\]\)$/);
const darkAttr = block(tokensCss, /^:root\[data-theme='dark'\]$/);
const THEMES = { light, dark: new Map([...light, ...darkMedia]) };

/** WCAG 2.2 relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function colour(theme: Map<string, string>, token: string): string {
  const value = theme.get(token);
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${token} is not a #rrggbb colour: ${value}`);
  return value;
}

type Pair = [fg: string, bg: string];

/** Text pairs: what text is drawn in, on what it is drawn. */
function textPairs(): Pair[] {
  const pairs: Pair[] = [
    ['--text', '--bg'],
    ['--text', '--surface'],
    ['--muted', '--bg'],
    ['--muted', '--surface'],
    ['--surface', '--text'], // the toast: the text colour as the fill
  ];
  for (const role of ROLES) {
    pairs.push(
      [`--${role}-on`, `--${role}`],
      [`--${role}-ink`, '--bg'],
      [`--${role}-ink`, '--surface'],
      [`--${role}-ink`, `--${role}-tint`],
      ['--text', `--${role}-tint`],
    );
  }
  return pairs;
}

/** Control boundaries: what shows a control's edge against what is behind it. */
function boundaries(theme: Map<string, string>): { name: string; value: number }[] {
  const out: { name: string; value: number }[] = [];
  for (const behind of ['--bg', '--surface']) {
    const bg = colour(theme, behind);
    out.push({ name: `--line on ${behind} (outlined controls)`, value: ratio(colour(theme, '--line'), bg) });
    out.push({ name: `--action-ink on ${behind} (focus ring)`, value: ratio(colour(theme, '--action-ink'), bg) });
    for (const role of ROLES) {
      // A control shows its boundary by its fill or by its pressable edge, whichever is stronger.
      const fill = ratio(colour(theme, `--${role}`), bg);
      const edge = ratio(colour(theme, `--${role}-edge`), bg);
      out.push({ name: `--${role} fill or edge on ${behind}`, value: Math.max(fill, edge) });
    }
  }
  return out;
}

describe('contrast of the tokens, with a margin (story #76, AC3)', () => {
  it('computes WCAG ratios correctly', () => {
    expect(ratio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(ratio('#ffffff', '#ffffff')).toBe(1);
    expect(ratio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });

  it('defines the dark theme the same way for the system setting and for data-theme', () => {
    expect([...darkAttr].filter(([k]) => k.startsWith('--'))).toEqual([...darkMedia]);
  });

  for (const [name, theme] of Object.entries(THEMES)) {
    it(`${name}: every text pair is at least ${TEXT_MIN}:1`, () => {
      const failing = textPairs()
        .map(([fg, bg]) => ({ pair: `${fg} on ${bg}`, value: ratio(colour(theme, fg), colour(theme, bg)) }))
        .filter((p) => p.value < TEXT_MIN)
        .map((p) => `${p.pair} ${p.value.toFixed(2)}`);
      expect(failing).toEqual([]);
    });

    it(`${name}: every control boundary is at least ${BOUNDARY_MIN}:1`, () => {
      const failing = boundaries(theme)
        .filter((b) => b.value < BOUNDARY_MIN)
        .map((b) => `${b.name} ${b.value.toFixed(2)}`);
      expect(failing).toEqual([]);
    });
  }

  // The pain report's body-area toggles (K7, story #77) had no visible edge (1.08:1). Each one
  // now shows its boundary by its border, on whatever is behind it: the card or the page.
  it('gives the body-area toggles an edge of at least 3.1:1 in both themes, checked or not', () => {
    const styles = parseRules(stylesCss);
    const decl = (selector: string, property: string) =>
      styles.find((r) => r.selectors.includes(selector) && r.declarations.has(property))?.declarations.get(property) ?? '';
    const tokenOf = (value: string) => value.match(/var\((--[\w-]+)\)/g)?.at(-1)?.slice(4, -1) ?? '';
    const border = tokenOf(decl('.area-option', 'border'));
    const checkedBorder = tokenOf(decl(".area-option[aria-checked='true']", 'border-color'));
    const fill = tokenOf(decl('.area-option', 'background'));
    const checkedFill = tokenOf(decl(".area-option[aria-checked='true']", 'background'));
    expect([border, checkedBorder, fill, checkedFill]).toEqual(['--line', '--action-edge', '--surface', '--action']);
    expect(decl('.area-option', 'border')).toMatch(/^var\(--border-width\) solid/);
    for (const [name, theme] of Object.entries(THEMES)) {
      for (const behind of ['--bg', '--surface']) {
        const bg = colour(theme, behind);
        const unchecked = ratio(colour(theme, border), bg);
        const checked = Math.max(ratio(colour(theme, checkedBorder), bg), ratio(colour(theme, checkedFill), bg));
        expect(unchecked, `${name}: unchecked toggle edge on ${behind}`).toBeGreaterThanOrEqual(BOUNDARY_MIN);
        expect(checked, `${name}: checked toggle edge on ${behind}`).toBeGreaterThanOrEqual(BOUNDARY_MIN);
      }
    }
  });

  it('catches a pair under the margin (the check itself works)', () => {
    // 4.52:1 passes WCAG AA but not this app's margin.
    expect(ratio('#ffffff', '#1f76d8')).toBeLessThan(TEXT_MIN);
    expect(ratio('#ffffff', '#1f76d8')).toBeGreaterThanOrEqual(4.5);
  });
});
