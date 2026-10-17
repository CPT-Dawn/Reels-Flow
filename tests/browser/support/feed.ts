import { describe, expect, onTestFinished } from 'vitest';
import { mountEngine } from '@/engine/engine';
import type { SessionStore } from '@/settings/session';
import type { SettingsStore } from '@/settings/settings';
import { createTestClock, type TestClock } from './clock';
import { getMessage } from './messages';
import { createTestSessionStore } from './session';
import { createTestSettingsStore } from './settings';

type FixtureInfo = {
  description: string;
  /** Where on instagram.com the snapshot was taken, scrubbed. */
  path: string;
  /** The window size the snapshot was taken at. */
  viewport: { width: number; height: number };
};

export type Fixture = FixtureInfo & { name: string };

// Every folder in tests/fixtures/ with a fixture.json is a fixture.
const infos = import.meta.glob<FixtureInfo>('../../fixtures/*/fixture.json', {
  eager: true,
  import: 'default',
});

export const fixtures: Fixture[] = Object.entries(infos).map(([file, info]) => ({
  name: file.split('/').at(-2)!,
  ...info,
}));

/** Runs the tests in `body` once against every fixture. */
export function describeEachFixture(body: (fixture: Fixture) => void) {
  for (const fixture of fixtures) {
    describe(`on ${fixture.name}`, () => body(fixture));
  }
}

/** `expect.poll` options with time for two Reels to play out and the Reels Feed to move on. */
export const TWO_REELS = { timeout: 10_000 };

/**
 * Waits for `reelsFeed`'s timeline to begin with `expected`. Only the start is
 * compared: the Reels Feed plays on after the last thing a test looks for, and
 * a short Reel can start over before a busy machine gets round to looking.
 */
export function expectTimeline(reelsFeed: ReelsFeed, expected: string[], options = TWO_REELS) {
  return expect.poll(() => reelsFeed.timeline.slice(0, expected.length), options).toEqual(expected);
}

/**
 * Waits for the Reels Feed to come to rest on reel `reel`, and expects every
 * Reel above it to have finished on the way, in order, each Advanced from
 * once. At high Speed a Reel can play out while the Reels Feed is still
 * scrolling to it, or once more as it scrolls away, so the order of those
 * against the scrolling is left open.
 */
export async function expectAdvancedTo(reelsFeed: ReelsFeed, reel: number, options = TWO_REELS) {
  const landed = `reel ${reel} in view`;
  await expect.poll(() => reelsFeed.timeline, options).toContain(landed);
  const finished = reelsFeed.timeline
    .slice(0, reelsFeed.timeline.indexOf(landed))
    .flatMap((entry) => /^reel (\d+) started over$/.exec(entry)?.[1] ?? [])
    .map(Number)
    .filter((finished, i, all) => finished !== all[i - 1]);
  expect(finished).toEqual([...Array(reel).keys()]);
}

/**
 * Resolves the first time `video` reports a position where `reached` holds,
 * so the test acts right then, not a poll later: a Reel lasts 2 to 3 seconds.
 * Fails if it doesn't in the time `TWO_REELS` allows.
 */
export function playedTo(video: HTMLVideoElement, reached: (video: HTMLVideoElement) => boolean) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      video.removeEventListener('timeupdate', check);
      reject(new Error(`The video never got there; it is at ${video.currentTime}s of ${video.duration}s`));
    }, TWO_REELS.timeout);
    const check = () => {
      if (!reached(video)) return;
      clearTimeout(timer);
      video.removeEventListener('timeupdate', check);
      resolve();
    };
    video.addEventListener('timeupdate', check);
    check();
  });
}

/**
 * Waits long enough for the Reels Feed to have started moving had Reels Flow
 * Advanced, which it does within a frame of a Reel finishing.
 */
export function aMomentLater() {
  return new Promise((resolve) => setTimeout(resolve, 500));
}

