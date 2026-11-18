// The finish's one confetti burst (story #78; motion Decision, item 3): canvas-confetti, loaded
// when a session starts so it is ready at the end. The app's own shapes (the lesson path's round
// node and the badge's pill) in the role colours from src/tokens.css. It draws on its own canvas
// that never takes a tap, stops within --motion-celebrate, and never runs under reduced motion.
//
// No long task (story #98). canvas-confetti's `shapeFromPath` measures a path with no matrix by
// testing a 500 by 500 grid of points: one call is 210 to 350 ms at 4x CPU. The pill's matrix is
// precomputed here instead (PILL_MATRIX, the exact one the library computes), so building the
// shape is a fraction of a millisecond. It is built once, in its own task after the chunk
// loads, and reused. If it is not ready when the session is done, the burst is skipped rather
// than waited for: the finish card is the whole finish.

import { durationMs, reducedMotion, token } from './motion';
import { yieldToPage } from './cues';

type Confetti = typeof import('canvas-confetti');
type Shape = import('canvas-confetti').Shape;

/** canvas-confetti and the app's shapes, built once and ready to fire. */
interface Ready {
  confetti: Confetti;
  shapes: Shape[];
}

let ready: Ready | null = null;
let loading: Promise<Ready | null> | null = null;

/** The badge's pill (src/styles.css `.badge`), as a path: the app's own shape. */
export const PILL_PATH = 'M3 0h6a3 3 0 0 1 0 6H3a3 3 0 0 1 0-6z';

/**
 * The pill's transform, precomputed: what `shapeFromPath({ path: PILL_PATH })` works out by
 * sampling (measured in Chromium, and checked against the path's geometry in
 * celebrate.test.tsx). It scales the shape to canvas-confetti's 10-unit size and centres it.
 * Change it with PILL_PATH.
 */
export const PILL_MATRIX = [1.25, 0, 0, 1.25, -7.5, -3.75];

/** The fill colour of each role, read from the tokens in the current theme. */
export const CONFETTI_COLOURS = ['--action', '--success', '--warning', '--rest'];

/** At 60 frames a second; the burst is also cut off at the end of --motion-celebrate. */
const FRAMES_PER_MS = 60 / 1000;

/** The shapes, from the precomputed path data: no sampling, well under a millisecond. */
function buildShapes(confetti: Confetti): Shape[] {
  // The library draws a path shape only when its matrix is an array (its own result is one);
  // its types say DOMMatrix.
  return ['circle', confetti.shapeFromPath({ path: PILL_PATH, matrix: PILL_MATRIX as unknown as DOMMatrix })];
}

/**
 * Fetch canvas-confetti in the background and build the shapes once, in a task of their own
 * after the chunk's, so the finish neither waits nor builds anything. Safe to call many times.
 */
export function preloadCelebration(): Promise<Ready | null> {
  loading ??= import('canvas-confetti')
    .then(async (m) => {
      await yieldToPage();
      ready = { confetti: m.default, shapes: buildShapes(m.default) };
      return ready;
    })
    .catch(() => {
      // Not loaded, or no path support: no burst; a later session may try again.
      loading = null;
      return null;
    });
  return loading;
}

/** Whether the burst can fire now, with no wait and nothing to build. */
export function celebrationReady(): boolean {
  return ready !== null;
}

/** One burst, now. False when it is skipped (reduced motion, not ready yet, no canvas). Never throws. */
export function celebrate(): boolean {
  if (reducedMotion() || !ready) return false;
  const life = durationMs('--motion-celebrate');
  const colors = CONFETTI_COLOURS.map(token).filter(Boolean);
  if (life <= 0 || colors.length === 0) return false;
  const { confetti, shapes } = ready;
  try {
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.append(canvas);
    const fire = confetti.create(canvas, { resize: true, useWorker: true, disableForReducedMotion: true });
    void fire({
      particleCount: 70,
      spread: 70,
      startVelocity: 38,
      origin: { y: 0.55 },
      ticks: Math.round(life * FRAMES_PER_MS),
      colors,
      shapes,
      disableForReducedMotion: true,
    });
    setTimeout(() => {
      fire.reset();
      canvas.remove();
    }, life);
    return true;
  } catch {
    // No canvas: the summary card is the whole finish.
    return false;
  }
}
