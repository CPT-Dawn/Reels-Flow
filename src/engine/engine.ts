import type { SessionStore } from '@/settings/session';
import type { Settings, SettingsStore } from '@/settings/settings';
import { watchHolds } from './holds';
import { placeReelControls, type ReelControls } from './reel-control';
import { watchReelEnds } from './reel-end';
import { advance, currentReelVideo, goToReelBeside } from './reels-feed';
import { whileOnReelsFeed } from './route';
import { trackSession } from './session';
import { watchShortcuts } from './shortcuts';
import { watchSpeed, type Speed } from './speed';

/** Time as the engine sees it, so tests can move it forward by hand. */
export interface Clock {
  /**
   * Time in ms. In the browser it is ms since the epoch, so other tabs and
   * later page loads can compare it, yet it never jumps with the system clock
   * while the page is open.
   */
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
  /** The current Session, shared with the other tabs and the Popup. */
  session: SessionStore;
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
  { settings, session, getMessage, clock = windowClock(document.defaultView!) }: EngineOptions,
): () => void {
  // Unknown until the settings arrive, so nothing moves on a guess.
  let current: Settings | undefined;
  let reelControls: ReelControls | undefined;
  let speed: Speed | undefined;
  const apply = (next: Settings) => {
    current = next;
    reelControls?.update(next);
    speed?.update(next);
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

  const toggleSpeed = () => {
    if (current) void settings.set({ speedOn: !current.speedOn });
  };

  const goToReel = (side: 'below' | 'above') => {
    const video = currentReelVideo(document);
    if (video) goToReelBeside(video, side);
  };

  const unwatchRoute = whileOnReelsFeed(document.defaultView!, clock, () => {
    const holds = watchHolds(document, clock);
    const unwatchEnds = watchReelEnds(document, (video) => {
      if (current?.autoScroll && video === currentReelVideo(document) && !holds.isHeld(video)) {
        advance(video);
      }
    });
    const unwatchShortcuts = watchShortcuts(document, () => current?.shortcuts, {
      toggleAutoScroll,
      toggleSpeed,
      nextReel: () => goToReel('below'),
      previousReel: () => goToReel('above'),
    });
    reelControls = placeReelControls(document, { getMessage, onClick: toggleAutoScroll });
    speed = watchSpeed(document, clock);
    if (current) {
      reelControls.update(current);
      speed.update(current);
    }
    const stopTrackingSession = trackSession(document, clock, session);
    return () => {
      stopTrackingSession();
      speed!.stop();
      speed = undefined;
      unwatchEnds();
      holds.stop();
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
    now: () => window.performance.timeOrigin + window.performance.now(),
    setTimeout: (callback, ms) => window.setTimeout(callback, ms),
    clearTimeout: (id) => window.clearTimeout(id),
  };
}
