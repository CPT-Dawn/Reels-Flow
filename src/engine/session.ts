import { SESSION_GAP, sessionAt, type SessionStore } from '@/settings/session';
import type { Clock } from './engine';
import { currentReelVideo } from './reels-feed';

/** How often to look at the Reels Feed, in ms. */
const TICK = 250;

/** How long a Reel must be the Current Reel to count as watched, in ms. */
const COUNT_AFTER = 1000;

/** How often to store the Session while the viewer is on the Reels Feed, in ms. */
const SAVE_EVERY = 10_000;

/**
 * The longest stretch between two looks that counts towards playing time, in
 * ms: browsers slow timers down in a background tab, and stop them while the
 * computer sleeps, when nothing plays however long the gap.
 */
const LONGEST_TICK = 60_000;

const HAVE_FUTURE_DATA = 3;

/** What this page has seen of the Session since it last stored it. */
type Seen = {
  /** When the viewer was first and last on the Reels Feed, if they were. */
  first?: number;
  last?: number;
  reelsWatched: number;
  playingMs: number;
};

/**
 * The Session tracker, while the page is on the Reels Feed. The viewer is
 * there while the page is in front of them, or while a Reel plays in the
 * background. A Reel counts as watched once it has been the Current Reel for
 * `COUNT_AFTER` while they are there, however it got there; minutes count
 * while a Reel plays. Returns a function that stops tracking.
 */
export function trackSession(document: Document, clock: Clock, session: SessionStore): () => void {
  // Reels counted this Session, so a Reel that loops, or that the viewer
  // comes back to from another tab, counts once.
  let counted = new WeakSet<HTMLVideoElement>();
  let candidate: HTMLVideoElement | undefined;
  let candidateSince = 0;
  let lastTick = clock.now();
  let lastThere: number | undefined;
  let wasThere = false;
  let savedAt = -Infinity;
  let seen: Seen = { reelsWatched: 0, playingMs: 0 };

  const save = () => {
    const { first, last, reelsWatched, playingMs } = seen;
    seen = { reelsWatched: 0, playingMs: 0 };
    savedAt = clock.now();
    if (first === undefined || last === undefined) return;
    void session.update((stored) => {
      // A new Session if the viewer had been away, in every tab, long enough.
      const current = sessionAt(stored, first);
      return {
        reelsWatched: current.reelsWatched + reelsWatched,
        playingMs: current.playingMs + playingMs,
        lastSeenAt: Math.max(current.lastSeenAt, last),
      };
    });
  };

  let timer: number;
  const tick = () => {
    const now = clock.now();
    const sinceLastTick = Math.min(now - lastTick, LONGEST_TICK);
    lastTick = now;
    const playing = aReelPlays(document);
    const there = playing || document.visibilityState === 'visible';

    if (there) {
      // Back after long enough away that, as far as this page knows, the
      // Session has ended: the Reels it counted count again.
      if (lastThere !== undefined && now - lastThere >= SESSION_GAP) counted = new WeakSet();
      seen.first ??= now;
      seen.last = now;
      lastThere = now;
      if (playing) seen.playingMs += sinceLastTick;

      const current = currentReelVideo(document);
      if (current !== candidate) {
        candidate = current;
        candidateSince = now;
      }
      if (current && !counted.has(current) && now - candidateSince >= COUNT_AFTER) {
        counted.add(current);
        seen.reelsWatched++;
        save();
      } else if (now - savedAt >= SAVE_EVERY) {
        save();
      }
    } else if (wasThere) {
      // Gone to another tab: a Reel must be in view a while once they're back.
      candidate = undefined;
      save();
    }
    wasThere = there;
    timer = clock.setTimeout(tick, TICK);
  };
  tick();
  // Closing the tab: store what hasn't been yet.
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
