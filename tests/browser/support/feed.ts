import { describe, onTestFinished } from 'vitest';
import { mountEngine } from '@/engine/engine';
import type { SettingsStore } from '@/settings/settings';
import { createTestClock, type TestClock } from './clock';
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

type FixtureWindow = Window & typeof globalThis;

export type ReelsFeed = {
  /** The fixture's own window, with its own DOM classes. */
  window: FixtureWindow;
  document: Document;
  /** Every Reel's video, top to bottom. */
  videos: HTMLVideoElement[];
  settings: SettingsStore;
  clock: TestClock;
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
    clock = createTestClock(),
  }: { settings?: SettingsStore; clock?: TestClock } = {},
): Promise<ReelsFeed> {
  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: `${fixture.viewport.width}px`,
    height: `${fixture.viewport.height}px`,
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
  window.history.replaceState(null, '', fixture.path);
  const videos = [...window.document.querySelectorAll('video')];
  // Instagram unloads the Reels above the one being watched, and the snapshot
  // keeps only the space they took, not where the feed was scrolled to: bring
  // the first Reel left in the page, the one being watched, back into view.
  videos[0]?.scrollIntoView({ block: 'center', behavior: 'instant' });
  const stopPlaying = playLikeInstagram(window, videos);
  const unmountEngine = mountEngine(window.document, { settings, clock });

  let mounted = true;
  const unmount = () => {
    if (!mounted) return;
    mounted = false;
    unmountEngine();
    stopPlaying();
    iframe.remove();
  };
  onTestFinished(unmount);

  return { window, document: window.document, videos, settings, clock, unmount };
}

/**
 * Stands in for Instagram's player, which the scrubbed fixtures no longer
 * have: plays the Current Reel (the one most in view) and pauses the rest,
 * and sets `loop` on every video at run time, as Instagram does (ADR 0001),
 * so a Reel never fires `ended`. Videos are muted so they may autoplay.
 */
function playLikeInstagram(window: FixtureWindow, videos: HTMLVideoElement[]) {
  const inView = new Map<Element, number>();
  const observer = new window.IntersectionObserver(
    (entries) => {
      for (const entry of entries) inView.set(entry.target, entry.intersectionRatio);
      const currentReel = videos.reduce((best, video) =>
        (inView.get(video) ?? 0) > (inView.get(best) ?? 0) ? video : best,
      );
      for (const video of videos) {
        if (video === currentReel && (inView.get(video) ?? 0) > 0) {
          if (video.paused) void video.play();
        } else if (!video.paused) {
          video.pause();
        }
      }
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] },
  );

  for (const video of videos) {
    video.muted = true;
    video.loop = true;
    observer.observe(video);
  }
  return () => observer.disconnect();
}