type FixtureWindow = Window & typeof globalThis;

export type ReelsFeed = {
  /** The fixture's own window, with its own DOM classes. */
  window: FixtureWindow;
  document: Document;
  /** Every Reel's video, top to bottom, including Reels loaded since. */
  readonly videos: HTMLVideoElement[];
  settings: SettingsStore;
  session: SessionStore;
  clock: TestClock;
  /**
   * What the viewer has seen so far, in order: `reel <n> started over`
   * when the nth video jumps back to its start, `Reels Feed scrolls` when
   * it starts to move, and `reel <n> in view` once it comes to rest (or
   * `reel without a video in view` on a Reel Instagram hasn't loaded yet).
   */
  timeline: string[];
  /**
   * Resolves as soon as `entry` is on the timeline, before anything else
   * happens on the page, so the test can step in at that very moment. Fails
   * if it isn't there in the time `TWO_REELS` allows.
   */
  seen(entry: string): Promise<void>;
  /** Moves to `path` inside Instagram, without a page load. */
  navigate(path: string): void;
  /**
   * Stands in for Instagram loading one more Reel into the Reels Feed, right
   * below `video`'s Reel. Returns the new Reel's video.
   */
  loadReelBelow(video: HTMLVideoElement): HTMLVideoElement;
  /**
   * Opens Instagram's comments panel beside the Current Reel, as captured in
   * the reels-comments fixture. Returns a function that closes it again, as
   * its Close button does.
   */
  openComments(): Promise<() => void>;
  /**
   * Stands in for the menu Instagram opens from the Current Reel's Share or
   * More button, which no fixture has captured yet: a dialog beside the Reel.
   * Returns a function that closes it again.
   */
  openMenu(button: 'Share' | 'More'): () => void;
  /**
   * Stands in for the viewer switching to another tab, which a test page
   * can't do: the Reels Feed is told it is in the background. Returns a
   * function that switches back.
   */
  switchToAnotherTab(): () => void;
  /** Tears the engine and the page down. Also runs when the test ends. */
  unmount(): void;
};

/**
 * Opens `fixture` in an iframe the size of its snapshot window, at its
 * /reels/ address, scrolled to the Reel that was being watched, and mounts
 * the Reels Flow engine onto it.
 */
