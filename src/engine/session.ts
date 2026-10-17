import { SESSION_GAP, sessionAt, type Session, type SessionStore } from '@/settings/session';
import type { Clock } from './engine';
import { currentReelVideo } from './reels-feed';

/** How often to look at the Reels Feed, in ms. */
const TICK = 250;

/** How long a Reel must be the Current Reel to count as watched, in ms. */
const COUNT_AFTER = 1000;

/** How often to store the Session while the viewer is watching, in ms. */
const SAVE_EVERY = 10_000;

/**
 * The longest stretch between two looks that counts towards playing time, in
 * ms: browsers slow timers down in a background tab, and stop them while the
 * computer sleeps.
 */
const LONGEST_TICK = 60_000;

const HAVE_FUTURE_DATA = 3;

/** What this page has seen of the Session since it last stored it. */
type Unsaved = Pick<Session, 'reelsWatched' | 'playingMs'> & {
  /** When the viewer was first and last watching, if they were. */
  firstWatchingAt?: number;
  lastWatchingAt?: number;
};

/**
 * The Session tracker, while the page is on the Reels Feed. The viewer is
 * watching while the page is in front of them, or while a Reel plays in the
 * background. A Reel counts as watched once it has been the Current Reel for
 * `COUNT_AFTER` while they watch, however it got there; minutes count while a
 * Reel plays. Returns a function that stops tracking.
 */
export function trackSession(document: Document, clock: Clock, session: SessionStore): () => void {
  // Reels counted this Session, so a Reel that loops, or that the viewer
  // comes back to from another tab, counts once.
  let counted = new WeakSet<HTMLVideoElement>();
  // The Current Reel, and since when, while the viewer watches.
  let currentReel: HTMLVideoElement | undefined;
  let currentSince = 0;
  let lastTick = clock.now();
  let wasPlaying = false;
  let wasWatching = false;
  let lastWatchingAt: number | undefined;
  let savedAt = -Infinity;
  let unsaved: Unsaved = { reelsWatched: 0, playingMs: 0 };

  const save = () => {
    const { firstWatchingAt, lastWatchingAt, reelsWatched, playingMs } = unsaved;
    unsaved = { reelsWatched: 0, playingMs: 0 };
    savedAt = clock.now();
    if (firstWatchingAt === undefined || lastWatchingAt === undefined) return;
    void session.update((stored) => {
      // A new Session if the viewer had been away, in every tab, long enough.
      const current = sessionAt(stored, firstWatchingAt);
      return {
        reelsWatched: current.reelsWatched + reelsWatched,
        playingMs: current.playingMs + playingMs,
        lastSeenAt: Math.max(current.lastSeenAt, lastWatchingAt),
      };
    });
  };

  let timer: number;
  const tick = () => {
    const now = clock.now();
    const sinceLastTick = Math.min(Math.max(now - lastTick, 0), LONGEST_TICK);
    lastTick = now;
    const playing = aReelPlays(document);
    const watching = playing || document.visibilityState === 'visible';

    if (watching) {
      // Back after long enough away that, as far as this page knows, the
      // Session has ended: the Reels it counted count again.
      if (lastWatchingAt !== undefined && now - lastWatchingAt >= SESSION_GAP) counted = new WeakSet();
      lastWatchingAt = now;
      unsaved.firstWatchingAt ??= now;
      unsaved.lastWatchingAt = now;
      // Only time a Reel played all through: one that has just started, or
      // just stopped, may not have played for most of it.
      if (playing && wasPlaying) unsaved.playingMs += sinceLastTick;

      const reel = currentReelVideo(document);
      if (reel !== currentReel) {
        currentReel = reel;
        currentSince = now;
      }
      if (reel && !counted.has(reel) && now - currentSince >= COUNT_AFTER) {
        counted.add(reel);
        unsaved.reelsWatched++;
        save();
      } else if (now - savedAt >= SAVE_EVERY) {
        save();
      }
    } else if (wasWatching) {
      // Gone to another tab: a Reel must be in view a while once they're back.
      currentReel = undefined;
      save();
    }
    wasPlaying = playing;
    wasWatching = watching;
    timer = clock.setTimeout(tick, TICK);
  };
  tick();
  // Closing the tab: store what hasn't been yet, as far as the browser lets
  // a closing page finish.
  const window = document.defaultView!;
  window.addEventListener('pagehide', save);

  return () => {
    clock.clearTimeout(timer);
    window.removeEventListener('pagehide', save);
    save();
  };
}

/** Whether any Reel on the page is playing: not paused, nor waiting for data. */
function aReelPlays(document: Document) {
  return [...document.querySelectorAll('video')].some(
    (video) => !video.paused && !video.ended && video.readyState >= HAVE_FUTURE_DATA,
  );
}
