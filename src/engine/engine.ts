import type { SettingsStore } from '@/settings/settings';

/** Time as the engine sees it, so tests can move it forward by hand. */
export interface Clock {
  now(): number;
  setTimeout(callback: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

export type EngineOptions = {
  settings: SettingsStore;
  clock?: Clock;
};

/**
 * Mounts the Reels Feed engine onto `document` and returns its teardown.
 *
 * The document may belong to another window than the engine's code (tests
 * mount it onto a fixture in an iframe), so the engine reaches everything
 * through `document.defaultView` and never uses `instanceof` on DOM classes.
 */
export function mountEngine(
  document: Document,
  { settings, clock = windowClock(document.defaultView!) }: EngineOptions,
): () => void {
  void settings;
  void clock;
  return () => {};
}

function windowClock(window: Window): Clock {
  return {
    now: () => window.performance.now(),
    setTimeout: (callback, ms) => window.setTimeout(callback, ms),
    clearTimeout: (id) => window.clearTimeout(id),
  };
}
