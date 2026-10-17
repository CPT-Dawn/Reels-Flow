import { NO_SESSION, type Session, type SessionStore } from '@/settings/session';

/**
 * An in-memory Session store for engine and Popup tests. Share one between
 * two mounted feeds to stand in for two tabs of the same browser.
 */
export function createTestSessionStore(initial: Partial<Session> = {}): SessionStore {
  let session: Session = { ...NO_SESSION, ...initial };
  const listeners = new Set<(session: Session) => void>();

  return {
    async get() {
      return { ...session };
    },

    async update(change) {
      session = change({ ...session });
      // Like browser storage, tell watchers after the write, not during it.
      const snapshot = { ...session };
      queueMicrotask(() => listeners.forEach((listener) => listener(snapshot)));
    },

    watch(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
