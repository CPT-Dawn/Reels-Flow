import { expect, it } from 'vitest';
import { describeEachFixture, expectTimeline, mountReelsFeed } from './support/feed';

describeEachFixture((fixture) => {
  it('opens on the Reels Feed in the window it was captured in', async () => {
    const reelsFeed = await mountReelsFeed(fixture);

    expect(reelsFeed.window.location.pathname).toMatch(/^\/reels\//);
    expect(reelsFeed.window.innerWidth).toBe(fixture.viewport.width);
    expect(reelsFeed.window.innerHeight).toBe(fixture.viewport.height);
  });

  it("keeps Instagram's Reels and action buttons but nothing personal", async () => {
    const { document, videos } = await mountReelsFeed(fixture);
    const html = document.documentElement.outerHTML;

    expect(videos.length).toBeGreaterThanOrEqual(3);
    for (const label of ['Like', 'Comment', 'Share', 'Save', 'More']) {
      expect(document.querySelectorAll(`[aria-label="${label}"]`).length).toBeGreaterThanOrEqual(3);
    }
    expect(document.querySelectorAll('script, iframe, link, noscript')).toHaveLength(0);
    expect(html).not.toMatch(/data:image\/(jpeg|png|webp|gif)/);
    expect(html).not.toMatch(/https?:\/\/(?!www\.w3\.org\/)/);
  });

  it('leaves nothing behind once unmounted', async () => {
    const reelsFeed = await mountReelsFeed(fixture);

    reelsFeed.unmount();

    expect(document.querySelector('iframe')).toBeNull();
    expect(reelsFeed.document.defaultView).toBeNull();
  });

  it('plays a real clip in the Current Reel and loops it like Instagram', async () => {
    const reelsFeed = await mountReelsFeed(fixture);
    const playing = () => reelsFeed.videos.find((video) => !video.paused)!;

    await expect.poll(playing, { timeout: 5000 }).toBeDefined();
    const video = playing();
    await expect.poll(() => video.duration).toBeGreaterThan(1);
    await expect
      .poll(() => video.currentTime, { timeout: 5000 })
      .toBeGreaterThan(video.duration - 0.6);
    await expect.poll(() => video.currentTime, { timeout: 5000 }).toBeLessThan(0.6);
    expect(video.paused).toBe(false);
  });

  it('writes down a Reel starting over before the Advance it ended with, however busy the page', async () => {
    const reelsFeed = await mountReelsFeed(fixture);
    // Keeps the page busy right after the player starts a video over, so a
    // frame falls due, and the Advance scrolls, before the seek reports.
    for (const video of reelsFeed.videos) {
      video.addEventListener('ended', () => {
        const until = performance.now() + 40;
        while (performance.now() < until);
      });
    }

    await expectTimeline(reelsFeed, ['reel 0 started over', 'Reels Feed scrolls', 'reel 1 in view']);
  });
});
