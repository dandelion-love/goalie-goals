// How a request reaches the parent. Real web push comes in a later story; until then the
// in-app inbox and its badge stand in for it (AC4), behind the same interface.

import type { Role } from './roles.js';

export interface Notification {
  /** Which role should hear about it. */
  to: Role;
  /** What it is about, for example an approval request id. */
  ref: string;
  title: string;
}

export interface Notifier {
  /** Tell the role about something waiting for them. */
  notify(notification: Notification): Promise<void>;
  /** The thing was answered or lapsed: take the notification back. */
  withdraw(ref: string): Promise<void>;
}

/**
 * MOCK FOR PUSH NOTIFICATIONS. Keeps notifications in memory and counts the unread ones for
 * the in-app badge; it sends nothing off the server. A later story adds a web-push notifier
 * behind `Notifier` (the inbox and badge stay, so a missed push is never a lost request).
 */
export class InAppNotifier implements Notifier {
  private readonly unread = new Map<string, Notification>();

  async notify(notification: Notification): Promise<void> {
    this.unread.set(notification.ref, { ...notification });
  }

  async withdraw(ref: string): Promise<void> {
    this.unread.delete(ref);
  }

  /** The badge number for a role. */
  async unreadCount(to: Role): Promise<number> {
    let n = 0;
    for (const item of this.unread.values()) if (item.to === to) n += 1;
    return n;
  }
}
