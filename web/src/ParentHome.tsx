import { memo, startTransition, useCallback, useRef, useState } from 'react';
import type { Layout } from './layout';
import { History as HistoryPanel, ParentInbox as InboxPanel } from './ApprovalScreens';
import { ProgressPanel as ProgressPanelBody } from './ProgressPanel';
import { SessionHistory as SessionHistoryPanel } from './SessionHistory';
import { TrainingDays as TrainingDaysPanel } from './TrainingDays';
import { WeekPanel as WeekPanelBody } from './WeekPanel';
import { StartFresh } from './StartFresh';
import { Reveal } from './Loading';
import { useMoment } from './motion';
import { EquipmentCatalog } from './EquipmentCatalog';
import { ProgressionLibrary } from './ProgressionLibrary';
import { RoleShell, useDestination } from './RoleShell';
import { Button } from './Interface';

const PARENT_DESTINATIONS = [{ id: 'inbox', label: 'Inbox' }, { id: 'plan', label: 'Plan' }, { id: 'progress', label: 'Progress' }, { id: 'equipment', label: 'Equipment' }, { id: 'tree', label: 'Progression' }, { id: 'settings', label: 'Reset' }] as const;

// The parent's home, in its own chunk (story 101 AC2): the keeper's device never loads it.

// A panel draws again only when its own props change (story 101 AC1): an answer in the inbox
// doesn't re-render the other panels in the tap's frame.
const ProgressPanel = memo(ProgressPanelBody);
const TrainingDays = memo(TrainingDaysPanel);
const ParentInbox = memo(InboxPanel);
const History = memo(HistoryPanel);
const SessionHistory = memo(SessionHistoryPanel);
const WeekPanel = memo(WeekPanelBody);

export function ParentHome({ layout, fetchImpl, epoch = 0 }: { layout: Layout; fetchImpl?: typeof fetch; epoch?: number }) {
  const { current: destination, navigate, navigation, content } = useDestination(PARENT_DESTINATIONS, 'progress');
  const [inboxSummary, setInboxSummary] = useState({ badge: 0, urgent: false });
  const onInboxSummary = useCallback((badge: number, urgent: boolean) => setInboxSummary((old) => old.badge === badge && old.urgent === urgent ? old : { badge, urgent }), []);
  // Answering a request, or undoing an approval, adds to the history and changes the inbox,
  // so both reload after each.
  const [answered, setAnswered] = useState(0);
  const [settled, setSettled] = useState({ progress: false, week: false, sessions: false, days: false, inbox: false });
  const onProgress = useCallback(() => setSettled((s) => ({ ...s, progress: true })), []);
  const onWeek = useCallback(() => setSettled((s) => ({ ...s, week: true })), []);
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
  const weekOpen = settled.progress;
  const sessionsOpen = weekOpen && settled.week;
  const daysOpen = sessionsOpen && settled.sessions;
  const inboxOpen = daysOpen && settled.days;
  const historyOpen = inboxOpen && settled.inbox;
  return (
    <RoleShell title="Parent home" destinations={PARENT_DESTINATIONS.map((item) => item.id === 'inbox' ? { ...item, title: 'Inbox', label: `Inbox${inboxSummary.badge ? ` (${inboxSummary.badge})` : ''}${inboxSummary.urgent ? ' urgent' : ''}` } : item)} current={destination} navigate={navigate} navigation={navigation} content={content}>
      <div hidden={destination !== 'progress'}>
      {(inboxSummary.badge > 0 || inboxSummary.urgent) && <Button variant="primary" onClick={() => navigate('inbox')}>{inboxSummary.urgent ? 'Review urgent inbox' : `Review ${inboxSummary.badge} waiting ${inboxSummary.badge === 1 ? 'request' : 'requests'}`}</Button>}
      <ProgressPanel fetchImpl={fetchImpl} refresh={answered + epoch} onSettled={onProgress} />
      </div>
      {/* This week (story 114): the days the parent set, each in its state, and what comes next. */}
      <div hidden={destination !== 'plan'}>
      <Reveal open={weekOpen}>
        <WeekPanel fetchImpl={fetchImpl} refresh={answered + epoch} onSettled={onWeek} />
      </Reveal>
      </div>
      {/* Recent sessions (story 113): their own panel, apart from the approvals history. */}
      <div hidden={destination !== 'progress'}>
      <Reveal open={sessionsOpen}>
        <SessionHistory parent fetchImpl={fetchImpl} refresh={answered + epoch} onSettled={onSessions} />
      </Reveal>
      </div>
      <div hidden={destination !== 'plan'}>
      <Reveal open={daysOpen}>
        <TrainingDays fetchImpl={fetchImpl} onChange={changed} onSettled={onDays} />
        <Button onClick={() => navigate('equipment')}>Equipment</Button>
      </Reveal>
      </div>
      {destination === 'equipment' && <EquipmentCatalog fetchImpl={fetchImpl} onChange={changed} />}
      {destination === 'tree' && <ProgressionLibrary fetchImpl={fetchImpl} refresh={answered + epoch} />}
      <Reveal open={inboxOpen}>
          <div ref={inbox} className="inbox-pane" hidden={destination !== 'inbox'}>
            <ParentInbox layout={layout} fetchImpl={fetchImpl} onChange={inboxChanged} refresh={answered + epoch} onSettled={onInbox} onSummary={onInboxSummary} onGoPlan={() => navigate('plan')} />
          </div>
          <div hidden={destination !== 'progress'}>
          <Reveal open={historyOpen}>
            <History fetchImpl={fetchImpl} refresh={answered + epoch} onChange={changed} />
          </Reveal>
          </div>
      </Reveal>
      {/* Story 121: at the very bottom, far from Approve and Clear the pause. */}
      <div hidden={destination !== 'settings'}>
      <Reveal open={historyOpen}>
        <StartFresh fetchImpl={fetchImpl} onDone={changed} />
      </Reveal>
      </div>
    </RoleShell>
  );
}
