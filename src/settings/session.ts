import { storage } from 'wxt/utils/storage';
import type { SessionLimit } from './settings';

/**
 * How long with no Reel playing ends a Session, in ms: away from the Reels
 * Feed, or with it paused in front of the viewer.
 */
export const SESSION_GAP = 30 * 60_000;

export type Session = {
  reelsWatched: number;
  /** How long Reels have played on the Reels Feed this Session, in ms. */
  playingMs: number;
  /**
   * When the viewer was last watching, a Reel playing or just counted, in ms
   * since the epoch; 0 if never.
   */
  lastSeenAt: number;
  /**
   * Where the Session Limit counts from: the Session as it stood when the
   * viewer last answered the Break Nudge, so the next one comes only after
   * another full limit. Absent until they first do.
   */
  limitFrom?: Pick<Session, 'reelsWatched' | 'playingMs'>;
};

export const NO_SESSION: Session = { reelsWatched: 0, playingMs: 0, lastSeenAt: 0 };

/**
 * The Session as it stands at `now`, from the one last stored: a new, empty
 * one once the viewer hasn't watched for `SESSION_GAP`.
 */
export function sessionAt(stored: Session, now: number): Session {
  return now - stored.lastSeenAt >= SESSION_GAP ? NO_SESSION : stored;
}

/** Whether `session` has reached `limit` since it last counted from, by Reels Watched or playing minutes. */
export function limitReached(session: Session, limit: SessionLimit): boolean {
  if (limit.kind === 'off') return false;
  const from = session.limitFrom ?? NO_SESSION;
  return limit.kind === 'reels'
    ? session.reelsWatched - from.reelsWatched >= limit.value
    : session.playingMs - from.playingMs >= limit.value * 60_000;
}

/** The current Session, shared by every tab and the Popup. */
export interface SessionStore {
  /** The Session as last stored, which may have ended since: see `sessionAt`. */
  get(): Promise<Session>;
  /**
   * Replaces the stored Session with what `change` makes of it. Changes from
   * one page apply one after another, each to the Session the last one left.
   */
  update(change: (stored: Session) => Session): Promise<void>;
  /**
   * Calls `listener` with the stored Session whenever it changes, from this
   * page or any other. Returns a function that stops watching.
   */
  watch(listener: (session: Session) => void): () => void;
}

export function createSessionStore(): SessionStore {
  // Local, never synced: the Session never leaves this browser (ADR 0003).
  const item = storage.defineItem<Session>('local:session', { fallback: NO_SESSION });
  let last: Promise<void> = Promise.resolve();
  return {
    get: () => item.getValue(),

    update(change) {
      const next = last.then(async () => item.setValue(change(await item.getValue())));
      // One failed change doesn't stop the ones after it.
      last = next.catch(() => {});
      return next;
    },

    watch(listener) {
      return item.watch((session) => listener(session ?? NO_SESSION));
    },
  };
}
