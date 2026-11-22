// Story #99 AC1: at most four button looks across both homes and the player, each defined once
// in the stylesheet. A look is counted the way the quality rubric's Script A counts it (VC4):
// background, text colour, top border (width and colour), radius, font size, weight and shadow.
// jsdom has no layout or computed cascade, so the seven fields come from the stylesheet's own
// cascade (src/cssCascade.ts), with the tokens resolved, on the buttons of rendered screens.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import css from './styles.css?raw';
import { parseRules, resolveTokens, specificity } from './cssCascade';
import { App } from './App';
import { SessionPlayer } from './SessionPlayer';
import { PainReportForm } from './PainScreens';
import { LoadError } from './Loading';
import { demoSession, keeperServer, todayWith } from './session.fixture';
import type { WakeLockController } from './wakeLock';
import type { PendingRequest } from './approvals';

const MAX_LOOKS = 4;
type Rules = ReturnType<typeof parseRules>;
const RULES = parseRules(css);

// ---------------------------------------------------------------------------------------------
// Script A's seven fields, from the cascade.

/** The winning declaration among `props` on `el` (a shorthand and its longhands compete). */
function winning(rules: Rules, el: Element, props: string[]): { prop: string; value: string } | null {
  let best: { spec: [number, number, number]; order: number; idx: number; prop: string; value: string } | null = null;
  for (const rule of rules) {
    [...rule.declarations].forEach(([prop, value], idx) => {
      if (!props.includes(prop)) return;
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
        const c = best
          ? spec[0] - best.spec[0] || spec[1] - best.spec[1] || spec[2] - best.spec[2] || rule.order - best.order || idx - best.idx
          : 1;
        if (c >= 0) best = { spec, order: rule.order, idx, prop, value };
      }
    });
  }
  return best && { prop: (best as { prop: string }).prop, value: (best as { value: string }).value };
}

/** `value` with each var() resolved: a custom property set on the element or an ancestor first, then the tokens. */
function resolve(rules: Rules, el: Element, value: string): string {
  let out = value;
  for (let i = 0; i < 10 && out.includes('var('); i++) {
    out = out.replace(/var\((--[\w-]+)\)/g, (whole, name: string) => {
      for (let at: Element | null = el; at; at = at.parentElement) {
        const scoped = winning(rules, at, [name]);
        if (scoped) return scoped.value;
      }
      return resolveTokens(whole);
    });
  }
  return out;
}

/** An inherited property: the element's own value, or its parent's. */
function inherited(rules: Rules, el: Element, longhand: string): string {
  for (let at: Element | null = el; at; at = at.parentElement) {
    const w = winning(rules, at, ['font', longhand].filter((p) => longhand.startsWith('font-') || p !== 'font'));
    if (w && w.value !== 'inherit' && w.prop === longhand) return resolve(rules, at, w.value);
  }
  return 'initial';
}

const STYLE = /^(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)$/;
/** The tokens of a shorthand value, keeping parenthesised groups whole. */
const words = (value: string) => value.match(/(?:[^\s(]+|\([^)]*\))+/g) ?? [];
const isWidth = (word: string) => /^(0|\d+(?:\.\d+)?px|thin|medium|thick)$/.test(word);

/** One button's look, as Script A joins it. */
function lookOf(el: Element, rules: Rules = RULES): string {
  const field = (props: string[], fallback: string) => {
    const w = winning(rules, el, props);
    return w ? resolve(rules, el, w.value) : fallback;
  };
  const color = inherited(rules, el, 'color');
  // The top border: from `border` or `border-top`, or from the width and colour longhands.
  let width = 'medium';
  let edge = 'currentcolor';
  const w = winning(rules, el, ['border', 'border-top', 'border-width', 'border-top-width']);
  if (w) {
    const parts = words(resolve(rules, el, w.value));
    width = (w.prop.endsWith('width') ? parts[0] : parts.find(isWidth)) ?? 'medium';
  }
  const c = winning(rules, el, ['border', 'border-top', 'border-color', 'border-top-color']);
  if (c) {
    const parts = words(resolve(rules, el, c.value));
    edge = (c.prop.endsWith('color') ? parts[0] : parts.find((p) => !isWidth(p) && !STYLE.test(p))) ?? 'currentcolor';
  }
  if (edge === 'currentcolor') edge = color;
  return [
    field(['background', 'background-color'], 'UA'),
    color,
    `${width} ${edge}`,
    words(field(['border-radius', 'border-top-left-radius'], '0'))[0],
    inherited(rules, el, 'font-size'),
    inherited(rules, el, 'font-weight'),
    field(['box-shadow'], 'none'),
  ].join(' | ');
}