export async function mountReelsFeed(
  fixture: Fixture,
  {
    settings = createTestSettingsStore(),
    session = createTestSessionStore(),
    clock = createTestClock(),
    path = fixture.path,
    viewport = fixture.viewport,
  }: {
    settings?: SettingsStore;
    session?: SessionStore;
    clock?: TestClock;
    /** Where on Instagram the page is when the engine starts. */
    path?: string;
    viewport?: Fixture['viewport'];
  } = {},
): Promise<ReelsFeed> {
  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: `${viewport.width}px`,
    height: `${viewport.height}px`,
    border: '0',
  });
  // The `fixture` query asks the test server for the page (see vitest.config.ts).
  iframe.src = `${fixture.path}?fixture=${fixture.name}`;
  const loaded = new Promise((resolve) =>
    iframe.addEventListener('load', resolve, { once: true }),
  );
  document.body.append(iframe);
  await loaded;

  const window = iframe.contentWindow as FixtureWindow;
  window.history.replaceState(null, '', path);
  const videos = () => [...window.document.querySelectorAll('video')];
  // Every test starts with nothing open over the Reels Feed, as if the viewer
  // had closed whatever the fixture was captured with; `openComments()` opens
  // it again.
  for (const panel of window.document.querySelectorAll('[role="dialog"]')) popoverOf(panel).remove();
  // Instagram unloads the Reels above the one being watched, and the snapshot
  // keeps only the space they took, not where the feed was scrolled to: bring
  // the first Reel left in the page, the one being watched, back into view.
  videos()[0]?.scrollIntoView({ block: 'center', behavior: 'instant' });
  await nextFrames(window, 2);
  const recording = recordTimeline(window, videos);
  const player = playLikeInstagram(window, videos(), recording.startedOver);
  const unmountEngine = mountEngine(window.document, { settings, session, getMessage, clock });

  let mounted = true;
  const unmount = () => {
    if (!mounted) return;
    mounted = false;
    unmountEngine();
    recording.stop();
    player.stop();
    iframe.remove();
  };
  onTestFinished(unmount);

  return {
    window,
    document: window.document,
    get videos() {
      return videos();
    },
    settings,
    session,
    clock,
    timeline: recording.timeline,
    seen: recording.seen,
    navigate(path) {
      // How Instagram moves between its pages: no load, no event.
      window.history.pushState(null, '', path);
    },
    loadReelBelow(video) {
      const reel = reelOf(window, video);
      const newReel = reel.cloneNode(true) as Element;
      reel.after(newReel);
      const newVideo = newReel.querySelector('video')!;
      player.add(newVideo);
      return newVideo;
    },
    async openComments() {
      const template = window.document.createElement('template');
      template.innerHTML = await instagramCommentsPanel();
      const panel = template.content.firstElementChild!;
      window.document.body.append(panel);
      return () => panel.remove();
    },
    openMenu(button) {
      const menu = window.document.createElement('div');
      menu.setAttribute('role', 'dialog');
      menu.setAttribute('aria-label', button);
      menu.style.cssText = 'position: fixed; top: 40%; right: 10%; width: 300px; height: 200px';
      window.document.body.append(menu);
      return () => menu.remove();
    },
    switchToAnotherTab() {
      const { document } = window;
      const background = { visibilityState: 'hidden', hidden: true };
      for (const [name, value] of Object.entries(background)) {
        Object.defineProperty(document, name, { value, configurable: true });
      }
      document.dispatchEvent(new window.Event('visibilitychange'));
      return () => {
        // Uncovers the document's own, which say it is in front.
        for (const name of Object.keys(background)) delete (document as unknown as Record<string, unknown>)[name];
        document.dispatchEvent(new window.Event('visibilitychange'));
      };
    },
    unmount,
  };
}

/** The fixture captured with Instagram's comments panel open. */
const COMMENTS_FIXTURE = 'reels-comments';

let commentsPanel: Promise<string> | undefined;

/** The markup of Instagram's comments panel, from `COMMENTS_FIXTURE`. */
function instagramCommentsPanel() {
  commentsPanel ??= fetch(`/reels/?fixture=${COMMENTS_FIXTURE}`)
    .then((response) => response.text())
    .then((html) => {
      const page = new DOMParser().parseFromString(html, 'text/html');
      return popoverOf(page.querySelector('[role="dialog"]')!).outerHTML;
    });
  return commentsPanel;
}

/** The box Instagram positions a panel in, beside the Reel it belongs to. */
function popoverOf(panel: Element) {
  return panel.closest('[style*="translate"]') ?? panel;
}

/**
 * Stands in for Instagram's player, which the scrubbed fixtures no longer
 * have: plays the Current Reel (the one most in view) and pauses the rest.
 * Like Instagram (see ADR 0001), it loops a Reel without `loop`: the video
 * ends, fires `ended`, and is sought back to the start and played again.
 * Videos are muted so they may autoplay. Tells `startedOver` the moment it
 * starts a video over.
 */
