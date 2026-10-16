import type { Settings, SettingsStore } from '@/settings/settings';
import { placeReelControls, type ReelControls } from './reel-control';
import { watchReelEnds } from './reel-end';
import { advance, currentReelVideo, goToReelBeside } from './reels-feed';
import { whileOnReelsFeed } from './route';
import { watchShortcuts } from './shortcuts';

/** Time as the engine sees it, so tests can move it forward by hand. */
export interface Clock {
  now(): number;
  setTimeout(callback: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

/** The browser's localised strings the engine shows on the Reels Feed (public/_locales). */
export type GetMessage = (
  name: 'reelControlName' | 'reelControlLabel' | 'reelControlTitle',
  substitution?: string,
) => string;

export type EngineOptions = {
  settings: SettingsStore;
  /** The browser's localised strings, `browser.i18n.getMessage` in the extension. */
  getMessage: GetMessage;
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
  { settings, getMessage, clock = windowClock(document.defaultView!) }: EngineOptions,
): () => void {
  // Unknown until the settings arrive, so nothing moves on a guess.
  let current: Settings | undefined;
  let reelControls: ReelControls | undefined;
  const apply = (next: Settings) => {
    current = next;
    reelControls?.update(next);
  };
  let changedSinceRead = false;
  const unwatchSettings = settings.watch((changed) => {
    changedSinceRead = true;
    apply(changed);
  });
  void settings.get().then((read) => {
    if (!changedSinceRead) apply(read);
  });

  const toggleAutoScroll = () => {
    if (current) void settings.set({ autoScroll: !current.autoScroll });
  };

  const goToReel = (side: 'below' | 'above') => {
    const video = currentReelVideo(document);
    if (video) goToReelBeside(video, side);
  };

  const unwatchRoute = whileOnReelsFeed(document.defaultView!, clock, () => {
    const unwatchEnds = watchReelEnds(document, (video) => {
      if (current?.autoScroll && video === currentReelVideo(document)) advance(video);
    });
    const unwatchShortcuts = watchShortcuts(document, () => current?.shortcuts, {
      toggleAutoScroll,
      nextReel: () => goToReel('below'),
      previousReel: () => goToReel('above'),
    });
    reelControls = placeReelControls(document, { getMessage, onClick: toggleAutoScroll });
    if (current) reelControls.update(current);
    return () => {
      unwatchEnds();
      unwatchShortcuts();
      reelControls!.remove();
      reelControls = undefined;
    };
  });

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
