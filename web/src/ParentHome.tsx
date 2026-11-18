import { memo, startTransition, useCallback, useRef, useState } from 'react';
import type { Layout } from './layout';
import { History as HistoryPanel, ParentInbox as InboxPanel } from './ApprovalScreens';
import { ProgressPanel as ProgressPanelBody } from './ProgressPanel';
import { SessionHistory as SessionHistoryPanel } from './SessionHistory';
import { TrainingDays as TrainingDaysPanel } from './TrainingDays';
import { Reveal } from './Loading';
import { useMoment } from './motion';

// The parent's home, in its own chunk (story 101 AC2): the keeper's device never loads it.

// A panel draws again only when its own props change (story 101 AC1): an answer in the inbox
// doesn't re-render the other panels in the tap's frame.
const ProgressPanel = memo(ProgressPanelBody);
const TrainingDays = memo(TrainingDaysPanel);
const ParentInbox = memo(InboxPanel);
const History = memo(HistoryPanel);
const SessionHistory = memo(SessionHistoryPanel);

export function ParentHome({ layout, fetchImpl, epoch = 0 }: { layout: Layout; fetchImpl?: typeof fetch; epoch?: number }) {
  // Answering a request, or undoing an approval, adds to the history and changes the inbox,
  // so both reload after each.
  const [answered, setAnswered] = useState(0);
  const [settled, setSettled] = useState({ progress: false, sessions: false, days: false, inbox: false });
  const onProgress = useCallback(() => setSettled((s) => ({ ...s, progress: true })), []);
  const onSessions = useCallback(() => setSettled((s) => ({ ...s, sessions: true })), []);
  const onDays = useCallback(() => setSettled((s) => ({ ...s, days: true })), []);
  const onInbox = useCallback(() => setSettled((s) => ({ ...s, inbox: true })), []);
  // The reload after an answer is a transition (story 101 AC1): the panels it refreshes never
  // hold the frame that shows the answer.
  const changed = useCallback(() => startTransition(() => setAnswered((n) => n + 1)), []);
  // An approval leaving the inbox (approved, declined, or undone back into it): what is left
  // settles, in the same commit as the inbox's new list (story #78).
  const [inboxChanges, setInboxChanges] = useState(0);
  const inboxChanged = useCallback(() => {
    setInboxChanges((n) => n + 1);
    changed();
  }, [changed]);
  const inbox = useRef<HTMLDivElement>(null);
  useMoment(() => inbox.current?.firstElementChild ?? null, 'approval-left', inboxChanges);
  // Each panel shows once every panel above it has settled (story #80 AC1).
  const sessionsOpen = settled.progress;
  const daysOpen = sessionsOpen && settled.sessions;
  const inboxOpen = daysOpen && settled.days;
  const historyOpen = inboxOpen && settled.inbox;
  return (
    <section className="home" aria-labelledby="home-title">
      <h1 id="home-title">Parent home</h1>
      <ProgressPanel fetchImpl={fetchImpl} refresh={answered + epoch} onSettled={onProgress} />
      {/* Recent sessions (story 113): their own panel, apart from the approvals history. */}
      <Reveal open={sessionsOpen}>
        <SessionHistory fetchImpl={fetchImpl} refresh={answered + epoch} onSettled={onSessions} />
      </Reveal>
      <Reveal open={daysOpen}>
        <TrainingDays fetchImpl={fetchImpl} onChange={changed} onSettled={onDays} />
      </Reveal>
      <Reveal open={inboxOpen}>
        <div className={layout === 'expanded' ? 'panes' : 'stack'}>
          <div ref={inbox} className="inbox-pane">
            <ParentInbox fetchImpl={fetchImpl} onChange={inboxChanged} refresh={answered + epoch} onSettled={onInbox} />
          </div>
          <Reveal open={historyOpen}>
            <History fetchImpl={fetchImpl} refresh={answered + epoch} onChange={changed} />
          </Reveal>
        </div>
      </Reveal>
    </section>
  );
}
