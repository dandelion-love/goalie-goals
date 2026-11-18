// Story #78: the reward moments with Motion for React, for real (jsdom has no Web Animations
// API, so Motion animates through its own frame loop here): the finish card, the "+N XP" chip
// and the streak bump (AC2), and their reduced-motion crossfades (AC3).
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import tokensCss from './tokens.css?raw';
import { RewardElement, rewardMotion } from './rewards';
import { loadRewards } from './motion';
import { FinishProgressView } from './ProgressPanel';
import type { FinishProgress } from './progress';

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

afterEach(() => {
  cleanup();
  delete (window as { matchMedia?: unknown }).matchMedia;
});

const progress: FinishProgress = {
  credit: { session: 10, stars: 1, form: 2, total: 12 },
  summary: {
    date: '2026-01-07',
    xp: { total: 58, today: 12 },
    team: { current: 4, best: 4 },
    keeper: { current: 5, best: 5 },
    parent: { current: 4, best: 4 },
    today: 'together',
    runs: [],
  },
};

const ENTER = [0.05, 0.7, 0.1, 1];
const STANDARD = [0.2, 0, 0, 1];

describe('AC2: the reward moments, from the tokens', () => {
  it('raises the card (300 ms) and the XP chip (200 ms) into place as they fade in', () => {
    setReducedMotion(false);
    expect(rewardMotion('card')).toEqual({
      initial: { opacity: 0, transform: 'translateY(8px)' },
      animate: { opacity: 1, transform: 'translateY(0px)' },
      transition: { duration: 0.3, ease: ENTER },
    });
    expect(rewardMotion('chip').transition).toEqual({ duration: 0.2, ease: ENTER });
  });

  it('bumps a streak or XP value once, to 1.15 and back, in 300 ms', () => {
    setReducedMotion(false);
    expect(rewardMotion('bump')).toEqual({
      initial: { opacity: 1, transform: 'scale(1)' },
      animate: { opacity: 1, transform: ['scale(1)', 'scale(1.15)', 'scale(1)'] },
      transition: { duration: 0.3, ease: STANDARD },
    });
  });

  it('runs the chip with Motion: it starts below and transparent, and arrives', async () => {
    setReducedMotion(false);
    render(
      <RewardElement as="p" kind="chip" className="xp-earned">
        +12 XP
      </RewardElement>,
    );
    const chip = screen.getByText('+12 XP');
    expect(chip.style.opacity).toBe('0');
    expect(chip.style.transform).toBe('translateY(8px)');
    await waitFor(() => expect(chip.style.opacity).toBe('1'));
    expect(chip.style.transform).toMatch(/^(translateY\(0px\)|none)$/);
  });

  it('on the finish screen, the chip rises and every streak tile bumps as the XP arrives', async () => {
    setReducedMotion(false);
    render(<FinishProgressView progress={progress} celebrate />);
    expect(screen.getByText('+12 XP').style.opacity).toBe('0');
    const tiles = [...document.querySelectorAll('.streak dd')] as HTMLElement[];
    expect(tiles.map((t) => t.textContent)).toEqual(['4 training days', '5 training days', '4 training days', '58 XP']);
    await waitFor(() => expect(tiles.some((t) => /scale\(1\.\d+\)/.test(t.style.transform))).toBe(true));
    await waitFor(() => expect(tiles.every((t) => /^(scale\(1\)|none)$/.test(t.style.transform))).toBe(true), { timeout: 2000 });
  });

  it('shows the same values at once, with no motion, when the session is not a celebration', () => {
    setReducedMotion(false);
    render(<FinishProgressView progress={progress} />);
    expect(screen.getByText('+12 XP').getAttribute('style')).toBeNull();
    for (const dd of document.querySelectorAll('.streak dd')) expect(dd.getAttribute('style')).toBeNull();
  });
});

describe('AC3: under reduced motion the rewards crossfade, with the same text and numbers', () => {
  it('fades the card, the chip and the bump in 200 ms, with no transform', () => {
    setReducedMotion(true);
    for (const kind of ['card', 'chip', 'bump'] as const) {
      expect(rewardMotion(kind)).toEqual({
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.2, ease: STANDARD },
      });
    }
  });

  it('never moves the chip or a tile, and shows the same text as with motion', async () => {
    setReducedMotion(false);
    const full = render(<FinishProgressView progress={progress} celebrate />).container.textContent;
    cleanup();

    setReducedMotion(true);
    const transforms: string[] = [];
    const { container } = render(<FinishProgressView progress={progress} celebrate />);
    expect(container.textContent).toBe(full);
    const els = [screen.getByText('+12 XP'), ...document.querySelectorAll<HTMLElement>('.streak dd')];
    const watch = () => els.forEach((el) => el.style.transform && transforms.push(el.style.transform));
    watch();
    await waitFor(() => {
      watch();
      expect(els.every((el) => el.style.opacity === '1')).toBe(true);
    });
    expect(transforms.filter((t) => t !== 'none')).toEqual([]);
  });
});