/** Script A's census of the page in view: every enabled button, joined by look. */
function census(into: Map<string, Set<string>>) {
  for (const b of document.querySelectorAll<HTMLElement>('button, [role="button"]')) {
    if ((b as HTMLButtonElement).disabled || b.closest('[hidden]')) continue;
    const look = lookOf(b);
    if (!into.has(look)) into.set(look, new Set());
    into.get(look)!.add(b.textContent?.trim() || b.className);
  }
}

// ---------------------------------------------------------------------------------------------
// Every class list a <button> carries in the components.

const sources = import.meta.glob<string>(['./**/*.tsx', '!./**/*.test.tsx'], { query: '?raw', import: 'default', eager: true });
const classLists = [
  ...new Set(
    Object.values(sources).flatMap((text) =>
      [...text.matchAll(/<button\b/g)].flatMap((m) => {
        const rest = text.slice(m.index);
        const open = rest.slice(0, rest.search(/(?<!=)>/));
        const cls = /className="([^"]+)"/.exec(open);
        return cls ? [cls[1]] : [];
      }),
    ),
  ),
];
const buttonClasses = new Set(classLists.flatMap((c) => c.split(' ')));

/** The looks of every class list a button carries, in every toggle state it can show. */
function staticLooks(rules: Rules): Map<string, Set<string>> {
  const looks = new Map<string, Set<string>>();
  for (const cls of classLists) {
    for (const state of [{}, { 'aria-pressed': 'true' }, { 'aria-pressed': 'false' }, { 'aria-checked': 'true' }, { 'aria-checked': 'false' }]) {
      const el = document.createElement('button');
      el.className = cls;
      for (const [k, v] of Object.entries(state)) el.setAttribute(k, v);
      document.body.append(el);
      const look = lookOf(el, rules);
      el.remove();
      if (!looks.has(look)) looks.set(look, new Set());
      looks.get(look)!.add(cls);
    }
  }
  return looks;
}

const describeLooks = (looks: Map<string, Set<string>>) => [...looks].map(([look, who]) => `${look}  <-  ${[...who].join(', ')}`);

// ---------------------------------------------------------------------------------------------
// The screens: both homes, the player at every phase, the pain report and a load error.

