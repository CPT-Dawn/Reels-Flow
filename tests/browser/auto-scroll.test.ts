import { expect, it } from 'vitest';
import { aMomentLater, describeEachFixture, mountReelsFeed, TWO_REELS } from './support/feed';
import { createTestSettingsStore } from './support/settings';

describeEachFixture((fixture) => {
  it('lets the Current Reel loop while Auto-Scroll is off', async () => {
    const reelsFeed = await mountReelsFeed(fixture, {
      settings: createTestSettingsStore({ autoScroll: false }),
    });

    await expect.poll(() => reelsFeed.timeline, TWO_REELS).toEqual(['reel 0 started over']);
    await aMomentLater();

    expect(reelsFeed.timeline).toEqual(['reel 0 started over']);
  });

  it('applies Auto-Scroll being switched off and on at once, in every open tab', async () => {
    const settings = createTestSettingsStore();
    const tabs = [
      await mountReelsFeed(fixture, { settings }),
      await mountReelsFeed(fixture, { settings }),
    ];
    const timelines = () => tabs.map((tab) => tab.timeline);

    await settings.set({ autoScroll: false });
    await expect.poll(timelines, TWO_REELS).toEqual([
      ['reel 0 started over'],
      ['reel 0 started over'],
    ]);
    await settings.set({ autoScroll: true });

    await expect.poll(timelines, TWO_REELS).toEqual([
      ['reel 0 started over', 'reel 0 started over', 'Reels Feed scrolls', 'reel 1 in view'],
      ['reel 0 started over', 'reel 0 started over', 'Reels Feed scrolls', 'reel 1 in view'],
    ]);
  });
});
