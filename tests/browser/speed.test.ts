import { expect, it } from 'vitest';
import { aMomentLater, describeEachFixture, expectAdvancedTo, mountReelsFeed, TWO_REELS, type ReelsFeed } from './support/feed';
import { createTestSettingsStore } from './support/settings';

/** The Speed badge's text on the Reels Feed, or undefined while none shows. */
function badge(reelsFeed: ReelsFeed) {
  const host = reelsFeed.document.querySelector('[data-reels-flow="speed-badge"]');
  return host?.shadowRoot?.querySelector('span')?.textContent ?? undefined;
}

describeEachFixture((fixture) => {
  it('plays every Reel at the Preferred Speed while Speed is on, Reels loaded later too', async () => {
    const reelsFeed = await mountReelsFeed(fixture, {
      settings: createTestSettingsStore({ autoScroll: false, speedOn: true, preferredSpeed: 2 }),
    });
    await expect.poll(() => reelsFeed.videos.map((video) => video.playbackRate)).not.toContain(1);

    const loaded = reelsFeed.loadReelBelow(reelsFeed.videos[0]!);

    await expect.poll(() => loaded.playbackRate).toBe(2);
    expect(new Set(reelsFeed.videos.map((video) => video.playbackRate))).toEqual(new Set([2]));
  });

  it('puts the Preferred Speed back when Instagram resets it', async () => {
    const reelsFeed = await mountReelsFeed(fixture, {
      settings: createTestSettingsStore({ autoScroll: false, speedOn: true, preferredSpeed: 1.75 }),
    });
    const video = reelsFeed.videos[0]!;
    await expect.poll(() => video.playbackRate).toBe(1.75);

    video.playbackRate = 1;

    await expect.poll(() => video.playbackRate).toBe(1.75);
  });

  it('plays at 1x once Speed is switched off, and leaves the rate to Instagram after that', async () => {
    const settings = createTestSettingsStore({ autoScroll: false, speedOn: true, preferredSpeed: 2 });
    const reelsFeed = await mountReelsFeed(fixture, { settings });
    const video = reelsFeed.videos[0]!;
    await expect.poll(() => video.playbackRate).toBe(2);

    await settings.set({ speedOn: false });

    await expect.poll(() => reelsFeed.videos.map((video) => video.playbackRate)).not.toContain(2);
    video.playbackRate = 1.25;
    await aMomentLater();
    expect(video.playbackRate).toBe(1.25);
  });

  it('switches Speed on and off everywhere on S', async () => {
    const reelsFeed = await mountReelsFeed(fixture, { settings: createTestSettingsStore({ autoScroll: false }) });
    const press = () =>
      reelsFeed.document.body.dispatchEvent(
        new reelsFeed.window.KeyboardEvent('keydown', { key: 's', bubbles: true, cancelable: true }),
      );

    press();
    await expect.poll(async () => (await reelsFeed.settings.get()).speedOn).toBe(true);
    await expect.poll(() => reelsFeed.videos[0]!.playbackRate).toBe(1.5);

    press();
    await expect.poll(async () => (await reelsFeed.settings.get()).speedOn).toBe(false);
  });

  it('shows the new Speed on the Reel for about a second when Speed changes', async () => {
    const settings = createTestSettingsStore({ autoScroll: false });
    const reelsFeed = await mountReelsFeed(fixture, { settings });
    await aMomentLater();
    expect(badge(reelsFeed)).toBeUndefined();

    await settings.set({ speedOn: true });
    await expect.poll(() => badge(reelsFeed)).toBe('1.5x');
    reelsFeed.clock.advance(1200);
    expect(badge(reelsFeed)).toBeUndefined();

    await settings.set({ preferredSpeed: 2.25 });
    await expect.poll(() => badge(reelsFeed)).toBe('2.25x');

    await settings.set({ speedOn: false });
    await expect.poll(() => badge(reelsFeed)).toBe('1x');
  });

  it('shows the badge when Speed is switched on at a Preferred Speed of 1x', async () => {
    const settings = createTestSettingsStore({ autoScroll: false, preferredSpeed: 1 });
    const reelsFeed = await mountReelsFeed(fixture, { settings });
    await aMomentLater();

    await settings.set({ speedOn: true });

    await expect.poll(() => badge(reelsFeed)).toBe('1x');
  });

  it.each([0.5, 3])('Advances exactly at the end of each Reel at %sx', async (speed) => {
    const reelsFeed = await mountReelsFeed(fixture, {
      settings: createTestSettingsStore({ speedOn: true, preferredSpeed: speed }),
    });
    for (const video of reelsFeed.videos) video.loop = true;
    // Two Reels at half speed take twice as long to play out.
    const playOut = { timeout: TWO_REELS.timeout / Math.min(speed, 1) };

    await expectAdvancedTo(reelsFeed, 2, playOut);
  }, 30_000);
});
