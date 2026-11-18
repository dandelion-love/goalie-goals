// Demo session for tests, shaped like the server's response. Card text follows the repo's
// exercise cards; doses are the cards' own.

import type { Card, Session, Today } from './training';
import type { WeekDayState, WeekView } from './week';

export const PLANK: Card = {
  id: 'plank',
  itemVersion: 'sha256:plank1',
  name: 'Front plank',
  why: 'A strong, stiff middle lets you dive and land without folding.',
  setup: { space: 'A strip of floor about 2 m long.', equipment: 'None.', parent: 'Kneel side-on at hip level.' },
  steps: [
    'Lie face down with your forearms under your shoulders.',
    'Tuck your toes and lift so you rest on forearms and toes.',
    'Make a straight line from head to heels. Squeeze your bottom and tummy to hold it.',
  ],
  cues: ['Stay board-straight', 'Keep breathing', 'Squeeze your bottom'],
  mistakes: [{ mistake: 'Hips sagging toward the floor', fix: 'Squeeze the bottom and tuck the hips a little.' }],
  parentCheck: ['Straight line from shoulder to ankle', 'Hips do not sag or pike', 'Breathing steadily'],
  stopIf: ['Pain in the lower back or shoulders', 'Pain that changes how you move'],
  easier: { variant: 'Plank from the knees.', useWhen: 'The hips sag before the time is up.' },
  dose: { kind: 'hold', sets: 2, seconds: 20, per_side: false, rest_s: 45, tempo: 'still and steady' },
  doseText: '2 sets of 20 s hold, rest 45 s',
  timer: 'interval',
  figureUrl: '/api/training/cards/plank/figure.svg?v=sha256%3Aplank1',
  credit: 'Figure: the goalie-goals contributors, CC BY-SA 4.0, drawn for this repo.',
};

export const BRIDGE: Card = {
  id: 'glute-bridge',
  itemVersion: 'sha256:bridge1',
  name: 'Glute bridge',
  why: 'Strong hips drive every push and dive.',
  setup: { space: 'A mat.', equipment: 'None.', parent: 'Kneel beside the hips.' },
  steps: ['Lie on your back, knees bent.', 'Squeeze, then lift the hips.', 'Lower slowly.'],
  cues: ['Squeeze, then lift', 'Ribs down', 'Push through heels'],
  mistakes: [{ mistake: 'Arching the lower back', fix: 'Keep the ribs down.' }],
  parentCheck: ['Straight line from shoulder to knee at the top', 'Lowers slowly, no drop', 'Knees stay hip width apart'],
  stopIf: ['Pain in the lower back'],
  easier: { variant: 'Smaller lift.', useWhen: 'The back arches.' },
  dose: { kind: 'reps', sets: 2, reps: 12, per_side: false, rest_s: 45, tempo: 'up in one second, hold one, down for three' },
  doseText: '2 sets of 12 reps, rest 45 s',
  timer: 'reps',
  figureUrl: '/api/training/cards/glute-bridge/figure.svg?v=sha256%3Abridge1',
  credit: 'Figure: the goalie-goals contributors, CC BY-SA 4.0, drawn for this repo.',
};

export function demoSession(over: Partial<Session> = {}): Session {
  return {
    itemId: 'session-starter',
    itemVersion: 'sha256:session2',
    title: 'Strong middle',
    minutes: 10,
    warmUp: [
      { name: 'March on the spot', seconds: 60, cue: 'Knees up, arms swing' },
      { name: 'Arm circles', seconds: 45, cue: 'Small circles, then big' },
    ],
    cards: [PLANK, BRIDGE],
    coolDown: [{ name: 'Easy walk and slow breaths', seconds: 60, cue: 'Breathe out slowly' }],
    ...over,
  };
}

export function todayWith(over: Partial<Today> = {}): Today {
  return { date: '2026-01-05', planned: true, today: demoSession(), lastApproved: null, waiting: 0, paused: false, ...over };
}

/**
 * This week as the server sends it (story 114): Mon, Wed and Fri planned with the demo themes,
 * for the week that holds `today`; `todayState` is today's state, `earlier` each earlier
 * planned day's.
 */
export function demoWeek(today = '2026-01-05', todayState: WeekDayState = 'today', earlier: WeekDayState = 'trained'): WeekView {
  const titles = ['Strong middle', null, 'Spring legs', null, 'Quick feet, strong arms', null, null];
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const shift = (date: string, n: number) => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const monday = shift(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7));
  const days = titles.map((title, i) => {
    const date = shift(monday, i);
    const state: WeekDayState = date === today ? todayState : !title ? 'rest' : date < today ? earlier : 'planned';
    return { date, day: names[i], state, isToday: date === today, title };
  });
  const kept = days.filter((d) => d.state === 'trained' || d.state === 'stopped').length;
  const after = days.find((d) => d.date > today && d.title);
  const next = after
    ? { date: after.date, day: after.day, title: after.title! }
    : { date: shift(monday, 7), day: 'Mon', title: 'Strong middle' };
  return { date: today, days, kept, planned: 3, next };
}

/** A fake API for the keeper's home: /api/me, today's session and the approval screens. */
export function keeperServer(
  today: Today | (() => Today),
  /** Today's day kind from the progress summary, by the date the app asks for. */
  dayKind: (date: string) => string | null = () => null,
) {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  const urls: string[] = [];
  const fetchImpl = async (input: RequestInfo | URL) => {
    const url = String(input);
    urls.push(url);
    if (url === '/api/me') return json({ role: 'keeper' });
    if (url.startsWith('/api/training/today')) return json(typeof today === 'function' ? today() : today);
    if (url === '/api/training/approved') return json({ items: [], waiting: 0 });
    if (url === '/api/audit') return json({ events: [] });
    if (url === '/api/history/sessions') return json({ sessions: [] });
    if (url.startsWith('/api/progress/week')) {
      const date = new URL(url, 'http://test').searchParams.get('date') ?? '2026-01-05';
      const kind = dayKind(date);
      return json(demoWeek(date, kind === 'safety_stop' ? 'stopped' : kind ? 'trained' : 'today'));
    }
    if (url.startsWith('/api/progress/summary')) {
      const date = new URL(url, 'http://test').searchParams.get('date') ?? '';
      const streak = { current: 0, best: 0 };
      return json({ date, xp: { total: 0, today: 0 }, team: streak, keeper: streak, parent: streak, today: dayKind(date), runs: [] });
    }
    return json({ error: 'not found' }, 404);
  };
  return { fetchImpl: fetchImpl as unknown as typeof fetch, urls };
}
