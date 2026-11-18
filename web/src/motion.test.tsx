// Story #78: pressed states (AC1), motion at the rubric's key moments (AC2) and reduced motion
// (AC3). jsdom runs no animations, so the Web Animations API is stubbed to record what each
// moment asks for; Motion's reward elements are tested for real in rewards.test.tsx.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import css from './styles.css?raw';
import tokensCss from './tokens.css?raw';
import { cascaded, parseRules, px, resolveTokens, rootTokens, specificity } from './cssCascade';
import { App } from './App';
import { SessionPlayer } from './SessionPlayer';
import { loadRewards, MOMENTS } from './motion';
import { CONFETTI_COLOURS, PILL_MATRIX, PILL_PATH, preloadCelebration } from './celebrate';
import { sound } from './sound';
import { PLANK, demoSession } from './session.fixture';
import type { WakeLockController } from './wakeLock';
import type { PendingRequest } from './approvals';

const confetti = vi.hoisted(() => {
  const fire = Object.assign(vi.fn(async () => undefined), { reset: vi.fn() });
  const lib = Object.assign(vi.fn(), {
    create: vi.fn(() => fire),
    shapeFromPath: vi.fn(({ path, matrix }: { path: string; matrix?: number[] }) => ({ type: 'path', path, matrix })),
  });
  return { fire, lib };
});
vi.mock('canvas-confetti', () => ({ default: confetti.lib }));

// The reward elements, marked with their moment instead of animated (Motion runs in rewards.test.tsx).
vi.mock('./rewards', () => ({
  RewardElement: ({ as, kind, ...props }: { as: string; kind: string }) => createElement(as, { 'data-reward': kind, ...props }),
}));

const TOKENS = rootTokens(tokensCss);
const rules = parseRules(css);

// ---------------------------------------------------------------------------------------------
// Test rig: the tokens on the page, a recording Web Animations API, and a reduced-motion switch.

interface Call {
  el: Element;
  frames: Keyframe[];
  opts: KeyframeAnimationOptions;
}
const calls: Call[] = [];
const log: string[] = [];

function setReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion: reduce'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

beforeAll(async () => {
  const style = document.createElement('style');
  style.textContent = tokensCss;
  document.head.append(style);
  await loadRewards();
});

