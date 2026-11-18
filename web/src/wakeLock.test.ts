import { describe, expect, it, vi } from 'vitest';
import { createWakeLock, type WakeEnv, type WakeLockSentinelLike } from './wakeLock';

class FakeSentinel implements WakeLockSentinelLike {
  released = false;
  private listeners: (() => void)[] = [];
  addEventListener(_type: 'release', listener: () => void) {
    this.listeners.push(listener);
  }
  async release() {
    this.released = true;
  }
  /** The system takes the lock back (page hidden, low battery). */
  systemRelease() {
    this.released = true;
    for (const l of this.listeners) l();
  }
}

function fakeEnv(api: 'supported' | 'missing' | 'rejects') {
  const sentinels: FakeSentinel[] = [];
  const handlers = new Set<() => void>();
  const doc = {
    visibilityState: 'visible' as DocumentVisibilityState,
    addEventListener: (_: string, h: () => void) => handlers.add(h),
    removeEventListener: (_: string, h: () => void) => handlers.delete(h),
  };
  const request = vi.fn(async () => {
    if (api === 'rejects') throw new DOMException('Low battery', 'NotAllowedError');
    const s = new FakeSentinel();
    sentinels.push(s);
    return s;
  });
  const env = {
    navigator: api === 'missing' ? {} : { wakeLock: { request } },
    document: doc,
  } as unknown as WakeEnv;
  const setVisible = (visible: boolean) => {
    doc.visibilityState = visible ? 'visible' : 'hidden';
    for (const h of handlers) h();
  };
  return { env, request, sentinels, setVisible, handlers };
}

describe('wake lock', () => {
  it('holds the screen awake during a session and releases it at the end', async () => {
    const f = fakeEnv('supported');
    const lock = createWakeLock(f.env);
    expect(await lock.acquire()).toBe('active');
    expect(f.request).toHaveBeenCalledWith('screen');
    await lock.release();
    expect(lock.status).toBe('off');
    expect(f.sentinels[0].released).toBe(true);
    expect(f.handlers.size).toBe(0);
  });

  it('falls back when the API is missing (Home Screen app below iPadOS 18.4)', async () => {
    const lock = createWakeLock(fakeEnv('missing').env);
    expect(await lock.acquire()).toBe('fallback');
  });

  it('falls back when the request is refused', async () => {
    const f = fakeEnv('rejects');
    const lock = createWakeLock(f.env);
    const seen: string[] = [];
    lock.subscribe((s) => seen.push(s));
    expect(await lock.acquire()).toBe('fallback');
    expect(seen).toEqual(['fallback']);
  });

  it('asks again when the page becomes visible after the system released the lock', async () => {
    const f = fakeEnv('supported');
    const lock = createWakeLock(f.env);
    await lock.acquire();
    f.setVisible(false);
    f.sentinels[0].systemRelease();
    expect(lock.status).toBe('active');
    f.setVisible(true);
    await vi.waitFor(() => expect(f.request).toHaveBeenCalledTimes(2));
    expect(lock.status).toBe('active');
  });

  it('shows the fallback when the lock is lost while the page is visible', async () => {
    const f = fakeEnv('supported');
    const lock = createWakeLock(f.env);
    await lock.acquire();
    f.sentinels[0].systemRelease();
    expect(lock.status).toBe('fallback');
  });

  it('does not ask again after the session ends', async () => {
    const f = fakeEnv('supported');
    const lock = createWakeLock(f.env);
    await lock.acquire();
    await lock.release();
    f.setVisible(false);
    f.setVisible(true);
    expect(f.request).toHaveBeenCalledTimes(1);
  });
});
