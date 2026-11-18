// What the app keeps on the device so it still opens offline (front-end Decision, PWA scope).
//
// Only what that Decision allows: today's approved session and the signed-in role, which picks
// the home to show. The pause and its outbox live in pain.ts; queued session starts and finishes
// in outbox.ts, each deleted once the server confirms it; the figures of today's approved cards
// in figures.ts. History, the audit log, the inbox and progress always come from the network and
// are never stored here.

import { useEffect, useState } from 'react';
import type { Role } from './api';
import type { Today } from './training';

export interface OfflineStore {
  readRole(): Role | null;
  writeRole(role: Role | null): void;
  /** Today's approved session as last sent by the server, only for the keeper's `date`. */
  readToday(date: string): Today | null;
  writeToday(today: Today): void;
  /** Forget today's session: the parent started fresh (story 121). */
  clearToday(): void;
}

export const ROLE_KEY = 'goalie-goals.role';
export const TODAY_KEY = 'goalie-goals.today';

function isToday(value: unknown): value is Today {
  const t = value as Today | null;
  return !!t && typeof t.date === 'string' && typeof t.planned === 'boolean' && typeof t.paused === 'boolean';
}

/** localStorage, with an in-memory copy when storage is blocked or full. */
export class LocalOfflineStore implements OfflineStore {
  private role: Role | null = null;
  private today: Today | null = null;

  constructor(private readonly storage: Storage | null = typeof localStorage === 'undefined' ? null : localStorage) {}

  readRole(): Role | null {
    try {
      const raw = this.storage?.getItem(ROLE_KEY);
      if (raw === 'keeper' || raw === 'parent') return raw;
    } catch {
      // Fall back to the in-memory copy.
    }
    return this.role;
  }

  writeRole(role: Role | null): void {
    this.role = role;
    try {
      if (role) this.storage?.setItem(ROLE_KEY, role);
      else this.storage?.removeItem(ROLE_KEY);
    } catch {
      // The in-memory copy holds for this session.
    }
  }

  readToday(date: string): Today | null {
    let today = this.today;
    try {
      const raw = this.storage?.getItem(TODAY_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isToday(parsed)) today = parsed;
      }
    } catch {
      // Fall back to the in-memory copy.
    }
    return today && today.date === date ? today : null;
  }

  writeToday(today: Today): void {
    // Approved versions only: fetchToday has already dropped anything the server did not send
    // as approved, and nothing is offered while paused.
    const kept: Today = {
      date: today.date,
      planned: today.planned,
      today: today.today,
      lastApproved: today.lastApproved,
      waiting: today.waiting,
      paused: today.paused,
    };
    this.today = kept;
    try {
      this.storage?.setItem(TODAY_KEY, JSON.stringify(kept));
    } catch {
      // The in-memory copy holds for this session.
    }
  }

  clearToday(): void {
    this.today = null;
    try {
      this.storage?.removeItem(TODAY_KEY);
    } catch {
      // Nothing more to do.
    }
  }
}

export class MemoryOfflineStore implements OfflineStore {
  constructor(
    public role: Role | null = null,
    public today: Today | null = null,
  ) {}
  readRole() {
    return this.role;
  }
  writeRole(role: Role | null) {
    this.role = role;
  }
  readToday(date: string) {
    return this.today && this.today.date === date ? this.today : null;
  }
  writeToday(today: Today) {
    this.today = today;
  }
  clearToday() {
    this.today = null;
  }
}

/** The browser's own online flag, kept current. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
