import { expect, it } from 'vitest';
import { describeEachFixture, mountReelsFeed, TWO_REELS } from './support/feed';

describeEachFixture((fixture) => {
  it('Advances only when the Current Reel finishes, not a Reel out of view', async () => {
    const reelsFeed = await mountReelsFeed(fixture);
    const below = reelsFeed.videos[1]!;
    below.preload = 'auto';
    await expect.poll(() => below.duration, TWO_REELS).toBeGreaterThan(0);

    below.currentTime = below.duration - 0.3;
    void below.play();
    await expect.poll(() => reelsFeed.timeline, TWO_REELS).toEqual(['reel 1 started over']);
    // Instagram doesn't play a Reel out of view for long.
    below.pause();

    await expect.poll(() => reelsFeed.timeline, TWO_REELS).toEqual([
      'reel 1 started over',
      'reel 0 started over',
      'Reels Feed scrolls',
      'reel 1 in view',
    ]);
  });

  it('Advances from whichever Reel the viewer has scrolled to', async () => {
    const reelsFeed = await mountReelsFeed(fixture);

    reelsFeed.videos[2]!.scrollIntoView({ block: 'center', behavior: 'instant' });

    await expect.poll(() => reelsFeed.timeline, TWO_REELS).toEqual([
      'Reels Feed scrolls',
      'reel 2 in view',
      'reel 2 started over',
      'Reels Feed scrolls',
      'reel 3 in view',
    ]);
  });

  // One window cuts the Reels short; the other shows part of the next one too.
  it.each([
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
  ])('Advances the same way in a $width × $height window', async (viewport) => {
    const reelsFeed = await mountReelsFeed(fixture, { viewport });

    await expect.poll(() => reelsFeed.timeline, TWO_REELS).toEqual([
      'reel 0 started over',
      'Reels Feed scrolls',
      'reel 1 in view',
      'reel 1 started over',
      'Reels Feed scrolls',
      'reel 2 in view',
    ]);
  });

  it('Advances into Reels that Instagram loads as the viewer goes', async () => {
    const reelsFeed = await mountReelsFeed(fixture);

    const loaded = reelsFeed.loadReelBelow(reelsFeed.videos[0]!);

    await expect.poll(() => reelsFeed.timeline, TWO_REELS).toEqual([
      'reel 0 started over',
      'Reels Feed scrolls',
      'reel 1 in view',
      'reel 1 started over',
      'Reels Feed scrolls',
      'reel 2 in view',
    ]);
    expect(reelsFeed.videos[1]).toBe(loaded);
  });

  it('Advances onto the next Reel even before Instagram has loaded its video', async () => {
    const reelsFeed = await mountReelsFeed(fixture);
    const last = reelsFeed.videos.length - 1;

    reelsFeed.videos[last]!.scrollIntoView({ block: 'center', behavior: 'instant' });

    await expect.poll(() => reelsFeed.timeline, TWO_REELS).toEqual([
      'Reels Feed scrolls',
      `reel ${last} in view`,
      `reel ${last} started over`,
      'Reels Feed scrolls',
      'reel without a video in view',
    ]);
  });
});
