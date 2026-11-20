import { startTransition, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type MutableRefObject, type ReactNode, type RefObject } from 'react';
import { Countdown } from './Countdown';
import type { Layout } from './layout';
import {
  cueForSet,
  initialState,
  minutesLeftText,
  reduce,
  secondsLeft,
  repTarget,
  STOP_UNDO_MS,
  stepsOf,
  stepTitle,
  type Outcome,
  type PlayerState,
  type Step,
} from './player';
import type { Card, Session, SessionResult } from './training';
import { useWakeLock, type WakeLockController } from './wakeLock';
import { FinishProgressView } from './ProgressPanel';
import { SEE_SOMEONE } from './PainScreens';
import type { FinishProgressState } from './progress';
import { CueContext, usePlayerSound, useStateCues } from './sound';
import { loadRewards, play, Reward } from './motion';
import { celebrate, preloadCelebration } from './celebrate';
import { afterPaint } from './defer';
import { DossierToggle } from './DossierScreens';

export interface SessionPlayerProps {
  session: Session;
  layout: Layout;
  wakeLock: WakeLockController;
  /** Called once when the session ends, however it ends. XP and streaks are recorded from here. */
  onFinish?: (result: SessionResult) => void;
  /**
   * Stop was tapped: the session as it would end now, so the app can keep it on the device
   * while Resume is offered (it survives the app closing). `onFinish` still follows when the
   * Resume window closes.
   */
  onStop?: (result: SessionResult) => void;
  /** Resume was tapped: the stop kept by `onStop` no longer applies. */
  onResume?: () => void;
  /** What the finished session earned, once recorded; shown on the finish screen. */
  progress?: FinishProgressState;
  /** Shown on the finish screen after "Something hurts": the pain report form. */
  hurtForm?: ReactNode;
  /** Leave the finish screen. */
  onExit: () => void;
}

/** The figure is version-bound. A fragment requests motion; the same approved SVG holds stills. */
function DrillFigure({ card }: { card: Card }) {
  const [reduced, setReduced] = useState(() =>
    typeof matchMedia !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => setFailed(false), [card.figureUrl]);
  const src = card.id === 'wall-push-up' && !reduced ? `${card.figureUrl}#motion` : card.figureUrl;
  return (
    <figure className="drill-figure">
      {failed ? <p role="status">Picture unavailable. Follow the steps below.</p> :
        <img src={src} alt={`${card.name}: how the move looks`} onError={() => setFailed(true)} />}
      <figcaption className="credit">{card.credit}</figcaption>
    </figure>
  );
}

export const WAKE_FALLBACK_TEXT = 'Screen may dim: tap the timer to keep it awake.';

