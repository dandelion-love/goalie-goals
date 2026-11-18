// Motion at the key moments (story #78), as the motion Decision sets
// (docs/knowledge/decisions/motion-libraries.md):
//
// - Small moves (a set logged, a cue rated, the next step, rest starting, a calm pause or stop,
//   an approval leaving the inbox) use the Web Animations API through `play`: no library.
// - The reward moments (the finish card, the XP chip, the streak bump) use Motion for React as
//   `m` components (src/rewards.tsx), loaded lazily after first render (see `Reward` below).
// - The finish's one confetti burst lives in celebrate.ts, loaded only when a session starts.
//
// Durations, easing and distances come from src/tokens.css. Under reduced motion nothing moves:
// a moment either crossfades (opacity only) or changes at once, and the same text shows.

import { createElement, useEffect, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode, type Ref } from 'react';

/** A token's value from src/tokens.css, as the page computes it; '' when it is not there. */
export function token(name: string): string {
  if (typeof document === 'undefined') return '';
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  } catch {
    return '';
  }
}

/** A duration token in ms (`200ms` or `0.2s`); 0 when it is missing, so nothing animates. */
export function durationMs(name: string): number {
  const m = /^(\d*\.?\d+)(ms|s)$/.exec(token(name));
  return m ? Number(m[1]) * (m[2] === 's' ? 1000 : 1) : 0;
}

/** A `cubic-bezier()` easing token as Motion's four numbers. */
export function bezier(name: string): [number, number, number, number] | undefined {
  const m = /^cubic-bezier\(([^)]*)\)$/.exec(token(name));
  const n = m?.[1].split(',').map(Number);
  return n && n.length === 4 && n.every(Number.isFinite) ? (n as [number, number, number, number]) : undefined;
}

/** True when the device asks for reduced motion. Read at each moment, so a change applies at once. */
export function reducedMotion(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------------------------
// The small moments: the Web Animations API.

export type Moment = 'set-logged' | 'check-drawn' | 'cue-rated' | 'step-advanced' | 'rest-started' | 'calm' | 'approval-left';

interface MomentSpec {
  duration: string;
  easing: string;
  /** The keyframes with motion welcome. */
  move: () => Keyframe[];
  /** The keyframes under reduced motion: opacity only, or none for an instant change. */
  still: (() => Keyframe[]) | null;
}

const fade = (): Keyframe[] => [{ opacity: 0 }, { opacity: 1 }];
const settle = (): Keyframe[] => [
  { opacity: 0, transform: `translateY(${token('--motion-settle')})` },
  { opacity: 1, transform: 'none' },
];

export const MOMENTS: Record<Moment, MomentSpec> = {
  // The question after a set settles into place as the set is logged.
  'set-logged': { duration: '--motion-short', easing: '--ease-enter', move: settle, still: fade },
  // The set's check mark draws in; under reduced motion it is simply there.
  'check-drawn': {
    duration: '--motion-short',
    easing: '--ease-standard',
    move: () => [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
    still: null,
  },
  // The praise line grows a little into place.
  'cue-rated': {
    duration: '--motion-short',
    easing: '--ease-enter',
    move: () => [
      { opacity: 0, transform: `scale(${token('--motion-pop')})` },
      { opacity: 1, transform: 'none' },
    ],
    still: fade,
  },
  // The next step on the path slides in from the side it comes from.
  'step-advanced': {
    duration: '--motion-medium',
    easing: '--ease-enter',
    move: () => [
      { opacity: 0, transform: `translateX(${token('--motion-slide')})` },
      { opacity: 1, transform: 'none' },
    ],
    still: fade,
  },
  // Rest starts: its countdown settles in. Calm, nothing celebratory.
  'rest-started': { duration: '--motion-short', easing: '--ease-enter', move: settle, still: fade },
  // A pause or a stop: a calm crossfade, never a bounce; under reduced motion an instant change.
  calm: { duration: '--motion-short', easing: '--ease-standard', move: fade, still: null },
  // An approval leaves the parent's inbox: what is left settles.
  'approval-left': { duration: '--motion-short', easing: '--ease-standard', move: settle, still: fade },
};

/**
 * Play a moment on an element, now, in the same task as the change it marks (call it from a
 * layout effect, after the cue). Never blocks: no fill, so the element ends in its own style,
 * and a browser without the Web Animations API simply shows the change.
 */
export function play(el: Element | null | undefined, moment: Moment): Animation | null {
  if (!el || typeof (el as Element & { animate?: unknown }).animate !== 'function') return null;
  const spec = MOMENTS[moment];
  const frames = reducedMotion() ? spec.still?.() : spec.move();
  const duration = durationMs(spec.duration);
  if (!frames || duration <= 0) return null;
  try {
    return el.animate(frames, { duration, easing: token(spec.easing) || 'ease', id: `moment:${moment}` });
  } catch {
    return null;
  }
}

/**
 * Play `moment` on an element each time `trigger` changes (not on first render). `target` is a
 * ref, or a function that finds the element when the moment comes.
 */
export function useMoment(target: { current: Element | null } | (() => Element | null), moment: Moment, trigger: unknown): void {
  const seen = useRef(trigger);
  useLayoutEffect(() => {
    if (Object.is(seen.current, trigger)) return;
    seen.current = trigger;
    play(typeof target === 'function' ? target() : target.current, moment);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
}

// ---------------------------------------------------------------------------------------------
// The reward moments: Motion for React, loaded lazily.
//
// Motion's `m` core is about 17 kB gzipped at this version, more than the Decision's 5 kB, so
// none of Motion is in the first render: src/rewards.tsx (Motion, its `domAnimation` features
// and `MotionConfig reducedMotion="user"`) is fetched in the background once the app has
// rendered, and precached for offline sessions. Until it arrives a reward element shows still.

export type RewardKind = 'card' | 'chip' | 'bump';
type RewardsModule = typeof import('./rewards');

let rewards: RewardsModule | null = null;
let loadingRewards: Promise<RewardsModule | null> | null = null;

/** Fetch the reward moments' code (Motion) in the background. Safe to call many times. */
export function loadRewards(): Promise<RewardsModule | null> {
  loadingRewards ??= import('./rewards')
    .then((m) => (rewards = m))
    .catch(() => {
      loadingRewards = null;
      return null;
    });
  return loadingRewards;
}

/** How long after the first screen the reward moments start to load, so the panels load first. */
const LOAD_REWARDS_AFTER_MS = 1000;

/** The app root: loads the reward moments in the background once the first screen is up. */
export function MotionRoot({ children }: { children: ReactNode }) {
  useEffect(() => {
    const id = setTimeout(() => void loadRewards(), LOAD_REWARDS_AFTER_MS);
    return () => clearTimeout(id);
  }, []);
  return <>{children}</>;
}

type RewardTag = 'section' | 'p' | 'dd';

/**
 * An element that arrives with a reward moment: the finish card, the "+N XP" chip, a streak or
 * XP value's bump. `on` is false when the moment is not a celebration (a stop, a session already
 * counted). Whether it moves is fixed when it mounts, so a later render never starts it again;
 * give it a new `key` to play it again.
 */
export function Reward({
  as,
  kind,
  on = true,
  ref,
  ...props
}: {
  as: RewardTag;
  kind: RewardKind;
  on?: boolean;
  ref?: Ref<HTMLElement>;
  className?: string;
  children?: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  const [mod] = useState(() => (on ? rewards : null));
  if (!mod) return createElement(as, { ref, ...props });
  return <mod.RewardElement as={as} kind={kind} ref={ref} {...props} />;
}