function playLikeInstagram(
  window: FixtureWindow,
  videos: HTMLVideoElement[],
  startedOver: (video: HTMLVideoElement) => void,
) {
  const inView = new Map<HTMLVideoElement, number>();
  const observer = new window.IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        inView.set(entry.target as HTMLVideoElement, entry.intersectionRatio);
      }
      const known = [...inView.keys()];
      const currentReel = known.reduce((best, video) =>
        inView.get(video)! > inView.get(best)! ? video : best,
      );
      for (const video of known) {
        if (video === currentReel && inView.get(video)! > 0) {
          if (video.paused) void video.play();
        } else if (!video.paused) {
          video.pause();
        }
      }
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] },
  );

  const restart = (event: Event) => {
    const video = event.target as HTMLVideoElement;
    video.currentTime = 0;
    startedOver(video);
    void video.play();
  };

  const add = (video: HTMLVideoElement) => {
    video.muted = true;
    video.addEventListener('ended', restart);
    observer.observe(video);
  };
  videos.forEach(add);

  return {
    add,
    stop() {
      observer.disconnect();
      for (const video of inView.keys()) video.removeEventListener('ended', restart);
    },
  };
}

/** Writes down what the viewer sees happen, for `ReelsFeed.timeline`. */
function recordTimeline(window: FixtureWindow, videos: () => HTMLVideoElement[]) {
  const timeline: string[] = [];
  const waiting: { entry: string; resolve: () => void }[] = [];
  const push = (entry: string) => {
    timeline.push(entry);
    for (const waiter of waiting.filter((waiter) => waiter.entry === entry)) {
      waiting.splice(waiting.indexOf(waiter), 1);
      waiter.resolve();
    }
  };
  // Videos the player has just started over, whose seek is yet to report.
  const announced = new WeakSet<HTMLVideoElement>();
  let scrolling = false;

  // Seeking, scrolling and scrollend don't bubble: listen as they go down.
  const listeners: [string, (event: Event) => void][] = [
    [
      'seeking',
      (event) => {
        const video = event.target as HTMLVideoElement;
        if (announced.delete(video)) return;
        if (video.currentTime < 0.5) push(`reel ${videos().indexOf(video)} started over`);
      },
    ],
    [
      'scroll',
      () => {
        if (!scrolling) push('Reels Feed scrolls');
        scrolling = true;
      },
    ],
    [
      'scrollend',
      () => {
        scrolling = false;
        const reel = reelInView(window, videos());
        push(reel === -1 ? 'reel without a video in view' : `reel ${reel} in view`);
      },
    ],
  ];
  for (const [type, listener] of listeners) {
    window.document.addEventListener(type, listener, true);
  }

  return {
    timeline,
    seen(entry: string) {
      if (timeline.includes(entry)) return Promise.resolve();
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`Never saw "${entry}", only ${JSON.stringify(timeline)}`)),
          TWO_REELS.timeout,
        );
        waiting.push({ entry, resolve: () => (clearTimeout(timer), resolve()) });
      });
    },
    /**
     * Writes down a start over the player makes, as it makes it. Its seek
     * reports a moment later, after an Advance begun at the end may already
     * have scrolled the Reels Feed: the viewer saw both at once.
     */
    startedOver(video: HTMLVideoElement) {
      announced.add(video);
      push(`reel ${videos().indexOf(video)} started over`);
    },
    stop() {
      for (const [type, listener] of listeners) {
        window.document.removeEventListener(type, listener, true);
      }
    },
  };
}

/** The index of the Reel whose video spans the middle of the window. */
function reelInView(window: FixtureWindow, videos: HTMLVideoElement[]) {
  const middle = window.innerHeight / 2;
  return videos.findIndex((video) => {
    const { top, bottom } = video.getBoundingClientRect();
    return top <= middle && middle <= bottom;
  });
}

/** `video`'s Reel: its ancestor that is one item of the snap-scrolling Reels Feed. */
function reelOf(window: FixtureWindow, video: HTMLVideoElement) {
  let reel: Element = video;
  while (window.getComputedStyle(reel.parentElement!).scrollSnapType === 'none') {
    reel = reel.parentElement!;
  }
  return reel;
}

function nextFrames(window: FixtureWindow, count: number) {
  return new Promise<void>((resolve) => {
    const frame = () => (--count === 0 ? resolve() : window.requestAnimationFrame(frame));
    window.requestAnimationFrame(frame);
  });
}
