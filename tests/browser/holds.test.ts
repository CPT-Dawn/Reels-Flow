import { expect, it } from 'vitest';
import {
  aMomentLater,
  describeEachFixture,
  mountReelsFeed,
  TWO_REELS,
  type ReelsFeed,
} from './support/feed';

// What the viewer sees when a held Reel finishes once, and Advances at its
// next end once the Hold is gone.
const HELD_ONCE = [
  'reel 0 started over',
  'reel 0 started over',
  'Reels Feed scrolls',
  'reel 1 in view',
];

// How long after the viewer scrolls by hand Auto-Scroll leaves them be.
const SCROLL_HOLD = 1500;

// The ways a viewer scrolls the Reels Feed by hand, over the Current Reel.
// They don't move it here: the Hold is about the viewer's hand, not the scroll.
const scrollsByHand: [string, (reelsFeed: ReelsFeed) => void][] = [
  [
    'the wheel',
    ({ window, videos }) =>
      videos[0]!.dispatchEvent(new window.WheelEvent('wheel', { bubbles: true, deltaY: 100 })),
  ],
  [
    'touch',
    // A plain event, since Firefox for desktop has no TouchEvent.
    ({ window, videos }) => videos[0]!.dispatchEvent(new window.Event('touchmove', { bubbles: true })),
  ],
  [
    'a key',
    ({ window, document }) =>
      document.body.dispatchEvent(new window.KeyboardEvent('keydown', { bubbles: true, key: 'PageDown' })),
  ],
];

describeEachFixture((fixture) => {
  it('Holds while the comments panel is open, and Advances at the next end once it is closed', async () => {
    const reelsFeed = await mountReelsFeed(fixture);
    const closeComments = await reelsFeed.openComments();

    await expectHeldUntil(reelsFeed, closeComments);
  });

  it.each(['Share', 'More'] as const)(
    'Holds while the %s menu is open, and Advances at the next end once it is closed',
    async (button) => {
      const reelsFeed = await mountReelsFeed(fixture);
      const closeMenu = reelsFeed.openMenu(button);

      await expectHeldUntil(reelsFeed, closeMenu);
    },
  );

  // Stand-ins for Instagram's search box and the message box of its chat
  // window: no fixture has captured either open.
  it.each([
    ['searching', '<input type="text" placeholder="Search">'],
    ['writing a message', '<div contenteditable="true" role="textbox" aria-label="Message"></div>'],
  ])('Holds while the viewer is %s, and Advances at the next end once they stop', async (_, html) => {
    const reelsFeed = await mountReelsFeed(fixture);
    const field = textField(reelsFeed.document, html);
    field.focus();

    await expectHeldUntil(reelsFeed, () => field.blur());
  });

  it.each(scrollsByHand)(
    'Holds if the viewer scrolled by hand with %s moments before, and Advances at the next end once they leave it be',
    async (_, scrollByHand) => {
      const reelsFeed = await mountReelsFeed(fixture);
      scrollByHand(reelsFeed);

      await expectHeldUntil(reelsFeed, () => reelsFeed.clock.advance(SCROLL_HOLD));
    },
  );

  it('Advances as usual when the viewer last scrolled by hand a while before', async () => {
    const reelsFeed = await mountReelsFeed(fixture);
    for (const [, scrollByHand] of scrollsByHand) scrollByHand(reelsFeed);
    reelsFeed.clock.advance(SCROLL_HOLD);

    await expect.poll(() => reelsFeed.timeline, TWO_REELS).toEqual([
      'reel 0 started over',
      'Reels Feed scrolls',
      'reel 1 in view',
    ]);
  });

  it('Holds a paused Reel taken to its end, and Advances at its next end once the viewer resumes it', async () => {
    const reelsFeed = await mountReelsFeed(fixture);
    const video = reelsFeed.videos[0]!;
    await expect.poll(() => video.currentTime / video.duration, TWO_REELS).toBeGreaterThan(0.5);

    video.pause();
    await aMomentLater();
    video.currentTime = video.duration;
    await aMomentLater();
    // Firefox reports an end even while paused, and Instagram starts it over.
    expect(reelsFeed.timeline).not.toContain('Reels Feed scrolls');
    void video.play();

    await expect.poll(() => reelsFeed.timeline, TWO_REELS).toEqual(HELD_ONCE);
  });

  it('Advances as usual in a background tab', async () => {
    const reelsFeed = await mountReelsFeed(fixture);
    // A test page can't be sent to the background: tell the Reels Feed it is.
    const { window, document } = reelsFeed;
    Object.defineProperty(document, 'visibilityState', { value: 'hidden' });
    Object.defineProperty(document, 'hidden', { value: true });
    Object.defineProperty(document, 'hasFocus', { value: () => false });
    document.dispatchEvent(new window.Event('visibilitychange'));
    window.dispatchEvent(new window.FocusEvent('blur'));

    await expect.poll(() => reelsFeed.timeline, TWO_REELS).toContain('reel 1 in view');
    // At the end of its first playthrough: without frames to animate in, the
    // scroll may land before or after Instagram starts the Reel over.
    const beforeAdvance = reelsFeed.timeline.slice(0, reelsFeed.timeline.indexOf('reel 1 in view'));
    expect(beforeAdvance.filter((seen) => seen === 'reel 0 started over').length).toBeLessThanOrEqual(1);
  });

  it('Advances as usual from a Reel the viewer paused mid-way and then resumed', async () => {
    const reelsFeed = await mountReelsFeed(fixture);
    const video = reelsFeed.videos[0]!;
    await expect.poll(() => video.currentTime / video.duration, TWO_REELS).toBeGreaterThan(0.3);

    video.pause();
    await aMomentLater();
    void video.play();

    await expect.poll(() => reelsFeed.timeline, TWO_REELS).toEqual([
      'reel 0 started over',
      'Reels Feed scrolls',
      'reel 1 in view',
    ]);
  });
});

/**
 * Expects the Current Reel to finish and be held, starting over in place,
 * then `release`s the Hold and expects an Advance at the Reel's next end.
 */
async function expectHeldUntil(reelsFeed: ReelsFeed, release: () => void) {
  await expect.poll(() => reelsFeed.timeline, TWO_REELS).toEqual(['reel 0 started over']);
  await aMomentLater();
  expect(reelsFeed.timeline).toEqual(['reel 0 started over']);
  release();

  await expect.poll(() => reelsFeed.timeline, TWO_REELS).toEqual(HELD_ONCE);
}

function textField(document: Document, html: string) {
  const template = document.createElement('template');
  template.innerHTML = html;
  const field = template.content.firstElementChild as HTMLElement;
  field.style.cssText = 'position: fixed; top: 16px; left: 16px; width: 200px; height: 32px';
  document.body.append(field);
  return field;
}
