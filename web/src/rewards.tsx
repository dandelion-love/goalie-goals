// The reward moments with Motion for React (story #78; motion Decision, item 2): the finish
// card entering, the "+N XP" chip rising and a streak or XP value's one bump. This module is its
// own chunk, loaded by `loadRewards` (src/motion.tsx) after the first screen is up, so none of
// Motion weighs on first render. `m` components only (`strict`), with `domAnimation`, inside
// `MotionConfig reducedMotion="user"`, and the reduced-motion swap made here as well.

import { useState, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { domAnimation, LazyMotion, MotionConfig } from 'motion/react';
import * as m from 'motion/react-m';
import { bezier, durationMs, reducedMotion, token, type RewardKind } from './motion';

type Values = Record<string, string | number | (string | number)[]>;
export interface RewardMotion {
  initial: Values | false;
  animate: Values;
  transition?: { duration: number; ease?: [number, number, number, number] };
}

/** Shown as it is, with no animation. */
const still = (animate: Values): RewardMotion => ({ initial: false, animate });

/**
 * What each reward moment does. With motion welcome: the card and the chip rise into place as
 * they fade in (the card 300 ms, the chip 200 ms); a value bumps once to --motion-bump and back
 * (300 ms). Under reduced motion: a 200 ms crossfade, no movement, the same text and numbers.
 */
export function rewardMotion(kind: RewardKind): RewardMotion {
  const rest: Values = kind === 'bump' ? { opacity: 1, transform: 'scale(1)' } : { opacity: 1, transform: 'translateY(0px)' };
  if (reducedMotion()) {
    const duration = durationMs('--motion-short') / 1000;
    return duration > 0
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration, ease: bezier('--ease-standard') } }
      : still({ opacity: 1 });
  }
  if (kind === 'bump') {
    const duration = durationMs('--motion-medium') / 1000;
    const up = `scale(${token('--motion-bump') || 1})`;
    return duration > 0
      ? {
          initial: { opacity: 1, transform: 'scale(1)' },
          animate: { opacity: 1, transform: ['scale(1)', up, 'scale(1)'] },
          transition: { duration, ease: bezier('--ease-standard') },
        }
      : still(rest);
  }
  const duration = durationMs(kind === 'card' ? '--motion-medium' : '--motion-short') / 1000;
  return duration > 0
    ? {
        initial: { opacity: 0, transform: `translateY(${token('--motion-rise')})` },
        animate: rest,
        transition: { duration, ease: bezier('--ease-enter') },
      }
    : still(rest);
}

const TAGS = { section: m.section, p: m.p, dd: m.dd };

export function RewardElement({
  as,
  kind,
  ref,
  ...props
}: {
  as: keyof typeof TAGS;
  kind: RewardKind;
  ref?: Ref<HTMLElement>;
  className?: string;
  children?: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  // Fixed at mount: a later render never starts the moment again.
  const [motion] = useState(() => rewardMotion(kind));
  const Tag = TAGS[as] as typeof m.section;
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        <Tag ref={ref as Ref<HTMLElement>} {...(props as object)} {...motion} />
      </LazyMotion>
    </MotionConfig>
  );
}
