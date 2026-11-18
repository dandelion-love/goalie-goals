import { useEffect, useState } from 'react';
import {
  DAYS_PER_WEEK,
  DaysRefused,
  fetchTrainingDays,
  saveTrainingDays,
  WEEK,
  type TrainingDays as Days,
  type Weekday,
} from './schedule';
import { Skeleton, useSettled } from './Loading';

/**
 * Parent home only: pick the three training days. The themes move with the days; the server
 * refuses back-to-back days and says why. Shows nothing where the plan has no such setting.
 */
export function TrainingDays({
  fetchImpl,
  onChange,
  onSettled,
}: {
  fetchImpl?: typeof fetch;
  onChange?: () => void;
  onSettled?: () => void;
}) {
  const [saved, setSaved] = useState<Days | null>(null);
  const [load, setLoad] = useState<'loading' | 'ready' | 'none'>('loading');
  useSettled(load !== 'loading', onSettled);
  const [chosen, setChosen] = useState<Weekday[]>([]);
  const [message, setMessage] = useState<{ kind: 'alert' | 'status'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    fetchTrainingDays(fetchImpl)
      .then((d) => {
        if (!live) return;
        setSaved(d);
        setChosen(d.days);
        setLoad('ready');
      })
      .catch(() => live && setLoad('none'));
    return () => {
      live = false;
    };
  }, [fetchImpl]);

  // While loading, the card holds its place: the heading, the week of toggles, the themes.
  if (load === 'loading') {
    return (
      <article className="card" aria-labelledby="training-days-title" aria-busy="true">
        <h2 id="training-days-title">Training days</h2>
        <Skeleton lines={6} className="skeleton-days" />
      </article>
    );
  }
  if (!saved) return null;

  const toggle = (day: Weekday) => {
    setMessage(null);
    setChosen((c) => (c.includes(day) ? c.filter((d) => d !== day) : c.length < DAYS_PER_WEEK ? [...c, day] : c));
  };
  const same = chosen.length === saved.days.length && chosen.every((d) => saved.days.includes(d));
  const ready = chosen.length === DAYS_PER_WEEK && !same;

  const save = async () => {
    setBusy(true);
    try {
      const d = await saveTrainingDays(chosen, fetchImpl);
      setSaved(d);
      setChosen(d.days);
      setMessage({ kind: 'status', text: 'Training days saved.' });
      onChange?.();
    } catch (e) {
      setMessage({ kind: 'alert', text: e instanceof DaysRefused ? e.message : "Couldn't save the days. Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="card" aria-labelledby="training-days-title">
      <h2 id="training-days-title">Training days</h2>
      <p>Pick {DAYS_PER_WEEK} days with a rest day between each. The other days are rest.</p>
      <div className="day-toggles" role="group" aria-label="Training days">
        {WEEK.map(({ day, name }) => (
          <button
            key={day}
            type="button"
            className="day-toggle"
            aria-pressed={chosen.includes(day)}
            disabled={busy}
            onClick={() => toggle(day)}
          >
            {name}
          </button>
        ))}
      </div>
      <ul className="themes">
        {saved.themes.map((t) => (
          <li key={t.day}>
            {t.name}: {t.title}
          </li>
        ))}
      </ul>
      {message && <p role={message.kind}>{message.text}</p>}
      <button type="button" className="primary" disabled={!ready || busy} onClick={() => void save()}>
        Save days
      </button>
    </article>
  );
}
