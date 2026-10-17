import { limitReached, SESSION_GAP, sessionAt, type Session, type SessionStore } from '@/settings/session';
import type { SessionLimit } from '@/settings/settings';
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

export type SessionLimitWatch = {
  /** The Session Limit as the settings stand now; undefined until they arrive. */
  limit(): SessionLimit | undefined;
  /**
   * Called once, while a Reel plays, when the Session reaches its limit:
   * the Break Nudge's cue. Not again until `rearm()`.
   */
  onLimitReached(): void;
};

export type SessionTracker = {
  /**
   * Counts the Session Limit afresh from the Session as it stands now, for
   * every tab: the next `onLimitReached` comes after another full limit.
   */
  rearm(): void;
  /** Stops tracking, storing what hasn't been yet. */
  stop(): void;
};

/**
 * The Session tracker, while the page is on the Reels Feed.
 *
 * The viewer is watching while a Reel plays, in front of them or in a
 * background tab, and when a Reel they reached counts. A Session ends after
 * `SESSION_GAP` without watching in any tab, whether they were away or the
 * Reels Feed sat paused in front of them.
 *
 * A Reel counts as watched once it has been the Current Reel for
 * `COUNT_AFTER` while the Reels Feed is in front of the viewer or playing,
 * however it got there; minutes count while a Reel plays. Calls
 * `onLimitReached` once the Session, in every tab together, reaches the
 * Session Limit.
 */
export function trackSession(
  document: Document,
  clock: Clock,
  session: SessionStore,
  { limit, onLimitReached }: SessionLimitWatch,
): SessionTracker {
  // Reels counted this Session, so a Reel that loops, or that the viewer
  // comes back to from another tab, counts once.
  let counted = new WeakSet<HTMLVideoElement>();
  // The Current Reel, and since when, while the Reels Feed is in view.
  let currentReel: HTMLVideoElement | undefined;
  let currentSince = 0;
  let lastTick = clock.now();
  let wasPlaying = false;
  let lastWatchingAt: number | undefined;
  let savedAt = -Infinity;
  let unsaved: Unsaved = { reelsWatched: 0, playingMs: 0 };
  // The Session as last stored, by this page or another, with what this page
  // has asked to store since applied; undefined until read.
  let stored: Session | undefined;
  // Whether the Break Nudge's cue has come since the Session Limit was last armed.
  let limitCueGiven = false;

  const unwatchStored = session.watch((changed) => {
    stored = changed;
  });
  void session.get().then((read) => {
    stored ??= read;
  });

  /** The Session as it stands now, with what this page hasn't stored yet. */
  const live = (): Session | undefined => {
    if (!stored) return undefined;
    const current = sessionAt(stored, unsaved.firstWatchingAt ?? clock.now());
    return {
      ...current,
      reelsWatched: current.reelsWatched + unsaved.reelsWatched,
      playingMs: current.playingMs + unsaved.playingMs,
    };
  };

  /**
   * Stores what this page has seen since it last did, and, given `limitFrom`,
   * where the Session Limit counts from now. Resolves once stored.
   */
  const save = (limitFrom?: Session['limitFrom']) => {
    const { firstWatchingAt, lastWatchingAt, reelsWatched, playingMs } = unsaved;
    unsaved = { reelsWatched: 0, playingMs: 0 };
    savedAt = clock.now();
    const seen = firstWatchingAt !== undefined && lastWatchingAt !== undefined;
    if (!seen && !limitFrom) return Promise.resolve();
    const change = (stored: Session): Session => {
      // A new Session if the viewer hadn't watched, in any tab, for long enough.
      const current = seen ? sessionAt(stored, firstWatchingAt) : stored;
      return {
        ...current,
        reelsWatched: current.reelsWatched + reelsWatched,
        playingMs: current.playingMs + playingMs,
        lastSeenAt: seen ? Math.max(current.lastSeenAt, lastWatchingAt) : current.lastSeenAt,
        ...(limitFrom && { limitFrom }),
      };
    };
    // Counted at once, for the Session Limit, before the store says it's done.
    if (stored) stored = change(stored);
    return session.update(change).catch(() => {});
  };

  const watched = (at: number) => {
    lastWatchingAt = at;
    unsaved.firstWatchingAt ??= at;
    unsaved.lastWatchingAt = at;
  };

  let timer: number;
  const tick = () => {
    const now = clock.now();
    const sinceLastTick = Math.min(Math.max(now - lastTick, 0), LONGEST_TICK);
    lastTick = now;
    const playing = aReelPlays(document);

    if (playing) {
      // Playing again after long enough that, as far as this page knows, the
      // Session has ended: the Reels it counted count again.
      if (lastWatchingAt !== undefined && now - lastWatchingAt >= SESSION_GAP) counted = new WeakSet();
      watched(now);
      // Only time a Reel played all through: one that has just started, or
      // just stopped, may not have played for most of it.
      if (wasPlaying) unsaved.playingMs += sinceLastTick;
    }

    if (playing || document.visibilityState === 'visible') {
      const reel = currentReelVideo(document);
      if (reel !== currentReel) {
        currentReel = reel;
        currentSince = now;
      }
      if (reel && !counted.has(reel) && now - currentSince >= COUNT_AFTER) {
        counted.add(reel);
        unsaved.reelsWatched++;
        watched(now);
        void save();
      }
    } else {
      // Gone to another tab: a Reel must be in view a while once they're back.
      currentReel = undefined;
    }

    // The Break Nudge's cue: only while a Reel plays, for it to pause.
    const sessionNow = live();
    const sessionLimit = limit();
    if (playing && !limitCueGiven && sessionNow && sessionLimit && limitReached(sessionNow, sessionLimit)) {
      limitCueGiven = true;
      onLimitReached();
    }

    // Stopped watching: store when, for the Session's end to count from.
    if (wasPlaying && !playing) void save();
    else if (now - savedAt >= SAVE_EVERY) void save();
    wasPlaying = playing;
    timer = clock.setTimeout(tick, TICK);
  };
  tick();
  // Closing the tab: store what hasn't been yet, as far as the browser lets
  // a closing page finish.
  const window = document.defaultView!;
  const onPageHide = () => void save();
  window.addEventListener('pagehide', onPageHide);

  return {
    rearm() {
      const from = live();
      if (!from) return;
      void save({ reelsWatched: from.reelsWatched, playingMs: from.playingMs }).then(() => {
        limitCueGiven = false;
      });
    },
    stop() {
      clock.clearTimeout(timer);
      window.removeEventListener('pagehide', onPageHide);
      unwatchStored();
      void save();
    },
  };
}

/** Whether any Reel on the page is playing: not paused, nor waiting for data. */
function aReelPlays(document: Document) {
  return [...document.querySelectorAll('video')].some(
    (video) => !video.paused && !video.ended && video.readyState >= HAVE_FUTURE_DATA,
  );
}
