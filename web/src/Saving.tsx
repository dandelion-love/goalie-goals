import { useCallback, useRef } from 'react';

// Story #96 AC2: a control whose request is still on its way says so. The pressed button reads
// "Saving…" with aria-busy (seen at the control), and a polite live region that is always in
// the page says it once to a screen reader (an alert would interrupt; a region inserted with its
// text is often not read at all). A second tap while it is pending sends nothing.

export const SAVING = 'Saving…';

/** Props for the pressed button while its request is pending: busy, and taps ignored. */
export function savingProps(pending: boolean) {
  return pending ? { 'aria-busy': true, 'aria-disabled': true } : {};
}

/** The polite announcement. Rendered whether or not anything is pending, so it is heard. */
export function SavingAnnouncer({ pending }: { pending: boolean }) {
  return (
    <span className="sr-only" role="status" aria-live="polite">
      {pending ? SAVING : ''}
    </span>
  );
}

/**
 * Runs one request at a time: a call made while one is in flight returns at once and sends
 * nothing. A ref, not state, so two taps in the same frame still count as one.
 */
export function useOneAtATime() {
  const inFlight = useRef(false);
  return useCallback(async (send: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await send();
    } finally {
      inFlight.current = false;
    }
  }, []);
}