beforeEach(() => {
  calls.length = 0;
  log.length = 0;
  confetti.fire.mockClear();
  confetti.lib.create.mockClear();
  setReducedMotion(false);
  (Element.prototype as unknown as { animate: unknown }).animate = function (this: Element, frames: Keyframe[], opts: KeyframeAnimationOptions) {
    calls.push({ el: this, frames, opts });
    log.push(`motion:${String(opts.id).replace('moment:', '')}`);
    return { cancel: () => {}, finished: Promise.resolve() };
  };
  vi.spyOn(sound, 'play').mockImplementation((name) => {
    log.push(`cue:${name}`);
    return false;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete (Element.prototype as unknown as { animate?: unknown }).animate;
  delete (window as { matchMedia?: unknown }).matchMedia;
});

const wake: WakeLockController = {
  status: 'off',
  acquire: async () => 'active',
  release: async () => {},
  subscribe: () => () => {},
};

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const moments = () => calls.map((c) => String(c.opts.id).replace('moment:', ''));
const take = () => {
  const out = [...calls];
  calls.length = 0;
  return out;
};
const moves = (c: Call) => c.frames.some((f) => 'transform' in f || 'translate' in f || 'scale' in f || 'strokeDashoffset' in f);

/** One warm-up move, the plank (two held sets), then the finish. */
function renderSession() {
  render(
    <SessionPlayer
      session={demoSession({ warmUp: [{ name: 'March on the spot', seconds: 60, cue: 'Knees up' }], cards: [PLANK], coolDown: [] })}
      layout="medium"
      wakeLock={wake}
      progress={null}
      onExit={() => {}}
    />,
  );
}

// ---------------------------------------------------------------------------------------------

describe('motion tokens (MO3: nothing a person waits on runs past 400 ms)', () => {
  it('keeps every duration at most 400 ms and the celebration at most 2.5 s', () => {
    const durations = [...TOKENS].filter(([name]) => name.startsWith('--motion-') && /ms$/.test(TOKENS.get(name)!));
    expect(durations.map(([n]) => n)).toEqual(['--motion-press', '--motion-short', '--motion-medium', '--motion-celebrate']);
    for (const [name, value] of durations) {
      const ms = Number(value.replace('ms', ''));
      expect(ms, name).toBeLessThanOrEqual(name === '--motion-celebrate' ? 2500 : 400);
    }
    expect(TOKENS.get('--motion-press')).toBe('100ms');
  });

  it('gives every moment a token duration and easing', () => {
    for (const spec of Object.values(MOMENTS)) {
      expect(TOKENS.get(spec.duration)).toMatch(/^\d+ms$/);
      expect(TOKENS.get(spec.easing)).toMatch(/^cubic-bezier\(/);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// AC1: pressed states.

/** Every class list a <button> carries in the app's components. */
const sources = import.meta.glob<string>(['./**/*.tsx', '!./**/*.test.tsx'], { query: '?raw', import: 'default', eager: true });
const buttonLooks = [
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

/** Every @media block for `condition`, in order, as one stylesheet. */
function mediaBlock(condition: string): string {
  const blocks: string[] = [];
  for (let at = css.indexOf(`@media (${condition})`); at >= 0; at = css.indexOf(`@media (${condition})`, at + 1)) {
    const open = css.indexOf('{', at);
    let depth = 1;
    let i = open + 1;
    for (; depth > 0; i += 1) depth += css[i] === '{' ? 1 : css[i] === '}' ? -1 : 0;
    blocks.push(css.slice(open + 1, i - 1));
  }
  return blocks.join('\n');
}
const motionRules = parseRules(mediaBlock('prefers-reduced-motion: no-preference'));

/** A length in px on `el`: its scoped --press-depth first, then the tokens. `calc(a - b)` too. */
function lengthOn(el: Element, value: string): number {
  const depth = cascaded(rules, el, '--press-depth');
  const v = resolveTokens(depth ? value.replace(/var\(--press-depth\)/g, depth) : value);
  const calc = /^calc\((\d+)px - (\d+)px\)$/.exec(v);
  return calc ? Number(calc[1]) - Number(calc[2]) : px(v);
}

/** The bottom border width a button has at rest, from `border`, `border-bottom` or the longhand. */
function bottomEdge(el: Element): number {
  let best: { spec: [number, number, number]; order: number; idx: number; value: string; prop: string } | null = null;
  for (const rule of rules) {
    [...rule.declarations].forEach(([prop, value], idx) => {
      if (!['border', 'border-bottom', 'border-bottom-width'].includes(prop)) return;
      for (const selector of rule.selectors) {
        if (!el.matches(selector)) continue;
        const spec = specificity(selector);
        const c = best ? spec[0] - best.spec[0] || spec[1] - best.spec[1] || spec[2] - best.spec[2] || rule.order - best.order || idx - best.idx : 1;
        if (c >= 0) best = { spec, order: rule.order, idx, value, prop };
      }
    });
  }
  if (!best) return 0;
  const { prop, value } = best as { prop: string; value: string };
  return lengthOn(el, prop === 'border-bottom-width' ? value : value.split(/\s+/)[0]);
}

/** A pressed declaration from the motion block, for `el`. */
function pressed(el: Element, property: string): string | null {
  const stripped = motionRules.map((r) => ({
    ...r,
    selectors: r.selectors.filter((s) => s.includes(':active')).map((s) => s.replace(':active', '').replace(':not(:disabled)', '')),
  }));
  return cascaded(stripped, el, property);
}

describe('AC1: every button look has a pressed state', () => {
  it('finds the looks it checks', () => {
    expect(buttonLooks).toEqual(
      expect.arrayContaining([
        'primary',
        'secondary',
        'secondary session-control',
        'danger session-control safety-control',
        'secondary session-control safety-control',
        'timer-face session-control',
        'area-option',
        'day-toggle',
        'secondary undo',
      ]),
    );
  });

  const safety = buttonLooks.filter((look) => look.split(' ').includes('safety-control'));
  const moving = buttonLooks.filter((look) => !safety.includes(look));

  it('marks Something hurts and Stop as safety controls, wherever they are', () => {
    const named = Object.values(sources).flatMap((text) =>
      [...text.matchAll(/<button\b/g)].flatMap((m) => {
        const tag = text.slice(m.index, text.indexOf('</button>', m.index));
        const label = tag.slice(tag.search(/(?<!=)>/) + 1).trim();
        return label === 'Something hurts' || label === 'Stop' ? [/className="([^"]+)"/.exec(tag)?.[1] ?? ''] : [];
      }),
    );
    expect(named.length).toBeGreaterThanOrEqual(3);
    for (const cls of named) expect(cls.split(' ')).toContain('safety-control');
  });

  it.each(safety)('"%s" (Something hurts, Stop): never moves, only darkens when held', (look) => {
    const el = document.createElement('button');
    el.className = look;
    document.body.append(el);
    expect(bottomEdge(el)).toBeGreaterThanOrEqual(4);
    expect(pressed(el, 'translate')).toBeNull();
    expect(pressed(el, 'border-bottom-width')).toBeNull();
    const held = rules.filter((r) => r.selectors.some((s) => el.matches(s.replace(':active', ''))) && r.selectors.some((s) => s.includes(':active')));
    expect(held.map((r) => r.declarations.get('filter'))).toEqual(['brightness(var(--press-dim))']);
    el.remove();
  });

  it.each(moving)('"%s": a 4 to 6 px bottom edge compresses, and the button moves down by what it lost', (look) => {
    const el = document.createElement('button');
    el.className = look;
    document.body.append(el);
    const rest = bottomEdge(el);
    expect(rest, 'edge at rest').toBeGreaterThanOrEqual(4);
    expect(rest, 'edge at rest').toBeLessThanOrEqual(6);
    const held = lengthOn(el, pressed(el, 'border-bottom-width') ?? '');
    expect(held, 'edge while held').toBe(px(TOKENS.get('--press-rest')!));
    const translate = pressed(el, 'translate') ?? '';
    expect(translate).toMatch(/^0 /);
    expect(lengthOn(el, translate.replace(/^0 /, '')), 'moves down by the edge it lost').toBe(rest - held);
    el.remove();
  });

  it('presses only an enabled button, with the press in --motion-press', () => {
    const active = motionRules.filter((r) => r.selectors.some((s) => s.includes(':active')));
    expect(active.flatMap((r) => r.selectors)).toEqual(['button:active:not(:disabled):not(.safety-control)']);
    const transition = cascaded(motionRules, document.createElement('button'), 'transition') ?? '';
    expect(transition.match(/var\(--motion-press\)/g)).toHaveLength(3);
  });

  it('darkens a held button in every motion setting, so the press shows without movement', () => {
    const top = rules.filter((r) => r.selectors.includes('button:active:not(:disabled)'));
    expect(top.map((r) => [...r.declarations])).toEqual([[['filter', 'brightness(var(--press-dim))']]]);
  });
});

// ---------------------------------------------------------------------------------------------
// AC2: the moments.

describe('AC2: motion at the key moments, in the same commit as the cue', () => {
  it('moves the next step in, logs a set, rates a cue and starts rest; nothing moves during a set', () => {
    renderSession();
    take();

    // A step advanced on the path: warm-up to the plank.
    click('Next');
    let c = take();
    expect(c.map((x) => x.opts.id)).toEqual(['moment:step-advanced']);
    expect(c[0].el.className).toBe('player-step');
    expect(c[0].frames[0]).toEqual({ opacity: 0, transform: 'translateX(16px)' });
    expect(c[0].opts.duration).toBe(300);
    expect(String(c[0].opts.easing).replace(/\s/g, '')).toBe('cubic-bezier(0.05,0.7,0.1,1)');

    // During a set only the countdown moves.
    click('Start set 1');
    expect(take()).toEqual([]);

    // A set logged: the question settles and the check draws in, right after the set-done cue.
    log.length = 0;
    click('End set');
    c = take();
    expect(c.map((x) => x.opts.id)).toEqual(['moment:set-logged', 'moment:check-drawn']);
    expect(c[0].el.className).toBe('feedback-ask');
    expect(c[1].el.closest('svg')!.getAttribute('class')).toBe('set-check');
    expect(c[1].frames).toEqual([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }]);
    expect(log).toEqual(['cue:setDone', 'motion:set-logged', 'motion:check-drawn']);

    // A form cue rated: the praise line grows in; rest starting: its countdown settles in.
    click(PLANK.cues[0]);
    c = take();
    expect(c.map((x) => x.opts.id)).toEqual(['moment:cue-rated', 'moment:rest-started']);
    expect(c[0].el.textContent).toBe(`${PLANK.cues[0]}: nice`);
    expect(c[0].frames[0]).toEqual({ opacity: 0, transform: 'scale(0.96)' });
    expect(c[1].el.className).toBe('player-controls');
    expect(within(c[1].el as HTMLElement).getByRole('button', { name: '45 left' })).toBeTruthy();

    // Pause: a calm crossfade on the switch, never a bounce.
    click('Pause');
    c = take();
    expect(c.map((x) => x.opts.id)).toEqual(['moment:calm']);
    expect(c[0].frames).toEqual([{ opacity: 0 }, { opacity: 1 }]);
    expect(c[0].el.textContent).toBe('Resume');

    for (const call of calls) expect(call.opts.duration).toBeLessThanOrEqual(400);
  });

  it('finishes with the summary card entering and one confetti burst in the app\'s shapes and colours', async () => {
    // The shapes are built ahead (story #98): by the finish they are ready.
    await preloadCelebration();
    renderSession();
    click('Next');
    click('Start set 1');
    click('End set');
    click('Skip');
    click('Skip rest');
    click('End set');
    click('Skip');

    const card = screen.getByRole('heading', { name: 'Session done' }).closest('section')!;
    expect(card.getAttribute('data-reward')).toBe('card');
    await waitFor(() => expect(confetti.fire).toHaveBeenCalledOnce());
    const options = confetti.fire.mock.calls[0][0 as never] as Record<string, unknown>;
    expect(options).toMatchObject({ disableForReducedMotion: true, ticks: 108 });
    expect(options.colors).toEqual(CONFETTI_COLOURS.map((name) => TOKENS.get(name)));
    expect(options.shapes).toEqual(['circle', { type: 'path', path: PILL_PATH, matrix: PILL_MATRIX }]);
    expect(confetti.lib.create.mock.calls[0][1 as never]).toMatchObject({ disableForReducedMotion: true, useWorker: true });

    // The canvas never takes a tap: "Done for today" works while it runs.
    const canvas = document.querySelector('canvas.confetti')!;
    expect(rules.find((r) => r.selectors.includes('.confetti'))!.declarations.get('pointer-events')).toBe('none');
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
    expect((screen.getByRole('button', { name: 'Done for today' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('gives a stop a calm crossfade and no celebration', async () => {
    renderSession();
    click('Next');
    take();
    click('Stop');
    const c = take();
    expect(c.map((x) => x.opts.id)).toEqual(['moment:calm']);
    expect(c[0].el.querySelector('h1')!.textContent).toBe('Good call');
    expect(c[0].el.getAttribute('data-reward')).toBeNull();
    await new Promise((r) => setTimeout(r, 20));
    expect(confetti.fire).not.toHaveBeenCalled();
  });

  it('settles the inbox when an approval leaves it, in the same commit as the new list', async () => {
    const server = parentServer();
    render(<App fetchImpl={server.fetchImpl} />);
    const plan = await screen.findByRole('listitem', { name: 'Starter plan' });
    take();
    fireEvent.click(within(plan).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(moments()).toContain('approval-left'));
    const c = calls.find((x) => x.opts.id === 'moment:approval-left')!;
    expect(c.el.querySelector('#inbox-title')).not.toBeNull();
    expect(within(c.el as HTMLElement).queryByRole('listitem', { name: 'Starter plan' })).toBeNull();
    expect(c.frames[0]).toEqual({ opacity: 0, transform: 'translateY(4px)' });
  });

  it('raises the undo toast into place with CSS (no-preference) and only fades it under reduced motion', () => {
    const toast = document.createElement('div');
    toast.className = 'toast';
    expect(cascaded(motionRules, toast, 'animation')).toBe('rise-in var(--motion-short) var(--ease-enter)');
    expect(cascaded(parseRules(mediaBlock('prefers-reduced-motion: reduce')), toast, 'animation')).toBe(
      'fade-in var(--motion-short) var(--ease-standard)',
    );
  });
});

// ---------------------------------------------------------------------------------------------
// AC3: reduced motion.

describe('AC3: under reduced motion nothing moves and the same text shows', () => {
  it('crossfades or changes at once, with no movement, no check drawing and no confetti', async () => {
    setReducedMotion(true);
    renderSession();
    click('Next');
    click('Start set 1');
    click('End set');
    expect(screen.getByRole('heading', { name: 'How did set 1 look?' })).toBeTruthy();
    click(PLANK.cues[0]);
    expect(screen.getByRole('status').textContent).toBe(`${PLANK.cues[0]}: nice`);
    click('Pause');
    click('Resume');
    click('Skip rest');
    click('End set');
    click('Skip');
    expect(screen.getByRole('heading', { name: 'Session done' })).toBeTruthy();

    // The same moments fire, as crossfades; the check and a pause change at once.
    expect(moments()).toEqual(['step-advanced', 'set-logged', 'cue-rated', 'rest-started', 'set-logged']);
    expect(calls.filter(moves)).toEqual([]);
    for (const c of calls) expect(c.frames).toEqual([{ opacity: 0 }, { opacity: 1 }]);
    await new Promise((r) => setTimeout(r, 20));
    expect(confetti.fire).not.toHaveBeenCalled();
  });

  it('shows the same text on every screen of the session either way', () => {
    const walk = () => {
      const seen: string[] = [];
      renderSession();
      const snap = () => seen.push(document.body.textContent ?? '');
      for (const name of ['Next', 'Start set 1', 'End set', PLANK.cues[0], 'Skip rest', 'End set', 'Skip']) {
        click(name);
        snap();
      }
      cleanup();
      return seen;
    };
    setReducedMotion(false);
    const full = walk();
    setReducedMotion(true);
    expect(walk()).toEqual(full);
  });

  it('keeps every movement in the stylesheet behind prefers-reduced-motion: no-preference', () => {
    const top = parseRules(css);
    const found = top.flatMap((r) =>
      [...r.declarations]
        .filter(([prop]) => ['transition', 'animation', 'translate', 'scale', 'rotate'].includes(prop))
        .map(([prop, value]) => `${r.selectors.join(', ')} { ${prop}: ${value} }`),
    );
    expect(found).toEqual([]);
    // The only reduced-motion animation is a fade: opacity alone, played once.
    expect(/@keyframes fade-in\s*\{\s*from\s*\{\s*opacity: 0;\s*\}\s*\}/.test(css)).toBe(true);
    expect(css).not.toMatch(/animation-iteration-count|infinite/);
  });
});

// ---------------------------------------------------------------------------------------------

/** A fake approval API for the parent's home, with demo content only. */
function parentServer() {
  const pending: PendingRequest[] = [
    {
      id: 'r1',
      kind: 'plan',
      itemId: 'plan-starter',
      itemVersion: 'sha256:a1',
      title: 'Starter plan',
      detail: 'Three short sessions a week.',
      state: 'pending',
      createdAt: '2026-01-05T09:00:00Z',
      expiresAt: '2026-01-12T09:00:00Z',
    },
  ];
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === '/api/me') return json({ role: 'parent' });
    if (url === '/api/approvals/pending') return json({ requests: pending });
    if (url === '/api/notifications/badge') return json({ unread: pending.length });
    if (url === '/api/audit') return json({ events: [] });
    const m = /^\/api\/approvals\/([^/]+)\/(approve|decline)$/.exec(url);
    if (m && init?.method === 'POST') {
      const [r] = pending.splice(0, 1);
      return json({ request: { ...r, state: 'declined' } });
    }
    return json({ error: 'not found' }, 404);
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch };
}
