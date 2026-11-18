// Keep the screen awake during a session (front-end Decision; platform note screen-wake-lock).
// Request on Start, keep a "wanted" flag, re-request when the page becomes visible again,
// release at the end. Where the API is missing (a Home Screen app below iPadOS 18.4) or a
// request is refused (for example low battery), the status is `fallback`: the player shows
// "Screen may dim: tap the timer to keep it awake" and its timers ask for a tap at least once
// a minute. No silent-video tricks.

import { useEffect, useState } from 'react';

export type WakeStatus = 'off' | 'active' | 'fallback';

/** The slice of the Screen Wake Lock API used here, so tests can pass a fake. */
export interface WakeLockSentinelLike {
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
}

export interface WakeEnv {
  navigator: { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> } };
  document: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
}

export interface WakeLockController {
  readonly status: WakeStatus;
  acquire(): Promise<WakeStatus>;
  release(): Promise<void>;
  subscribe(listener: (status: WakeStatus) => void): () => void;
}

export function createWakeLock(
  env: WakeEnv = { navigator: navigator as WakeEnv['navigator'], document },
): WakeLockController {
  let status: WakeStatus = 'off';
  let wanted = false;
  let sentinel: WakeLockSentinelLike | null = null;
  const listeners = new Set<(s: WakeStatus) => void>();

  const set = (next: WakeStatus) => {
    if (next === status) return;
    status = next;
    for (const l of listeners) l(status);
  };

  async function request(): Promise<void> {
    const api = env.navigator.wakeLock;
    if (!api) return set('fallback');
    try {
      const s = await api.request('screen');
      if (!wanted) {
        await s.release();
        return;
      }
      sentinel = s;
      s.addEventListener('release', () => {
        if (sentinel === s) sentinel = null;
        // The system releases the lock when the page is hidden; visibility brings it back.
        // A release while visible (low battery, a setting) leaves the fallback in charge.
        if (wanted && env.document.visibilityState === 'visible') set('fallback');
      });
      set('active');
    } catch {
      sentinel = null;
      set('fallback');
    }
  }

  const onVisibility = () => {
    if (wanted && !sentinel && env.document.visibilityState === 'visible') void request();
  };

  return {
    get status() {
      return status;
    },
    async acquire() {
      if (!wanted) {
        wanted = true;
        env.document.addEventListener('visibilitychange', onVisibility);
      }
      if (!sentinel) await request();
      return status;
    },
    async release() {
      wanted = false;
      env.document.removeEventListener('visibilitychange', onVisibility);
      const s = sentinel;
      sentinel = null;
      set('off');
      if (s) {
        try {
          await s.release();
        } catch {
          // Already released by the system.
        }
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Hold the wake lock while `active`; returns the live status for the screen to show. */
export function useWakeLock(active: boolean, controller: WakeLockController): WakeStatus {
  const [status, setStatus] = useState<WakeStatus>(controller.status);
  useEffect(() => controller.subscribe(setStatus), [controller]);
  useEffect(() => {
    if (!active) return;
    void controller.acquire().then(setStatus);
    return () => {
      void controller.release();
    };
  }, [active, controller]);
  return status;
}