/** The ~10 minute session: warm-up, each approved card, cool-down, then a finish screen. */
export function SessionPlayer({
  session,
  layout,
  wakeLock,
  onFinish,
  onStop,
  onResume,
  progress,
  hurtForm,
  onExit,
}: SessionPlayerProps) {
  const steps = useMemo(() => stepsOf(session), [session]);
  const [state, dispatch] = useReducer(
    (s: PlayerState, a: Parameters<typeof reduce>[2]) => reduce(steps, s, a),
    steps,
    initialState,
  );
  const startedAt = useRef(new Date().toISOString());
  const lastTap = useRef(Date.now());
  const wake = useWakeLock(state.outcome === null, wakeLock);
  const reported = useRef(false);
  const { muted, setMuted, cue, unlock } = usePlayerSound();
  useStateCues(state, cue);
  // After the cue, in the same commit: the motion for the moment the change marks.
  const playerRef = useRef<HTMLElement>(null);
  useStateMotion(state, playerRef);
  // The finish's confetti and Motion load while the session runs, so the finish never waits.
  useEffect(() => {
    void preloadCelebration();
    void loadRewards();
  }, []);
  const soundToggle = <SoundToggle muted={muted} onChange={setMuted} />;

  const resultOf = (outcome: Outcome): SessionResult => ({
    itemId: session.itemId,
    itemVersion: session.itemVersion,
    outcome,
    praised: state.praised,
    setsDone: state.setsDone,
    warmUpLogged: state.warmUpLogged,
    startedAt: startedAt.current,
    endedAt: new Date().toISOString(),
    cards: state.cards.map((c) => ({ ...c, cues: [...c.cues] })),
  });
  const report = (outcome: Outcome) => {
    if (reported.current) return;
    reported.current = true;
    onFinish?.(resultOf(outcome));
  };
  const reportRef = useRef(report);
  reportRef.current = report;

  useEffect(() => {
    if (state.outcome) reportRef.current(state.outcome);
  }, [state.outcome]);

  // Stop has ended the set; Resume is offered for STOP_UNDO_MS, then the session is over.
  useEffect(() => {
    if (!state.stopping) return;
    const id = setTimeout(() => dispatch({ type: 'stop-final' }), STOP_UNDO_MS);
    return () => clearTimeout(id);
  }, [state.stopping]);

  if (state.outcome) {
    return (
      <FinishScreen
        outcome={state.outcome}
        praised={state.praised}
        progress={progress}
        hurtForm={hurtForm}
        soundToggle={soundToggle}
        onExit={onExit}
        // Done is the one celebration. A stop or "Something hurts" gets a calm crossfade; the
        // Resume window closing changes nothing on screen, so nothing moves.
        enter={state.outcome === 'done' ? 'celebrate' : state.outcome === 'hurt' ? 'calm' : 'none'}
      />
    );
  }

  const step = steps[state.step];
  // The steps not finished yet, this one included: it updates as each step finishes.
  const left = secondsLeft(steps, state.step);
  const needsTaps = wake === 'fallback';
  const frozen = state.stopping;
  // Moving on (the next move, a set's start or end, a rest skipped, the finish) is a transition
  // (story #98 AC5): the tap paints its response at once, and the new step, with its cue and
  // motion, follows in the next frames. Stop and "Something hurts" stay urgent.
  const next = () => startTransition(() => dispatch({ type: 'next' }));

  const player = (
    <>
      {state.stopping && (
        <FinishScreen
          outcome="stopped"
          praised={state.praised}
          soundToggle={soundToggle}
          enter="calm"
          onResume={() => {
            lastTap.current = Date.now();
            dispatch({ type: 'resume' });
            onResume?.();
          }}
          onExit={() => {
            // Leaving during the Resume window: the session is over now.
            report('stopped');
            onExit();
          }}
        />
      )}
      {/* Kept mounted while the stop screen shows, so Resume brings back the same set and timer. */}
      <section
        ref={playerRef}
        className="player"
        data-layout={layout}
        aria-label="Session player"
        hidden={state.stopping}
        onPointerDown={(e) => {
          lastTap.current = Date.now();
          // Any tap can bring sound back after the iPad suspended it (the app was hidden). It only
          // resumes the context, never makes it (story 103). Not "Something hurts" or Stop: a
          // safety tap never touches audio.
          if (e.target instanceof Element && e.target.closest('.safety-control')) return;
          unlock();
        }}
      >
        <header className="player-bar">
          <div className="player-step">
            {/* Story 120: minutes left beside the step count, on its line in the left column, so
                the safety controls on the right keep their place and size. */}
            <p className="player-progress">
              <span className="kind">
                Step {state.step + 1} of {steps.length}
              </span>
              {left !== null && <span className="player-left">{minutesLeftText(left)}</span>}
            </p>
            <h1 className="player-title">{stepTitle(step)}</h1>
          </div>
          <div className="player-bar-actions">
            {soundToggle}
            {/* The safety controls are never a transition or deferred (story 101 AC4): the
                session ends, and the pause is written on the device, in the tap's own task. */}
            <button
              type="button"
              className="danger session-control safety-control"
              onClick={() => {
                dispatch({ type: 'stop', outcome: 'hurt' });
                report('hurt');
              }}
            >
              Something hurts
            </button>
            <button
              type="button"
              className="secondary session-control safety-control"
              onClick={() => {
                dispatch({ type: 'stop', outcome: 'stopped' });
                onStop?.(resultOf('stopped'));
              }}
            >
              Stop
            </button>
          </div>
        </header>

        {needsTaps && (
          <p className="wake-notice" role="status">
            {WAKE_FALLBACK_TEXT}
          </p>
        )}
        {state.feedback && (
          <p className="feedback" role="status" aria-live="polite">
            {state.feedback}
          </p>
        )}

        {step.kind === 'moves' ? (
          <MovesStep step={step} state={state} needsTaps={needsTaps} lastTap={lastTap} frozen={frozen} onNext={next} layout={layout} />
        ) : (
          <CardStep
            card={step.card}
            state={state}
            needsTaps={needsTaps}
            lastTap={lastTap}
            frozen={frozen}
            layout={layout}
            onNext={next}
            onRep={() => dispatch({ type: 'rep' })}
            onPraise={(cue) => dispatch({ type: 'praise', cue })}
          />
        )}
      </section>
    </>
  );
  // The countdowns inside play the rest ticks and the pause through the same cue function.
  return <CueContext.Provider value={cue}>{player}</CueContext.Provider>;
}

