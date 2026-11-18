// A small CSS cascade for tests: which value of a property wins on an element, by selector
// specificity and then source order, from the app's own stylesheet. jsdom has no layout, so the
// touch-target tests (quality rubric LT1, story #77) check the declared sizes this way: a
// `button.secondary { min-height: 44px }` that outranks `.session-control { min-height: 56px }`
// is caught here, where a test of class names alone would miss it.
//
// It reads top-level rules only. Rules inside @media and @container blocks are skipped: in this
// stylesheet they change colours and column counts, never sizes.

interface Rule {
  selectors: string[];
  declarations: Map<string, string>;
  order: number;
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** The top-level style rules, in source order. */
export function parseRules(css: string): Rule[] {
  const text = stripComments(css);
  const rules: Rule[] = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf('{', i);
    if (open < 0) break;
    const prelude = text.slice(i, open).trim();
    // Find the matching close brace, so at-rule blocks are skipped whole.
    let depth = 1;
    let j = open + 1;
    while (j < text.length && depth > 0) {
      if (text[j] === '{') depth += 1;
      else if (text[j] === '}') depth -= 1;
      j += 1;
    }
    if (!prelude.startsWith('@')) {
      const declarations = new Map<string, string>();
      for (const decl of text.slice(open + 1, j - 1).split(';')) {
        const colon = decl.indexOf(':');
        if (colon > 0) declarations.set(decl.slice(0, colon).trim(), decl.slice(colon + 1).trim());
      }
      rules.push({ selectors: prelude.split(',').map((s) => s.trim()), declarations, order: rules.length });
    }
    i = j;
  }
  return rules;
}

/** Specificity as [ids, classes + attributes + pseudo-classes, elements]. */
export function specificity(selector: string): [number, number, number] {
  const s = selector.replace(/:not\(([^)]*)\)/g, ' $1').replace(/::[\w-]+/g, '');
  const ids = (s.match(/#[\w-]+/g) ?? []).length;
  const classes = (s.match(/\.[\w-]+|\[[^\]]*\]|:[\w-]+/g) ?? []).length;
  const elements = (s.replace(/\[[^\]]*\]/g, '').match(/(^|[\s>+~])[a-zA-Z][\w-]*/g) ?? []).length;
  return [ids, classes, elements];
}

function compare(a: [number, number, number], b: [number, number, number]): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

/** The winning declared value of `property` on `el`, or null if no rule sets it. */
export function cascaded(rules: Rule[], el: Element, property: string): string | null {
  let best: { spec: [number, number, number]; order: number; value: string } | null = null;
  for (const rule of rules) {
    const value = rule.declarations.get(property);
    if (value === undefined) continue;
    for (const selector of rule.selectors) {
      if (/::/.test(selector)) continue;
      let matches = false;
      try {
        matches = el.matches(selector);
      } catch {
        matches = false;
      }
      if (!matches) continue;
      const spec = specificity(selector);
      if (!best || compare(spec, best.spec) > 0 || (compare(spec, best.spec) === 0 && rule.order >= best.order)) {
        best = { spec, order: rule.order, value };
      }
    }
  }
  return best?.value ?? null;
}

/** A declared size in px (`56px`), or 0 when it is not set in px. */
export function px(value: string | null): number {
  const m = value?.match(/^(\d+(?:\.\d+)?)px$/);
  return m ? Number(m[1]) : 0;
}
