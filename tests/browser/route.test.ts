import { expect, it } from 'vitest';
import { aMomentLater, describeEachFixture, mountReelsFeed, TWO_REELS } from './support/feed';

// Longer than Reels Flow takes to notice Instagram has changed pages.
const A_SECOND = 1000;

describeEachFixture((fixture) => {
  it.each([
    ['the home feed', '/'],
    ['Explore', '/explore/'],
    ['a profile', '/creator1/'],
    ['a single Reel page', '/reel/FIXTURE0001/'],
    ['DMs', '/direct/inbox/'],
  ])('does nothing on %s', async (_, path) => {
    const reelsFeed = await mountReelsFeed(fixture, { path });

    await expect.poll(() => reelsFeed.timeline, TWO_REELS).toEqual(['reel 0 started over']);
    await aMomentLater();

    expect(reelsFeed.timeline).toEqual(['reel 0 started over']);
  });

  it('starts when the viewer reaches the Reels Feed inside Instagram', async () => {
    const reelsFeed = await mountReelsFeed(fixture, { path: '/' });

    reelsFeed.navigate(fixture.path);
    reelsFeed.clock.advance(A_SECOND);

    await expect.poll(() => reelsFeed.timeline, TWO_REELS).toEqual([
      'reel 0 started over',
      'Reels Feed scrolls',
      'reel 1 in view',
    ]);
  });

  it('stops when the viewer leaves the Reels Feed, and starts again on return', async () => {
    const reelsFeed = await mountReelsFeed(fixture);

    reelsFeed.navigate('/explore/');
    reelsFeed.clock.advance(A_SECOND);
    await expect.poll(() => reelsFeed.timeline, TWO_REELS).toEqual(['reel 0 started over']);
    reelsFeed.navigate(fixture.path);
    reelsFeed.clock.advance(A_SECOND);

    await expect.poll(() => reelsFeed.timeline, TWO_REELS).toEqual([
      'reel 0 started over',
      'reel 0 started over',
      'Reels Feed scrolls',
      'reel 1 in view',
    ]);
  });
});
