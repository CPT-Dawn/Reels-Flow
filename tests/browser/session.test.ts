import { expect, it } from 'vitest';
import { aMomentLater, describeEachFixture, mountReelsFeed, TWO_REELS, type ReelsFeed } from './support/feed';
import { createTestClock } from './support/clock';
import { createTestSessionStore } from './support/session';
import { createTestSettingsStore } from './support/settings';

// A Reel counts once it has been the Current Reel for about a second.
const UNDER_A_SECOND = 500;
const OVER_A_SECOND = 1500;
const MINUTE = 60_000;
// How long away from the Reels Feed ends a Session.
const SESSION_GAP = 30 * MINUTE;

describeEachFixture((fixture) => {
  // Reels loop in place unless a test wants Auto-Scroll.
  const mount = (options: Parameters<typeof mountReelsFeed>[1] = {}) =>
    mountReelsFeed(fixture, { settings: createTestSettingsStore({ autoScroll: false }), ...options });

  it('counts the Current Reel once it has been in view for about a second', async () => {
    const reelsFeed = await mount();

    reelsFeed.clock.advance(UNDER_A_SECOND);
    await aMomentLater();
    expect(await reelsWatched(reelsFeed)).toBe(0);
    reelsFeed.clock.advance(OVER_A_SECOND - UNDER_A_SECOND);

    await expect.poll(() => reelsWatched(reelsFeed)).toBe(1);
  });

  it('counts a Reel the viewer scrolled to by hand, but not one they flicked past', async () => {
    const reelsFeed = await mount();

    scrollTo(reelsFeed, 1);
    reelsFeed.clock.advance(UNDER_A_SECOND);
    scrollTo(reelsFeed, 2);
    reelsFeed.clock.advance(OVER_A_SECOND);

    await expect.poll(() => reelsWatched(reelsFeed)).toBe(1);
    await aMomentLater();
    expect(await reelsWatched(reelsFeed)).toBe(1);
  });

  it('counts a Reel reached by Advance', async () => {
    const reelsFeed = await mount({ settings: createTestSettingsStore({ autoScroll: true }) });
    reelsFeed.clock.advance(OVER_A_SECOND);
    await expect.poll(() => reelsWatched(reelsFeed)).toBe(1);

    await expect.poll(() => reelsFeed.timeline, TWO_REELS).toContain('reel 1 in view');
    reelsFeed.clock.advance(OVER_A_SECOND);

    await expect.poll(() => reelsWatched(reelsFeed)).toBe(2);
  });

  it('counts a Reel once, however many times it loops', async () => {
    const reelsFeed = await mount();
    reelsFeed.clock.advance(OVER_A_SECOND);

    await expect.poll(() => reelsFeed.timeline, TWO_REELS).toEqual(['reel 0 started over']);
    reelsFeed.clock.advance(10 * OVER_A_SECOND);
    await aMomentLater();

    expect(await reelsWatched(reelsFeed)).toBe(1);
  });

  it('counts minutes while a Reel plays, and not while it is paused', async () => {
    const reelsFeed = await mount();
    await reelPlays(reelsFeed);

    reelsFeed.clock.advance(10 * MINUTE);
    await expect.poll(() => playingMinutes(reelsFeed)).toBe(10);
    reelsFeed.videos[0]!.pause();
    reelsFeed.clock.advance(10 * MINUTE);
    await aMomentLater();

    expect(await playingMinutes(reelsFeed)).toBe(10);
  });

  it('counts minutes while a Reel plays in a background tab', async () => {
    const reelsFeed = await mount();
    await reelPlays(reelsFeed);

    reelsFeed.switchToAnotherTab();
    reelsFeed.clock.advance(10 * MINUTE);

    await expect.poll(() => playingMinutes(reelsFeed)).toBe(10);
  });

  it('counts no minutes once the viewer leaves the Reels Feed', async () => {
    const reelsFeed = await mount();
    await reelPlays(reelsFeed);

    reelsFeed.navigate('/explore/');
    reelsFeed.clock.advance(10 * MINUTE);
    await aMomentLater();

    expect(await playingMinutes(reelsFeed)).toBe(0);
  });

  it('keeps the Session going while the viewer is in another tab for under 30 minutes', async () => {
    const reelsFeed = await watchAReelForTenMinutes(await mount());

    const comeBack = stepAway(reelsFeed);
    reelsFeed.clock.advance(SESSION_GAP - MINUTE);
    comeBack();
    reelsFeed.clock.advance(OVER_A_SECOND);
    // The Reel they left, counted already.
    await aMomentLater();
    expect(await session(reelsFeed)).toEqual({ reelsWatched: 1, playingMinutes: 10 });
    scrollTo(reelsFeed, 1);
    reelsFeed.clock.advance(OVER_A_SECOND);

    await expect.poll(() => reelsWatched(reelsFeed)).toBe(2);
  });

  it('starts a new Session after 30 minutes in another tab', async () => {
    const reelsFeed = await watchAReelForTenMinutes(await mount());

    const comeBack = stepAway(reelsFeed);
    reelsFeed.clock.advance(SESSION_GAP);
    comeBack();
    reelsFeed.clock.advance(OVER_A_SECOND);

    // The Reel they came back to is the new Session's first.
    await expect.poll(() => session(reelsFeed)).toEqual({ reelsWatched: 1, playingMinutes: 0 });
  });

  it('keeps the Session going while the viewer is elsewhere on Instagram for under 30 minutes', async () => {
    const reelsFeed = await watchAReelForTenMinutes(await mount());

    reelsFeed.navigate('/explore/');
    reelsFeed.clock.advance(SESSION_GAP - MINUTE);
    reelsFeed.navigate(fixture.path);
    scrollTo(reelsFeed, 1);
    reelsFeed.clock.advance(OVER_A_SECOND);

    await expect.poll(() => session(reelsFeed)).toEqual({ reelsWatched: 2, playingMinutes: 10 });
  });

  it('starts a new Session after 30 minutes elsewhere on Instagram', async () => {
    const reelsFeed = await watchAReelForTenMinutes(await mount());

    reelsFeed.navigate('/explore/');
    reelsFeed.clock.advance(SESSION_GAP);
    reelsFeed.navigate(fixture.path);
    scrollTo(reelsFeed, 1);
    reelsFeed.clock.advance(OVER_A_SECOND);

    await expect.poll(() => session(reelsFeed)).toEqual({ reelsWatched: 1, playingMinutes: 0 });
  });

  it('keeps one Session going across tabs while the viewer watches in any of them', async () => {
    const clock = createTestClock();
    const shared = { session: createTestSessionStore(), clock };
    const tabA = await mount(shared);
    const tabB = await mount(shared);
    clock.advance(OVER_A_SECOND);
    await expect.poll(() => reelsWatched(tabA)).toBe(2);

    const backToA = stepAway(tabA);
    clock.advance(SESSION_GAP);
    backToA();
    scrollTo(tabA, 1);
    clock.advance(OVER_A_SECOND);

    await expect.poll(() => reelsWatched(tabB)).toBe(3);
  });
});

