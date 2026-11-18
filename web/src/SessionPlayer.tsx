import { useEffect, useMemo, useReducer, useRef, type MutableRefObject, type ReactNode } from 'react';
import { Countdown } from './Countdown';
import type { Layout } from './layout';
import { initialState, reduce, repTarget, stepsOf, stepTitle, type Outcome, type PlayerState, type Step } from './player';
import type { Card, Session, SessionResult } from './training';
import { useWakeLock, type WakeLockController } from './wakeLock';
import { FinishProgressView } from './ProgressPanel';
import type { FinishProgress } from './progress';

export interface SessionPlayerProps {
  session: Session;
  layout: Layout;
  wakeLock: WakeLockController;
  /** Called once when the session ends, however it ends. XP and streaks are recorded from here. */
  onFinish?: (result: SessionResult) => void;
  /** What the finished session earned, once recorded; shown on the finish screen. */
  progress?: FinishProgress | 'saving' | 'unsaved' | null;
  /** Leave the finish screen. */
  onExit: () => void;
}

export const WAKE_FALLBACK_TEXT = 'Screen may dim: tap the timer to keep it awake.';

/** The ~10 minute session: warm-up, each approved card, cool-down, then a finish screen. */
export function SessionPlayer({ session, layout, wakeLock, onFinish, progress, onExit }: SessionPlayerProps) {
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

  useEffect(() => {
    if (!state.outcome || reported.current) return;
    reported.current = true;
    onFinish?.({
      itemId: session.itemId,
      itemVersion: session.itemVersion,
      outcome: state.outcome,
      praised: state.praised,
      setsDone: state.setsDone,
      warmUpLogged: state.warmUpLogged,
      startedAt: startedAt.current,
      endedAt: new Date().toISOString(),
    });
  }, [state.outcome, state.praised, state.setsDone, state.warmUpLogged, session, onFinish]);

  if (state.outcome) {
    return <FinishScreen outcome={state.outcome} praised={state.praised} progress={progress} onExit={onExit} />;
  }

  const step = steps[state.step];
  const needsTaps = wake === 'fallback';
  const next = () => dispatch({ type: 'next' });

  return (
    <section
      className="player"
      data-layout={layout}
      aria-label="Session player"
      onPointerDown={() => {
        lastTap.current = Date.now();
      }}
    >
      <header className="player-bar">
        <div>
          <span className="kind">
            Step {state.step + 1} of {steps.length}
          </span>
          <h1 className="player-title">{stepTitle(step)}</h1>
        </div>
        <div className="player-bar-actions">
          <button type="button" className="danger session-control" onClick={() => dispatch({ type: 'stop', outcome: 'hurt' })}>
            Something hurts
          </button>
          <button type="button" className="secondary session-control" onClick={() => dispatch({ type: 'stop', outcome: 'stopped' })}>
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
        <MovesStep step={step} state={state} needsTaps={needsTaps} lastTap={lastTap} onNext={next} layout={layout} />
      ) : (
        <CardStep
          card={step.card}
          state={state}
          needsTaps={needsTaps}
          lastTap={lastTap}
          layout={layout}
          onNext={next}
          onRep={() => dispatch({ type: 'rep' })}
          onPraise={(cue) => dispatch({ type: 'praise', cue })}
        />
      )}
    </section>
  );
}

function MovesStep({
  step,
  state,
  needsTaps,
  lastTap,
  onNext,
  layout,
}: {
  step: Extract<Step, { kind: 'moves' }>;
  state: PlayerState;
  needsTaps: boolean;
  lastTap: MutableRefObject<number>;
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
              {m.name}, {m.seconds} s
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
  layout,
  onNext,
  onRep,
  onPraise,
}: {
  card: Card;
  state: PlayerState;
  needsTaps: boolean;
  lastTap: MutableRefObject<number>;
  layout: Layout;
  onNext: () => void;
  onRep: () => void;
  onPraise: (cue: string) => void;
}) {
  const p = state.phase;
  const { dose } = card;
  const sideText = dose.per_side && p.kind === 'work' ? `, side ${p.side} of 2` : '';

  let controls: ReactNode = null;
  if (p.kind === 'ready') {
    controls = (
      <button type="button" className="primary session-control wide" onClick={onNext}>
        Start set 1
      </button>
    );
  } else if (p.kind === 'work' && dose.kind === 'hold') {
    controls = (
      <>
        <Countdown
          key={`${state.step}-${p.set}-${p.side}`}
          seconds={dose.seconds ?? 0}
          label={`Hold, set ${p.set} of ${dose.sets}${sideText}`}
          onDone={onNext}
          needsTaps={needsTaps}
          lastTap={lastTap}
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
        <p className="counter" aria-live="polite">
          <span className="counter-label">
            Set {p.set} of {dose.sets}
            {sideText}
          </span>
          <span className="counter-value">
            {p.reps} / {target}
          </span>
          <span className="counter-label">{unit}</span>
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
        <h2>How did set {p.set} look?</h2>
        <p className="meta">Parent: tap a cue that looked good.</p>
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
          onDone={onNext}
          needsTaps={needsTaps}
          lastTap={lastTap}
        />
        <button type="button" className="secondary session-control wide" onClick={onNext}>
          Skip rest
        </button>
      </>
    );
  }

  return (
    <div className={layout === 'expanded' ? 'player-panes' : 'player-stack'}>
      <div className="player-main">
        <figure className="drill-figure">
          <img src={card.figureUrl} alt={`${card.name}: how the move looks`} />
          <figcaption className="credit">{card.credit}</figcaption>
        </figure>
        <p className="dose">
          {card.doseText}
          {dose.tempo ? `. Tempo: ${dose.tempo}.` : '.'}
        </p>
        {controls}
      </div>
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

const FINISH: Record<Outcome, { title: string; body: string }> = {
  done: {
    title: 'Session done',
    body: 'Great work, both of you. That is today done: rest and recovery come next.',
  },
  stopped: {
    title: 'Good call',
    body: 'Stopping when it feels right is part of training: today counts as kept, the same as finishing.',
  },
  hurt: {
    title: 'Good call stopping',
    body:
      'Tell an adult now and rest. After a knock to the head, chest pain, fainting, swelling, ' +
      'or pain that changes how you move, see a health professional before training again. ' +
      'If someone collapses, call the local emergency number.',
  },
};

/** Every ending is a positive one. No "one more?" prompt. */
function FinishScreen({
  outcome,
  praised,
  progress,
  onExit,
}: {
  outcome: Outcome;
  praised: string[];
  progress?: FinishProgress | 'saving' | 'unsaved' | null;
  onExit: () => void;
}) {
  const { title, body } = FINISH[outcome];
  const unique = [...new Set(praised)];
  return (
    <section className="notice finish" aria-labelledby="finish-title">
      <h1 id="finish-title">{title}</h1>
      <p>{body}</p>
      {unique.length > 0 && (
        <>
          <h2>Looked good today</h2>
          <ul className="praised">
            {unique.map((cue) => (
              <li key={cue}>{cue}</li>
            ))}
          </ul>
        </>
      )}
      <FinishProgressView progress={progress} />
      <button type="button" className="primary session-control wide" onClick={onExit}>
        Done for today
      </button>
    </section>
  );
}
