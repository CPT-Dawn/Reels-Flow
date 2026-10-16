import type { SettingsStore } from '@/settings/settings';
import { watchReelEnds } from './reel-end';
import { advance, currentReelVideo } from './reels-feed';
import { whileOnReelsFeed } from './route';

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
  // Off until the settings arrive, so nothing moves on a guess.
  let autoScroll = false;
  let changedSinceRead = false;
  const unwatchSettings = settings.watch((current) => {
    changedSinceRead = true;
    autoScroll = current.autoScroll;
  });
  void settings.get().then((current) => {
    if (!changedSinceRead) autoScroll = current.autoScroll;
  });

  const unwatchRoute = whileOnReelsFeed(document.defaultView!, clock, () =>
    watchReelEnds(document, (video) => {
      if (autoScroll && video === currentReelVideo(document)) advance(video);
    }),
  );

  return () => {
    unwatchRoute();
    unwatchSettings();
  };
}

function windowClock(window: Window): Clock {
  return {
    now: () => window.performance.now(),
    setTimeout: (callback, ms) => window.setTimeout(callback, ms),
    clearTimeout: (id) => window.clearTimeout(id),
  };
}
