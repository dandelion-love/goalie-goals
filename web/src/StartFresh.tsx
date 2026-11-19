import { useEffect, useId, useRef, useState } from 'react';
import { RESET_WORD, resetHousehold } from './household';
import { fetchPauseStatus } from './pain';
import { SAVING, SavingAnnouncer, savingProps, useOneAtATime } from './Saving';

// Start fresh (story 121), at the very bottom of the parent's home, far from the everyday
// controls. It opens a confirm step that says what is cleared and what stays, and clears
// nothing until the parent types the word. The server checks the role and the word again.

const CLEARED = [
  'Approvals and requests',
  'The history',
  'XP, streaks and day results',
  'Recent sessions',
  'Pain reports, notes and pauses',
];
const KEPT = ['Accounts', 'Training days'];

export function StartFresh({
  fetchImpl,
  onDone,
  now = () => new Date(),
}: {
  fetchImpl?: typeof fetch;
  /** Called once the household's data is cleared, so the home loads again. */
  onDone?: () => void;
  now?: () => Date;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  /** Whether training is paused now: null until known (or when it could not be read). */
  const [paused, setPaused] = useState<boolean | null>(null);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const once = useOneAtATime();
  const input = useRef<HTMLInputElement>(null);
  const fieldId = useId();
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    let live = true;
    setPaused(null);
    fetchPauseStatus(fetchImpl)
      .then((s) => live && setPaused(s.paused))
      .catch(() => live && setPaused(null));
    input.current?.focus();
    return () => {
      live = false;
    };
  }, [open, fetchImpl]);

  const confirmed = typed.trim() === RESET_WORD;

  const cancel = () => {
    setOpen(false);
    setTyped('');
    setState('idle');
  };

  const clear = () =>
    once(async () => {
      if (!confirmed) return;
      setState('sending');
      try {
        await resetHousehold(RESET_WORD, fetchImpl, now());
        setOpen(false);
        setTyped('');
        setState('done');
        onDone?.();
      } catch {
        setState('error');
      }
    });

  return (
    <article className="card start-fresh" aria-labelledby={titleId}>
      <h2 id={titleId}>Start fresh</h2>
      <p>Clears the training data and asks for the plan again.</p>
      {!open && (
        <button type="button" className="secondary" onClick={() => setOpen(true)}>
          Start fresh
        </button>
      )}
      {open && (
        <form
          className="start-fresh-confirm"
          onSubmit={(e) => {
            e.preventDefault();
            void clear();
          }}
        >
          <p className="start-fresh-head">This clears:</p>
          <ul>
            {CLEARED.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="start-fresh-head">This stays:</p>
          <ul>
            {KEPT.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="start-fresh-pause">
            {paused ? 'Training is paused now. This also clears the pause.' : 'This also clears the pause, if one is open.'}
          </p>
          <label className="start-fresh-field" htmlFor={fieldId}>
            Type {RESET_WORD} to confirm.
          </label>
          <input
            id={fieldId}
            ref={input}
            type="text"
            value={typed}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            onChange={(e) => setTyped(e.target.value)}
          />
          <div className="actions">
            <button
              type="submit"
              className="danger"
              disabled={!confirmed}
              {...savingProps(state === 'sending')}
            >
              {state === 'sending' ? SAVING : 'Clear all data'}
            </button>
            <button type="button" className="secondary" onClick={cancel}>
              Cancel
            </button>
          </div>
        </form>
      )}
      <SavingAnnouncer pending={state === 'sending'} />
      <div className="start-fresh-message">
        {state === 'error' && <p role="alert">Couldn't clear the data. Try again.</p>}
        {state === 'done' && <p role="status">Data cleared. The plan waits in the inbox.</p>}
      </div>
    </article>
  );
}
