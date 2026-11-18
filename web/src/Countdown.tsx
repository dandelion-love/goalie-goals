import { useEffect, useId, useLayoutEffect, useRef, useState, type MutableRefObject } from 'react';
import { useCue } from './sound';
import { useMoment } from './motion';

/** With no wake lock, a running timer asks for a tap this often, which also keeps the screen awake. */
export const KEEP_AWAKE_TAP_MS = 50_000;
const TICK_MS = 250;

export interface CountdownProps {
  seconds: number;
  /** What is being timed, shown above the timer and read as its description: "Hold", "Rest", a move's name. */
  label: string;
  onDone: () => void;
  /** Wake-lock fallback: pause until tapped once KEEP_AWAKE_TAP_MS passes without a tap. */
  needsTaps?: boolean;
  /** When the keeper last touched the screen; shared across timers so auto-advancing moves still ask. */
  lastTap?: MutableRefObject<number>;
  /** Play a tick on each of the last three seconds, as the number on the face changes (rest). */
  ticks?: boolean;
  /** Held from outside (the stop screen is showing): no time passes, and no cue plays, until it is false again. */
  frozen?: boolean;
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
export function Countdown({
  seconds,
  label,
  onDone,
  needsTaps = false,
  lastTap: sharedTap,
  ticks = false,
  frozen = false,
}: CountdownProps) {
  const [remaining, setRemaining] = useState(seconds * 1000);
  const [paused, setPaused] = useState(false);
  const [waitingForTap, setWaitingForTap] = useState(false);
  const lastTick = useRef(Date.now());
  const ownTap = useRef(Date.now());
  const lastTap = sharedTap ?? ownTap;
  const done = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const holding = paused || waitingForTap || frozen;
  const labelId = useId();
  const cue = useCue();
  const shown = Math.ceil(remaining / 1000);
  const ticked = useRef(shown);
  // Pause and Resume: a calm crossfade on the switch (story #78); the face itself never jumps.
  const pauseButton = useRef<HTMLButtonElement>(null);
  useMoment(pauseButton, 'calm', paused);

  // In the same commit as the face changing to 3, 2 and 1.
  useLayoutEffect(() => {
    if (shown === ticked.current) return;
    ticked.current = shown;
    if (ticks && !frozen && shown >= 1 && shown <= 3) cue('tick');
  }, [shown, ticks, frozen, cue]);

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
      {/*
        The button's name is exactly the text on it ("45 left"); what is timed is its
        description. Both stay short, so a screen reader says what the keeper sees.
      */}
      <div className="timer">
        <p className="timer-label" id={labelId}>
          {label}
        </p>
        <button type="button" className="timer-face session-control" onClick={tap} aria-describedby={labelId}>
          <span className="timer-time">{mmss(remaining)}</span> <span className="timer-unit">left</span>
        </button>
        {waitingForTap && (
          <p className="timer-hint" role="status">
            Tap the timer to keep going.
          </p>
        )}
      </div>
      <button ref={pauseButton} type="button" className="secondary session-control" onClick={() => {
          tap();
          if (!paused) cue('pause');
          setPaused((p) => !p);
        }}>
        {paused ? 'Resume' : 'Pause'}
      </button>
    </div>
  );
}
