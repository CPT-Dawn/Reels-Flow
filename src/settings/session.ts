import { storage } from 'wxt/utils/storage';

/** How long away from the Reels Feed ends a Session, in ms. */
export const SESSION_GAP = 30 * 60_000;

export type Session = {
  reelsWatched: number;
  /** How long Reels have played on the Reels Feed this Session, in ms. */
  playingMs: number;
  /** When the viewer was last on the Reels Feed, in ms since the epoch; 0 if never. */
  lastSeenAt: number;
};

export const NO_SESSION: Session = { reelsWatched: 0, playingMs: 0, lastSeenAt: 0 };

/**
 * The Session as it stands at `now`, from the one last stored: a new, empty
 * one once the viewer has been away from the Reels Feed for `SESSION_GAP`.
 */
export function sessionAt(stored: Session, now: number): Session {
  return now - stored.lastSeenAt >= SESSION_GAP ? NO_SESSION : stored;
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
