import { useEffect, useRef, type ReactNode } from 'react';

// Loading and error states shared by the home panels (story #80).
//
// Layout stability: a panel shows a skeleton at its usual size while it loads, and a home shows
// each panel only once every panel above it has settled (loaded or failed). Panels below are
// mounted at once, so every request still starts together, but they stay hidden until then: a
// panel that grows as it fills can never push one that is already on screen.

/** Grey blocks standing in for a panel's content, with one "Loading" status for screen readers. */
export function Skeleton({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`skeleton ${className}`.trim()} role="status" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className="skeleton-line" aria-hidden="true" />
      ))}
    </div>
  );
}

/** A plain message and a Retry button. No gesture is mentioned: Retry is the only way offered. */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="load-error" role="alert">
      <p>{message}</p>
      <button type="button" className="secondary" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

/**
 * The space a panel holds while it loads: its skeleton, or, when the load fails, the message and
 * Retry in the same box, so a failure (or a Retry) moves nothing below it (story #95 AC4). The
 * box is the same element in both states; `size` names the panel's usual size.
 */
export function LoadSpace({
  failed,
  lines,
  size = '',
  message,
  onRetry,
}: {
  failed: boolean;
  lines: number;
  size?: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className={`load-space ${size}`.trim()}>
      {failed ? <LoadError message={message} onRetry={onRetry} /> : <Skeleton lines={lines} />}
    </div>
  );
}

/** Shows its children once `open`; until then they are mounted (so they load) but hidden. */
export function Reveal({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className="reveal" hidden={!open}>
      {children}
    </div>
  );
}

/** Calls `onSettled` once, the first time `settled` is true. */
export function useSettled(settled: boolean, onSettled?: () => void) {
  const done = useRef(false);
  useEffect(() => {
    if (settled && !done.current) {
      done.current = true;
      onSettled?.();
    }
  }, [settled, onSettled]);
}
