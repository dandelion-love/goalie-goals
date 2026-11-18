// "Something hurts" shows the pain report in the tap's own frame (story 101 AC4, story 105). Most
// of that frame is the report's first layout: its words shaped and its controls set up from
// cold. So, once per page, while it is idle, the report is laid out ahead: hidden, inert and
// out of the accessibility tree, in a box of its own, and removed again at once. The tap then
// lays out the real one warm. Nothing here is seen, focused, sent or stored.

import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { PainReportForm, SEE_SOMEONE } from './PainScreens';

/** An idle period at least this long (ms) for each step, so a tap is never held behind one. */
const STEP_IDLE_MS = 40;
/** A page that is never idle warms this long after asking (ms). */
const WARM_TIMEOUT_MS = 3000;

let warmed = false;

type IdleWindow = typeof globalThis & {
  requestIdleCallback?: (cb: (deadline?: IdleDeadline) => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

const noop = () => {};
const neverSent = async () => false;

/**
 * Lay the pain report out once, ahead of "Something hurts", in two idle steps: render it into a
 * detached box, then attach the box, lay it out and remove it. Only with requestIdleCallback
 * (a page without it skips the warm-up). Returns a cancel for an unmount.
 */
export function warmPainReport(doc: Document = document): () => void {
  const w = globalThis as IdleWindow;
  const { requestIdleCallback: whenIdle, cancelIdleCallback: cancel } = w;
  if (warmed || !whenIdle || !cancel) return noop;
  warmed = true;
  let id = 0;
  let box: HTMLElement | null = null;
  let root: Root | null = null;
  const started = Date.now();
  let finished = false;
  const done = () => {
    finished = true;
    root?.unmount();
    box?.remove();
    root = null;
    box = null;
  };
  const idle = (step: () => void) => {
    const ask = () => {
      const timeout = Math.max(1, WARM_TIMEOUT_MS - (Date.now() - started));
      id = whenIdle(
        (deadline) => {
          if (deadline && !deadline.didTimeout && deadline.timeRemaining() < STEP_IDLE_MS) ask();
          else step();
        },
        { timeout },
      );
    };
    ask();
  };
  idle(() => {
    // A report already open (the keeper tapped first) needs no warm-up, and its ids stay unique.
    if (doc.querySelector('.pain-form')) return done();
    box = doc.createElement('div');
    box.className = 'warm-only';
    box.setAttribute('aria-hidden', 'true');
    box.setAttribute('inert', '');
    root = createRoot(box, { identifierPrefix: 'warm-' });
    const r = root;
    flushSync(() =>
      r.render(
        <section className="notice finish">
          <p>{SEE_SOMEONE}</p>
          <PainReportForm onSend={neverSent} onMistake={noop} />
        </section>,
      ),
    );
    idle(() => {
      if (!box) return;
      // Still detached: any report in the page is the real one.
      if (doc.querySelector('.pain-form')) return done();
      doc.body.appendChild(box);
      // The layout is the point: it shapes the words and sets up the controls once.
      void box.offsetHeight;
      done();
    });
  });
  return () => {
    cancel(id);
    // Cancelled before it ran (an unmount, or StrictMode's second mount): the next mount warms.
    if (!finished) warmed = false;
    // Never unmounted inside the app's own commit: a task of its own.
    const r = root;
    box?.remove();
    root = null;
    box = null;
    if (r) setTimeout(() => r.unmount(), 0);
  };
}

/** For tests: let the next page warm again. */
export function resetPainWarmUp(): void {
  warmed = false;
}