/** The sound on/off switch: a 56 px+ button; its state is shown in words and as pressed. */
function SoundToggle({ muted, onChange }: { muted: boolean; onChange: (muted: boolean) => void }) {
  return (
    <button type="button" className="secondary session-control sound-toggle" aria-pressed={!muted} onClick={() => onChange(!muted)}>
      Sound<span aria-hidden="true">: {muted ? 'off' : 'on'}</span>
    </button>
  );
}

function MovesStep({
  step,
  state,
  needsTaps,
  lastTap,
  frozen,
  onNext,
  layout,
}: {
  step: Extract<Step, { kind: 'moves' }>;
  state: PlayerState;
  needsTaps: boolean;
  lastTap: MutableRefObject<number>;
  frozen: boolean;
  onNext: () => void;
  layout: Layout;
}) {
  const index = state.phase.kind === 'move' ? state.phase.index : 0;
  const move = step.moves[index];
  return (
    <div className={layout === 'expanded' ? 'player-panes' : 'player-stack'}>
      <div className="player-main">
        <h2 className="move-name">{move.name}</h2>
        <p className="cue-line">{move.cue}</p>
        <Countdown
          key={`${state.step}-${index}`}
          seconds={move.seconds}
          label={move.name}
          onDone={onNext}
          needsTaps={needsTaps}
          lastTap={lastTap}
          frozen={frozen}
        />
        <button type="button" className="primary session-control wide" onClick={onNext}>
          Next
        </button>
      </div>
      <div className="player-side">
        <h2>{step.label}</h2>
        <ol className="move-list">
          {step.moves.map((m, i) => (
            <li key={m.name} aria-current={i === index ? 'step' : undefined} className={i < index ? 'done' : undefined}>
              {`${m.name}, ${m.seconds} s`}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function CardStep({
  card,
  state,
  needsTaps,
  lastTap,
  frozen,
  layout,
  onNext,
  onRep,
  onPraise,
}: {
  card: Card;
  state: PlayerState;
  needsTaps: boolean;
  lastTap: MutableRefObject<number>;
  frozen: boolean;
  layout: Layout;
  onNext: () => void;
  onRep: () => void;
  onPraise: (cue: string) => void;
}) {
  const p = state.phase;
  const { dose } = card;
  const sideText = dose.per_side && p.kind === 'work' ? `, side ${p.side} of 2` : '';
  // Story 112 AC2: the set's one cue, large, right above its timer or counter.
  const cue = p.kind === 'work' ? cueForSet(card, p.set) : null;
  const setCue = cue && (
    <p className="set-cue" aria-live="polite">
      <span className="sr-only">Cue: </span>
      {cue}
    </p>
  );

  let controls: ReactNode = null;
  if (p.kind === 'ready') {
    // Start stays first, where it always was, so the intro below it never pushes it out of view.
    controls = (
      <>
        <button type="button" className="primary session-control wide" onClick={onNext}>
          Start set 1
        </button>
        <CardIntro card={card} />
      </>
    );
  } else if (p.kind === 'work' && dose.kind === 'hold') {
    controls = (
      <>
        {setCue}
        <Countdown
          key={`${state.step}-${p.set}-${p.side}`}
          seconds={dose.seconds ?? 0}
          label={`Hold, set ${p.set} of ${dose.sets}${sideText}`}
          onDone={onNext}
          needsTaps={needsTaps}
          lastTap={lastTap}
          frozen={frozen}
        />
        <button type="button" className="secondary session-control wide" onClick={onNext}>
          End set
        </button>
      </>
    );
  } else if (p.kind === 'work') {
    const target = repTarget(card);
    const unit = dose.kind === 'efforts' ? 'efforts' : dose.kind === 'contacts' ? 'contacts' : 'reps';
    controls = (
      <>
        {setCue}
        <p className="counter" aria-live="polite">
          <span className="counter-label">
            Set {p.set} of {dose.sets}
            {sideText}
          </span>
          <span className="sr-only">,</span>{' '}
          <span className="counter-value">{Math.max(0, target - p.reps)}</span>{' '}
          <span className="counter-label">{unit} left</span>
        </p>
        <div className="actions">
          <button type="button" className="primary session-control" onClick={onRep} disabled={p.reps >= target}>
            +1
          </button>
          <button type="button" className="secondary session-control" onClick={onNext}>
            Set done
          </button>
        </div>
      </>
    );
  } else if (p.kind === 'feedback') {
    controls = (
      <div className="feedback-ask">
        <h2>
          <svg className="set-check" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} />
          </svg>
          How did set {p.set} look?
        </h2>
        <p className="meta">Parent: tap a cue that looked good.</p>
        <ParentChecks card={card} />
        <div className="cue-buttons">
          {card.cues.map((cue) => (
            <button key={cue} type="button" className="primary session-control" onClick={() => onPraise(cue)}>
              {cue}
            </button>
          ))}
          <button type="button" className="secondary session-control" onClick={onNext}>
            Skip
          </button>
        </div>
      </div>
    );
  } else if (p.kind === 'rest') {
    controls = (
      <>
        <Countdown
          key={`${state.step}-rest-${p.set}`}
          seconds={dose.rest_s}
          label="Rest"
          ticks
          onDone={onNext}
          needsTaps={needsTaps}
          lastTap={lastTap}
          frozen={frozen}
        />
        <button type="button" className="secondary session-control wide" onClick={onNext}>
          Skip rest
        </button>
      </>
    );
  }

  // The timer or counter and the next action sit in their own block: below the drill in
  // portrait, and at the top of the right-hand column in landscape, so both stay in view.
  return (
    <div className={layout === 'expanded' ? 'player-panes card-panes' : 'player-stack'}>
      <div className="player-main">
        <DrillFigure card={card} />
        <p className="dose">{`${card.doseText}${dose.tempo ? `. Tempo: ${dose.tempo}.` : '.'}`}</p>
      </div>
      <div className="player-controls">{controls}</div>
      <div className="player-side">
        <h2>Steps</h2>
        <ol>
          {card.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <h2>Cues</h2>
        <ul>
          {card.cues.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <h2>Common mistakes</h2>
        <ul className="mistakes">
          {card.mistakes.map((m) => (
            <li key={m.mistake}>
              <strong>{m.mistake}</strong>: {m.fix}
            </li>
          ))}
        </ul>
        <h2>Stop if</h2>
        <ul>
          {card.stopIf.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="meta">
          Easier: {card.easier.variant} ({card.easier.useWhen})
        </p>
        <p className="meta">Sets done this session: {state.setsDone}</p>
      </div>
    </div>
  );
}

/** The setup lines a card may hold, in the order the parent sets up, with short labels. */
const SETUP_LINES: { key: string; label: string }[] = [
  { key: 'space', label: 'Space' },
  { key: 'equipment', label: 'Gear' },
  { key: 'surface_note', label: 'Surface' },
  { key: 'parent', label: 'Position' },
];

/**
 * Before set 1 (story 112 AC1): how to set up, why the move helps and what the parent watches
 * for, all from the card. Compact, below Start, so Start keeps its place on the iPad.
 */
function CardIntro({ card }: { card: Card }) {
  const lines = SETUP_LINES.filter(({ key }) => card.setup[key]?.trim());
  return (
    <section className="card-intro" aria-labelledby="card-intro-title">
      <h2 id="card-intro-title">For the parent</h2>
      <dl className="card-setup">
        {lines.map(({ key, label }) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>{card.setup[key]}</dd>
          </div>
        ))}
        <div>
          <dt>Why</dt>
          <dd>{card.why}</dd>
        </div>
      </dl>
      <ParentChecks card={card} />
      {/* Story 115: the card's approved dossier opens here, before set 1. */}
      {card.dossier && <DossierToggle dossier={card.dossier} />}
    </section>
  );
}

/**
 * The card's parent checks (story 112): what to watch in a set, shown before set 1 and beside the
 * cue buttons when rating form. A list to read, not buttons: the parent still rates by cue, so a
 * rating stays one of the card's cues.
 */
function ParentChecks({ card }: { card: Card }) {
  if (!card.parentCheck.length) return null;
  return (
    <div className="parent-checks">
      <h3>Watch for</h3>
      <ul>
        {card.parentCheck.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </div>
  );
}

const FINISH: Record<Outcome, { title: string; body: string }> = {
  done: {
    title: 'Session done',
    body: 'Every set is logged. Rest and recovery come next.',
  },
  stopped: {
    title: 'Good call',
    body: 'Stopping when it feels right is part of training: today counts as kept, the same as finishing.',
  },
  hurt: {
    title: 'Good call stopping',
    body: `Tell an adult now and rest. ${SEE_SOMEONE} If someone collapses, call the local emergency number.`,
  },
};

export const RESUME_TEXT = `Tapped Stop by mistake? Resume within ${STOP_UNDO_MS / 1000} seconds.`;

/**
 * The motion for each change of player state (story #78), played right after the cue in the
 * same commit. The rubric's moments in the session: a set logged, a form cue rated, a step
 * advanced on the path, and rest starting. Nothing here fires during a set: only the countdown
 * moves then.
 */
function useStateMotion(state: PlayerState, root: RefObject<HTMLElement | null>): void {
  const prev = useRef<PlayerState | null>(null);
  useLayoutEffect(() => {
    const before = prev.current;
    prev.current = state;
    if (!before || before === state || state.outcome || state.stopping || before.stopping) return;
    const el = root.current;
    if (!el) return;
    const find = (selector: string) => el.querySelector(selector);
    const a = before.phase;
    const b = state.phase;
    if (state.step !== before.step) play(find('.player-step'), 'step-advanced');
    else if (a.kind === 'move' && b.kind === 'move' && a.index !== b.index) play(find('.move-name'), 'step-advanced');
    if (b.kind === 'feedback' && a.kind === 'work') {
      play(find('.feedback-ask'), 'set-logged');
      play(find('.set-check path'), 'check-drawn');
    }
    if (state.praised.length > before.praised.length) play(find('.feedback'), 'cue-rated');
    if (b.kind === 'rest' && a.kind !== 'rest') play(find('.player-controls'), 'rest-started');
  }, [state, root]);
}

/**
 * Every ending is a positive one. No "one more?" prompt. Straight after Stop, the same screen
 * also offers Resume (`onResume`) until the Resume window closes.
 */
function FinishScreen({
  outcome,
  praised,
  progress,
  hurtForm,
  soundToggle,
  onResume,
  onExit,
  enter = 'none',
}: {
  enter?: 'celebrate' | 'calm' | 'none';
  outcome: Outcome;
  praised: string[];
  progress?: FinishProgressState;
  hurtForm?: ReactNode;
  soundToggle?: ReactNode;
  onResume?: () => void;
  onExit: () => void;
}) {
  const { title, body } = FINISH[outcome];
  const unique = [...new Set(praised)];
  // "Something hurts" (story 105): the tap's own frame is the card and the pain report form,
  // "Tapped by mistake" included. The rest of the screen (the praise, the XP line, the sound
  // switch and "Done for today") follows after that paint, so the safety tap stays the quickest.
  const [rest, setRest] = useState(outcome !== 'hurt');
  useEffect(() => {
    if (!rest) afterPaint(() => startTransition(() => setRest(true)));
  }, [rest]);
  const resume = useRef<HTMLButtonElement>(null);
  const canResume = !!onResume;
  // Stop was tapped and is gone from the screen: focus Resume, the one way to undo it.
  useEffect(() => {
    if (canResume) resume.current?.focus();
  }, [canResume]);
  // Story #78: the summary card enters and one confetti burst plays when the session is done;
  // a stop crossfades in calmly. "Done for today" works at once either way.
  const card = useRef<HTMLElement>(null);
  const fired = useRef(false);
  useLayoutEffect(() => {
    if (enter === 'calm') play(card.current, 'calm');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (enter !== 'celebrate' || fired.current) return;
    // In a task of its own after the finish screen's (story #98), so the burst never adds to
    // the long task that renders the card; skipped if the shapes are not ready by then.
    const id = setTimeout(() => {
      fired.current = true;
      celebrate();
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Reward as="section" kind="card" on={enter === 'celebrate'} ref={card} className="notice finish" aria-labelledby="finish-title">
      <h1 id="finish-title">{title}</h1>
      <p>{body}</p>
      {onResume && (
        <>
          <p className="meta">{RESUME_TEXT}</p>
          <button ref={resume} type="button" className="secondary session-control wide" onClick={onResume}>
            Resume
          </button>
        </>
      )}
      {outcome === 'hurt' && hurtForm}
      {rest && unique.length > 0 && (
        <>
          <h2>Looked good today</h2>
          <ul className="praised">
            {unique.map((cue) => (
              <li key={cue}>{cue}</li>
            ))}
          </ul>
        </>
      )}
      {rest && (
        <>
          <FinishProgressView progress={progress} celebrate={enter === 'celebrate'} />
          {soundToggle}
          <button type="button" className="primary session-control wide" onClick={onExit}>
            Done for today
          </button>
        </>
      )}
    </Reward>
  );
}