/** Lets the Current Reel play for ten minutes, so it counts, and minutes do. */
async function watchAReelForTenMinutes(reelsFeed: ReelsFeed) {
  await reelPlays(reelsFeed);
  reelsFeed.clock.advance(10 * MINUTE);
  await expect.poll(() => session(reelsFeed)).toEqual({ reelsWatched: 1, playingMinutes: 10 });
  return reelsFeed;
}

/**
 * The viewer switches to another tab, where Instagram's Reel no longer plays.
 * Returns a function that brings them back to it, playing again.
 */
function stepAway(reelsFeed: ReelsFeed) {
  const video = reelsFeed.videos.find((video) => !video.paused);
  video?.pause();
  const switchBack = reelsFeed.switchToAnotherTab();
  return () => {
    switchBack();
    void video?.play();
  };
}

async function session(reelsFeed: ReelsFeed) {
  return { reelsWatched: await reelsWatched(reelsFeed), playingMinutes: await playingMinutes(reelsFeed) };
}

/** Waits for the Current Reel to be playing. */
async function reelPlays({ videos }: ReelsFeed) {
  await expect.poll(() => !videos[0]!.paused && videos[0]!.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA, TWO_REELS).toBe(true);
}

/** Scrolls the Reels Feed by hand, straight to its `n`th Reel. */
function scrollTo({ videos }: ReelsFeed, n: number) {
  videos[n]!.scrollIntoView({ block: 'center', behavior: 'instant' });
}

async function reelsWatched({ session }: ReelsFeed) {
  return (await session.get()).reelsWatched;
}

/** Playing minutes so far this Session, to the nearest minute. */
async function playingMinutes({ session }: ReelsFeed) {
  return Math.round((await session.get()).playingMs / MINUTE);
}
