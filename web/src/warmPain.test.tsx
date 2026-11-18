import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PainReportForm } from './PainScreens';
import { resetPainWarmUp, warmPainReport } from './warmPain';

// Story 105: the pain report is laid out once ahead of "Something hurts", on idle, hidden and
// inert, and removed at once. It is never seen, focused, sent or stored.

type Deadline = { didTimeout: boolean; timeRemaining: () => number };

/** A recording requestIdleCallback: callbacks run only when `idle(ms)` is called. */
function idleQueue() {
  const queue = new Map<number, (d: Deadline) => void>();
  const options: unknown[] = [];
  let next = 1;
  vi.stubGlobal('requestIdleCallback', (cb: (d: Deadline) => void, opts?: unknown) => {
    options.push(opts);
    queue.set(next, cb);
    return next++;
  });
  vi.stubGlobal('cancelIdleCallback', (id: number) => queue.delete(id));
  return {
    pending: () => queue.size,
    options,
    idle(ms = 50) {
      const due = [...queue.values()];
      queue.clear();
      for (const cb of due) cb({ didTimeout: false, timeRemaining: () => ms });
    },
  };
}

/** Every warm-up box attached to the page, and what it held as it was attached. */
function watchAppends() {
  const seen: { el: HTMLElement; hidden: string | null; inert: boolean; form: boolean; html: string }[] = [];
  const append = document.body.appendChild.bind(document.body);
  vi.spyOn(document.body, 'appendChild').mockImplementation(<T extends Node>(node: T): T => {
    if (node instanceof HTMLElement && node.classList.contains('warm-only')) {
      seen.push({
        el: node,
        hidden: node.getAttribute('aria-hidden'),
        inert: node.hasAttribute('inert'),
        form: !!node.querySelector('form.pain-form'),
        html: node.innerHTML,
      });
    }
    return append(node);
  });
  return seen;
}

beforeEach(() => resetPainWarmUp());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('the pain report is laid out once ahead (story 105)', () => {
  it('makes a detached box, renders it there, then attaches, lays out and removes it: one idle period each', () => {
    const q = idleQueue();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const seen = watchAppends();
    warmPainReport();
    expect(q.pending()).toBe(1);

    q.idle();
    q.idle();
    // Rendered, but not in the page yet.
    expect(seen).toHaveLength(0);
    expect(document.querySelector('.pain-form')).toBeNull();

    q.idle();
    expect(seen).toHaveLength(1);
    const [box] = seen;
    // Hidden from everyone: out of the accessibility tree, inert, and invisible by its class.
    expect(box.hidden).toBe('true');
    expect(box.inert).toBe(true);
    expect(box.el.className).toBe('warm-only');
    expect(box.form).toBe(true);
    expect(box.html).toContain('Tapped by mistake');
    // As the keeper's home shows it (story 106), and as the player's finish screen does.
    expect(box.html).toContain('Stop and rest.');
    expect(box.html).toContain('See a health professional');
    // Removed in the same task, with nothing sent.
    expect(box.el.isConnected).toBe(false);
    expect(document.querySelector('.warm-only')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(q.pending()).toBe(0);
  });

  it('gives every id its own value while the box is attached, so a hint never points at the other copy (story 106)', () => {
    const q = idleQueue();
    const ids: string[][] = [];
    const append = document.body.appendChild.bind(document.body);
    vi.spyOn(document.body, 'appendChild').mockImplementation(<T extends Node>(node: T): T => {
      const out = append(node);
      if (node instanceof HTMLElement && node.classList.contains('warm-only')) {
        ids.push([...document.querySelectorAll('[id]')].map((el) => el.id));
      }
      return out;
    });
    warmPainReport();
    q.idle();
    q.idle();
    q.idle();
    // The box holds both cards' forms; their hints must not share an id.
    expect(ids).toHaveLength(1);
    expect(ids[0].length).toBeGreaterThan(1);
    expect(new Set(ids[0]).size).toBe(ids[0].length);
  });

  it('points each form hint at its own paragraph when two are on the page (story 106)', () => {
    render(
      <>
        <PainReportForm onSend={async () => true} onMistake={() => {}} />
        <PainReportForm onSend={async () => true} onMistake={() => {}} />
      </>,
    );
    const buttons = screen.getAllByRole('button', { name: 'Tell my parent' });
    const hints = buttons.map((b) => b.getAttribute('aria-describedby'));
    expect(hints[0]).toBeTruthy();
    expect(hints[0]).not.toBe(hints[1]);
    buttons.forEach((b, i) => expect(b.closest('form')?.contains(document.getElementById(hints[i]!))).toBe(true));
  });

  it('happens once per page', () => {
    const q = idleQueue();
    const seen = watchAppends();
    warmPainReport();
    q.idle();
    q.idle();
    q.idle();
    warmPainReport();
    expect(q.pending()).toBe(0);
    expect(seen).toHaveLength(1);
  });

  it('waits for an idle period long enough, so a tap is never held behind it', () => {
    const q = idleQueue();
    const seen = watchAppends();
    warmPainReport();
    q.idle(10);
    expect(q.pending()).toBe(1);
    q.idle();
    q.idle(10);
    q.idle();
    q.idle(10);
    expect(seen).toHaveLength(0);
    q.idle();
    expect(seen).toHaveLength(1);
  });

  it('is never forced by a timeout: each step runs in an idle period only (story 106)', () => {
    const q = idleQueue();
    const seen = watchAppends();
    warmPainReport();
    for (let i = 0; i < 5; i += 1) q.idle(10);
    q.idle();
    q.idle(10);
    q.idle();
    q.idle(10);
    q.idle();
    expect(seen).toHaveLength(1);
    expect(q.options.length).toBeGreaterThan(2);
    expect(q.options.every((o) => o === undefined)).toBe(true);
  });

  it('is skipped while a real report is open, so its ids stay unique', () => {
    const q = idleQueue();
    const seen = watchAppends();
    render(<PainReportForm onSend={async () => true} />);
    warmPainReport();
    q.idle();
    q.idle();
    q.idle();
    expect(seen).toHaveLength(0);
    expect(screen.getAllByRole('form', { name: 'Pain report' })).toHaveLength(1);
  });

  it('does nothing without requestIdleCallback', () => {
    vi.stubGlobal('requestIdleCallback', undefined);
    const seen = watchAppends();
    expect(() => warmPainReport()()).not.toThrow();
    expect(seen).toHaveLength(0);
  });

  it('a cancel before it ran lets the next mount warm', () => {
    const q = idleQueue();
    const seen = watchAppends();
    const cancel = warmPainReport();
    cancel();
    expect(q.pending()).toBe(0);
    warmPainReport();
    q.idle();
    q.idle();
    q.idle();
    expect(seen).toHaveLength(1);
  });
});