const wake: WakeLockController = {
  status: 'off',
  acquire: async () => 'active',
  release: async () => {},
  subscribe: () => () => {},
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** A parent's fake API: two requests waiting, the pause on, three training days. Demo content only. */
function parentServer() {
  const request = (id: string, title: string): PendingRequest => ({
    id,
    kind: 'plan',
    itemId: `plan-${id}`,
    itemVersion: `sha256:${id}`,
    title,
    detail: 'Three short sessions a week.',
    state: 'pending',
    createdAt: '2026-01-05T09:00:00Z',
    expiresAt: '2026-01-12T09:00:00Z',
  });
  let pending = [request('r1', 'Starter plan'), request('r2', 'Spring legs')];
  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if ((init?.method ?? 'GET') === 'POST') {
      const m = /^\/api\/approvals\/([^/]+)\/(approve|decline)$/.exec(url);
      if (m) {
        pending = pending.filter((r) => r.id !== m[1]);
        return json({ request: { id: m[1] }, undoForMs: m[2] === 'approve' ? 60_000 : 0 });
      }
      return json({ error: 'not found' }, 404);
    }
    if (url === '/api/me') return json({ role: 'parent' });
    if (url === '/api/approvals/pending') return json({ requests: pending });
    if (url === '/api/notifications/badge') return json({ unread: pending.length });
    if (url === '/api/audit') return json({ events: [] });
    if (url === '/api/pain/status') {
      return json({ paused: true, since: '2026-01-05', reports: [{ id: 'p1', bodyArea: 'knee', note: null, date: '2026-01-05' }] });
    }
    if (url.startsWith('/api/training/days')) {
      return json({ days: [1, 3, 5], themes: [1, 3, 5].map((d, i) => ({ day: d, name: ['Mon', 'Wed', 'Fri'][i], title: 'Strong middle' })) });
    }
    return json({ error: 'not found' }, 404);
  };
  return fetchImpl as unknown as typeof fetch;
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function renderedLooks(): Promise<Map<string, Set<string>>> {
  const looks = new Map<string, Set<string>>();
  const take = () => census(looks);

  // Keeper home, then the whole session: warm-up, a timed card, a rep card, cool-down, finish.
  render(<App fetchImpl={keeperServer(todayWith()).fetchImpl} wakeLock={wake} />);
  await screen.findByRole('button', { name: 'Start session' });
  take();
  click('Start session');
  take();
  click('Next');
  click('Next');
  take();
  click('Start set 1');
  take();
  click('Pause');
  take();
  click('Resume');
  click('End set');
  take();
  click('Stay board-straight');
  take();
  click('Skip rest');
  click('End set');
  click('Skip');
  click('Start set 1');
  take();
  for (let i = 0; i < 12; i += 1) click('+1');
  click('Set done');
  click('Push through heels');
  click('Skip rest');
  click('Set done');
  click('Skip');
  take();
  click('Next');
  await screen.findByRole('heading', { name: 'Session done' });
  take();
  cleanup();

  // The stop screen in the player.
  render(<SessionPlayer session={demoSession()} layout="medium" wakeLock={wake} onExit={() => {}} />);
  click('Stop');
  take();
  cleanup();

  // The pain report, a body area unchecked and checked.
  render(<PainReportForm onSend={async () => true} />);
  take();
  fireEvent.click(screen.getByRole('radio', { name: 'Knee' }));
  take();
  cleanup();

  // A panel that failed to load.
  render(<LoadError message="Couldn't load this." onRetry={() => {}} />);
  take();
  cleanup();

  // Parent home: the inbox, the pause, the training days; then an approval and its Undo toast.
  render(<App fetchImpl={parentServer()} />);
  fireEvent.click(await screen.findByRole('button', { name: /^Inbox/ }));
  const item = await screen.findByRole('listitem', { name: 'Starter plan' });
  take();
  fireEvent.click(screen.getByRole('button', { name: 'Plan' }));
  await screen.findByRole('group', { name: 'Training days' });
  await waitFor(() => expect(screen.getAllByRole('button', { name: /^(Mon|Tue)$/ }).every((b) => !(b as HTMLButtonElement).disabled)).toBe(true));
  take();
  fireEvent.click(screen.getByRole('button', { name: /^Inbox/ }));
  await act(async () => {
    fireEvent.click(within(item).getByRole('button', { name: 'Approve' }));
  });
  await screen.findByRole('button', { name: /Undo/ });
  take();
  return looks;
}

// ---------------------------------------------------------------------------------------------

describe('at most four button looks (story #99, AC1; rubric VC4)', () => {
  it(`finds at most ${MAX_LOOKS} looks on the rendered screens of both homes and the player`, async () => {
    const looks = await renderedLooks();
    const seen = [...looks.values()].flatMap((s) => [...s]);
    // The census reached every kind of button: the safety pair, a toggle on and off, Undo.
    expect(seen).toEqual(
      expect.arrayContaining(['Start session', 'Something hurts', 'Stop', 'Knee', 'Mon', 'Tue', 'Retry', 'Pause', 'Done for today']),
    );
    expect(seen.some((s) => /Undo/.test(s))).toBe(true);
    expect(looks.size, describeLooks(looks).join('\n')).toBeLessThanOrEqual(MAX_LOOKS);
  });

  it(`gives every class list a button carries, in every toggle state, one of at most ${MAX_LOOKS} looks`, () => {
    expect(classLists.length).toBeGreaterThanOrEqual(8);
    const looks = staticLooks(RULES);
    expect(looks.size, describeLooks(looks).join('\n')).toBeLessThanOrEqual(MAX_LOOKS);
  });

  it('keeps button text at least 20 px in every look (rubric TC5 on K2 to K5)', () => {
    for (const look of staticLooks(RULES).keys()) {
      const size = look.split(' | ')[4];
      const rem = /^(\d+(?:\.\d+)?)rem$/.exec(size);
      expect(rem, look).not.toBeNull();
      expect(Number(rem![1]) * 16, look).toBeGreaterThanOrEqual(20);
    }
  });

  it('defines each look once: the base button rule and one rule per look', () => {
    const LOOK = /^(background(-color)?|color|border(-top)?(-width|-color)?|border-radius|border-top-left-radius|font(-size|-weight)?|box-shadow)$/;
    const targetsButton = (selector: string) => {
      if (/:(active|disabled|focus|hover)/.test(selector)) return false;
      const last = selector.split(/[\s>+~]+/).at(-1)!;
      return /^button\b/.test(last) || [...last.matchAll(/\.([\w-]+)/g)].some((m) => buttonClasses.has(m[1]));
    };
    const lookRules = RULES.filter(
      (r) => r.selectors.some(targetsButton) && [...r.declarations].some(([p, v]) => LOOK.test(p) && v !== 'inherit'),
    ).map((r) => r.selectors.join(', '));
    expect(lookRules).toEqual([
      'button',
      "button.primary, .area-option[aria-checked='true'], .day-toggle[aria-pressed='true']",
      'button.secondary, .area-option, .day-toggle',
      'button.danger',
    ]);
  });

  it('fails when a fifth look appears (the count itself works)', () => {
    // A smaller Undo and a rounder timer face: the near-duplicates the re-audit found.
    const extra = parseRules(`${css}\n.undo { font-size: var(--text-md); }\n.timer-face { border-radius: var(--radius-lg); }`);
    const looks = staticLooks(extra);
    expect(looks.size).toBeGreaterThan(MAX_LOOKS);
    // Two look fields differ only by one value each, so each is a new look.
    expect(looks.size).toBe(staticLooks(RULES).size + 2);
  });
});
