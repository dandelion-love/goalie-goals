// The finish's one confetti burst (story #78; motion Decision, item 3): canvas-confetti, loaded
// when a session starts so it is ready at the end. The app's own shapes (the lesson path's round
// node and the badge's pill) in the role colours from src/tokens.css. It draws on its own canvas
// that never takes a tap, stops within --motion-celebrate, and never runs under reduced motion.

import { durationMs, reducedMotion, token } from './motion';

type Confetti = typeof import('canvas-confetti');

let loading: Promise<Confetti | null> | null = null;

/** Fetch canvas-confetti in the background, so the finish does not wait for it. */
export function preloadCelebration(): Promise<Confetti | null> {
  loading ??= import('canvas-confetti').then((m) => m.default).catch(() => null);
  return loading;
}

/** The badge's pill (src/styles.css `.badge`), as a path: the app's own shape. */
export const PILL_PATH = 'M3 0h6a3 3 0 0 1 0 6H3a3 3 0 0 1 0-6z';

/** The fill colour of each role, read from the tokens in the current theme. */
export const CONFETTI_COLOURS = ['--action', '--success', '--warning', '--rest'];

/** At 60 frames a second; the burst is also cut off at the end of --motion-celebrate. */
const FRAMES_PER_MS = 60 / 1000;

/** One burst. Resolves when it has started (or when it is skipped). Never throws. */
export async function celebrate(): Promise<void> {
  if (reducedMotion()) return;
  const life = durationMs('--motion-celebrate');
  const colors = CONFETTI_COLOURS.map(token).filter(Boolean);
  if (life <= 0 || colors.length === 0) return;
  const confetti = await preloadCelebration();
  if (!confetti || reducedMotion()) return;
  try {
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.append(canvas);
    const fire = confetti.create(canvas, { resize: true, useWorker: true, disableForReducedMotion: true });
    const pill = confetti.shapeFromPath({ path: PILL_PATH });
    void fire({
      particleCount: 70,
      spread: 70,
      startVelocity: 38,
      origin: { y: 0.55 },
      ticks: Math.round(life * FRAMES_PER_MS),
      colors,
      shapes: ['circle', pill],
      disableForReducedMotion: true,
    });
    setTimeout(() => {
      fire.reset();
      canvas.remove();
    }, life);
  } catch {
    // No canvas: the summary card is the whole finish.
  }
}
