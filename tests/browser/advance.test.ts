import { expect, it } from 'vitest';
import { aMomentLater, describeEachFixture, mountReelsFeed, TWO_REELS } from './support/feed';

describeEachFixture((fixture) => {
  it('Advances to the next Reel each time the Current Reel finishes', async () => {
    const reelsFeed = await mountReelsFeed(fixture);

    await expect.poll(() => reelsFeed.timeline, TWO_REELS).toEqual([
      'reel 0 started over',
      'Reels Feed scrolls',
      'reel 1 in view',
      'reel 1 started over',
      'Reels Feed scrolls',
      'reel 2 in view',
    ]);
    expect(reelsFeed.videos.filter((video) => video.loop)).toEqual([]);
  });

  it("Advances the same way when Instagram's player loops Reels with `loop`, and leaves it set", async () => {
    const reelsFeed = await mountReelsFeed(fixture);
    for (const video of reelsFeed.videos) video.loop = true;

    await expect.poll(() => reelsFeed.timeline, TWO_REELS).toEqual([
      'reel 0 started over',
      'Reels Feed scrolls',
      'reel 1 in view',
      'reel 1 started over',
      'Reels Feed scrolls',
      'reel 2 in view',
    ]);
    expect(reelsFeed.videos.filter((video) => !video.loop)).toEqual([]);
  });

  it('Advances once per finished Reel at triple speed', async () => {
    const reelsFeed = await mountReelsFeed(fixture);
    for (const video of reelsFeed.videos) {
      video.loop = true;
      video.playbackRate = 3;
    }

    await expect.poll(() => reelsFeed.timeline, TWO_REELS).toEqual([
      'reel 0 started over',
      'Reels Feed scrolls',
      'reel 1 in view',
      'reel 1 started over',
      'Reels Feed scrolls',
      'reel 2 in view',
    ]);
  });

  it('plays a Reel to its end before Advancing when it is started over after a pause late on', async () => {
    const reelsFeed = await mountReelsFeed(fixture);
    const video = reelsFeed.videos[0]!;
    await expect.poll(() => video.currentTime / video.duration, TWO_REELS).toBeGreaterThan(0.55);
    video.pause();
    await aMomentLater();

    video.currentTime = 0;
    void video.play();

    await expect.poll(() => reelsFeed.timeline, TWO_REELS).toEqual([
      'reel 0 started over',
      'reel 0 started over',
      'Reels Feed scrolls',
      'reel 1 in view',
    ]);
  });

  it('plays a Reel to its end before Advancing when Instagram reloads its video late on', async () => {
    const reelsFeed = await mountReelsFeed(fixture);
    const video = reelsFeed.videos[0]!;
    await expect.poll(() => video.duration - video.currentTime, TWO_REELS).toBeLessThan(0.4);

    video.src = video.src;
    void video.play();

    await expect.poll(() => reelsFeed.timeline, TWO_REELS).toEqual([
      'reel 0 started over',
      'Reels Feed scrolls',
      'reel 1 in view',
    ]);
  });
});
