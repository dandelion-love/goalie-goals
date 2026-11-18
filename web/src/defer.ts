// Work a tap starts but needn't finish before its response is on screen (story 101 AC1).
//
// A tap's own task does only what it must: the immediate feedback, and anything safety needs
// (the pause and the end of a session are never deferred: AC4). The rest, such as a network
// send or a hook for a finished session, runs here, after the next paint. A deferred step that
// fails later reports to `onError`, and never undoes what the tap already put on screen.

/** Run `work` after the next paint. A throw or a rejection goes to `onError`. */
export function afterPaint(work: () => unknown, onError: (error: unknown) => void = report): void {
  const run = () => {
    try {
      void Promise.resolve(work()).catch(onError);
    } catch (error) {
      onError(error);
    }
  };
  // A hidden page paints no frames, so it waits for a new task only.
  const visible = typeof document === 'undefined' || document.visibilityState !== 'hidden';
  if (visible && typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setTimeout(run, 0));
  else setTimeout(run, 0);
}

/** No handler given: the error is reported like any uncaught one, and nothing on screen changes. */
function report(error: unknown): void {
  setTimeout(() => {
    throw error;
  }, 0);
}
