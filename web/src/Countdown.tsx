import { useEffect, useRef, useState, type MutableRefObject } from 'react';

/** With no wake lock, a running timer asks for a tap this often, which also keeps the screen awake. */
export const KEEP_AWAKE_TAP_MS = 50_000;
const TICK_MS = 250;

export interface CountdownProps {
  seconds: number;
  /** What is being timed, read out with the time: "Hold", "Rest", a move's name. */
  label: string;
  onDone: () => void;
  /** Wake-lock fallback: pause until tapped once KEEP_AWAKE_TAP_MS passes without a tap. */
  needsTaps?: boolean;
  /** When the keeper last touched the screen; shared across timers so auto-advancing moves still ask. */
  lastTap?: MutableRefObject<number>;
}

function mmss(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m ? `${m}:${String(s).padStart(2, '0')}` : String(s);
}

/**
 * A countdown readable from a few metres. Remaining time is measured against the clock, so a
 * slow tick never stretches a rest. The face is a 56 px+ button: tapping it keeps the screen
 * awake in the fallback and resumes a timer that waited for a tap.
 */
export function Countdown({ seconds, label, onDone, needsTaps = false, lastTap: sharedTap }: CountdownProps) {
  const [remaining, setRemaining] = useState(seconds * 1000);
  const [paused, setPaused] = useState(false);
  const [waitingForTap, setWaitingForTap] = useState(false);
  const lastTick = useRef(Date.now());
  const ownTap = useRef(Date.now());
  const lastTap = sharedTap ?? ownTap;
  const done = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const holding = paused || waitingForTap;

  useEffect(() => {
    lastTick.current = Date.now();
    if (holding) return;
    const id = setInterval(() => {
      const now = Date.now();
      const dt = now - lastTick.current;
      lastTick.current = now;
      if (needsTaps && now - lastTap.current >= KEEP_AWAKE_TAP_MS) {
        setWaitingForTap(true);
        return;
      }
      setRemaining((r) => Math.max(0, r - dt));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [holding, needsTaps]);

  useEffect(() => {
    if (remaining === 0 && !done.current) {
      done.current = true;
      onDoneRef.current();
    }
  }, [remaining]);

  const tap = () => {
    lastTap.current = Date.now();
    setWaitingForTap(false);
  };

  return (
    <div className="countdown">
      <button
        type="button"
        className="timer-face session-control"
        onClick={tap}
        aria-label={`${label}, ${mmss(remaining)} left${waitingForTap ? ', tap to keep going' : ''}`}
      >
        <span className="timer-label">{label}</span>
        <span className="timer-time" aria-hidden="true">
          {mmss(remaining)}
        </span>
        {waitingForTap && <span className="timer-hint">Tap to keep going</span>}
      </button>
      <button type="button" className="secondary session-control" onClick={() => {
          tap();
          setPaused((p) => !p);
        }}>
        {paused ? 'Resume' : 'Pause'}
      </button>
    </div>
  );
}
