import { expect, it } from 'vitest';
import { aMomentLater, describeEachFixture, mountReelsFeed, type ReelsFeed } from './support/feed';
import { createTestSettingsStore } from './support/settings';
import { DEFAULT_SETTINGS } from '@/settings/settings';

// Longer than Reels Flow takes to notice Instagram has changed pages.
const A_SECOND = 1000;

/** `expect.poll` options with time for the Reels Feed to finish a smooth scroll, on a busy machine. */
const A_SCROLL = { timeout: 5_000 };

/**
 * Presses `key` on the Reels Feed, as the viewer would with focus on
 * `target`. Returns the keydown event, to see whether Reels Flow took it.
 */
function press(
  reelsFeed: ReelsFeed,
  key: string,
  { target = reelsFeed.document.body, ...init }: KeyboardEventInit & { target?: Element } = {},
) {
  const event = new reelsFeed.window.KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    composed: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

/** A Reels Feed that stays on the Current Reel unless a Shortcut moves it. */
function mountStill(fixture: Parameters<typeof mountReelsFeed>[0]) {
  return mountReelsFeed(fixture, { settings: createTestSettingsStore({ autoScroll: false }) });
}

describeEachFixture((fixture) => {
  it('goes to the next Reel on Down', async () => {
    const reelsFeed = await mountStill(fixture);

    press(reelsFeed, 'ArrowDown');

    await expect.poll(() => reelsFeed.timeline, A_SCROLL).toEqual(['Reels Feed scrolls', 'reel 1 in view']);
  });

  it('goes back to the previous Reel on Up', async () => {
    const reelsFeed = await mountStill(fixture);
    press(reelsFeed, 'ArrowDown');
    await expect.poll(() => reelsFeed.timeline, A_SCROLL).toEqual(['Reels Feed scrolls', 'reel 1 in view']);

    press(reelsFeed, 'ArrowUp');

    await expect.poll(() => reelsFeed.timeline, A_SCROLL).toEqual([
      'Reels Feed scrolls',
      'reel 1 in view',
      'Reels Feed scrolls',
      'reel 0 in view',
    ]);
  });

  it('switches Auto-Scroll off and on everywhere on A', async () => {
    const reelsFeed = await mountReelsFeed(fixture);

    press(reelsFeed, 'a');
    await expect.poll(async () => (await reelsFeed.settings.get()).autoScroll).toBe(false);

    press(reelsFeed, 'a');
    await expect.poll(async () => (await reelsFeed.settings.get()).autoScroll).toBe(true);
  });

  it('switches Auto-Scroll on A with Caps Lock or Shift too', async () => {
    const reelsFeed = await mountReelsFeed(fixture);

    press(reelsFeed, 'A', { shiftKey: true });

    await expect.poll(async () => (await reelsFeed.settings.get()).autoScroll).toBe(false);
  });

  it("keeps a Shortcut's key from Instagram and the browser, so a Reel is never skipped", async () => {
    const reelsFeed = await mountStill(fixture);
    const instagramHeard: string[] = [];
    const listen = (event: KeyboardEvent) => instagramHeard.push(event.key);
    reelsFeed.document.addEventListener('keydown', listen, true);
    reelsFeed.document.addEventListener('keydown', listen);

    const events = [press(reelsFeed, 'ArrowDown'), press(reelsFeed, 'a')];
    await expect.poll(() => reelsFeed.timeline, A_SCROLL).toEqual(['Reels Feed scrolls', 'reel 1 in view']);

    expect(events.filter((event) => !event.defaultPrevented)).toEqual([]);
    expect(instagramHeard).toEqual([]);
  });

  it('acts once for a key held down', async () => {
    const reelsFeed = await mountStill(fixture);

    press(reelsFeed, 'a');
    const repeats = [
      press(reelsFeed, 'a', { repeat: true }),
      press(reelsFeed, 'a', { repeat: true }),
    ];
    await aMomentLater();

    expect((await reelsFeed.settings.get()).autoScroll).toBe(true);
    expect(repeats.filter((event) => !event.defaultPrevented)).toEqual([]);
  });

  it('leaves keys to the comments or a menu while the viewer is in one', async () => {
    const reelsFeed = await mountStill(fixture);
    const { document } = reelsFeed;
    const comments = document.createElement('div');
    comments.setAttribute('role', 'dialog');
    const comment = document.createElement('button');
    comments.append(comment);
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    const item = document.createElement('div');
    item.setAttribute('role', 'menuitem');
    menu.append(item);
    document.body.append(comments, menu);

    const events = [comment, item].flatMap((target) => [
      press(reelsFeed, 'ArrowDown', { target }),
      press(reelsFeed, 'a', { target }),
    ]);
    await aMomentLater();

    expect(events.filter((event) => event.defaultPrevented)).toEqual([]);
    expect((await reelsFeed.settings.get()).autoScroll).toBe(false);
    expect(reelsFeed.timeline).toEqual([]);
  });

  it("leaves the browser's and the system's own key combinations alone", async () => {
    const reelsFeed = await mountStill(fixture);

    const events = [
      press(reelsFeed, 'a', { ctrlKey: true }),
      press(reelsFeed, 'a', { metaKey: true }),
      press(reelsFeed, 'a', { altKey: true }),
      press(reelsFeed, 'ArrowDown', { altKey: true }),
      press(reelsFeed, 'ArrowDown', { ctrlKey: true }),
    ];
    await aMomentLater();

    expect(events.filter((event) => event.defaultPrevented)).toEqual([]);
    expect((await reelsFeed.settings.get()).autoScroll).toBe(false);
    expect(reelsFeed.timeline).toEqual([]);
  });

  it('leaves keys alone while the viewer is typing', async () => {
    const reelsFeed = await mountStill(fixture);
    const { document } = reelsFeed;
    const comment = document.createElement('textarea');
    const search = document.createElement('input');
    const message = document.createElement('div');
    message.contentEditable = 'true';
    const inMessage = document.createElement('span');
    message.append(inMessage);
    document.body.append(comment, search, message);

    const events = [comment, search, message, inMessage].flatMap((target) => [
      press(reelsFeed, 'a', { target }),
      press(reelsFeed, 'ArrowDown', { target }),
    ]);
    await aMomentLater();

    expect(events.filter((event) => event.defaultPrevented)).toEqual([]);
    expect((await reelsFeed.settings.get()).autoScroll).toBe(false);
    expect(reelsFeed.timeline).toEqual([]);
  });
});

describeEachFixture((fixture) => {
  it.each([
    ['the home feed', '/'],
    ['a single Reel page', '/reel/FIXTURE0001/'],
    ['DMs', '/direct/inbox/'],
  ])('leaves keys alone on %s', async (_, path) => {
    const reelsFeed = await mountReelsFeed(fixture, {
      path,
      settings: createTestSettingsStore({ autoScroll: false }),
    });

    const events = [press(reelsFeed, 'a'), press(reelsFeed, 'ArrowDown')];
    await aMomentLater();

    expect(events.filter((event) => event.defaultPrevented)).toEqual([]);
    expect((await reelsFeed.settings.get()).autoScroll).toBe(false);
  });

  it('stops taking keys once the viewer leaves the Reels Feed', async () => {
    const reelsFeed = await mountStill(fixture);

    reelsFeed.navigate('/explore/');
    reelsFeed.clock.advance(A_SECOND);
    const event = press(reelsFeed, 'ArrowDown');
    await aMomentLater();

    expect(event.defaultPrevented).toBe(false);
    expect(reelsFeed.timeline).toEqual([]);
  });

  it('follows a Shortcut changed on the Settings Page at once, in every open tab', async () => {
    const settings = createTestSettingsStore({ autoScroll: false });
    const tabs = [
      await mountReelsFeed(fixture, { settings }),
      await mountReelsFeed(fixture, { settings }),
    ];

    await settings.set({ shortcuts: { ...DEFAULT_SETTINGS.shortcuts, nextReel: 'j' } });
    const downs = tabs.map((tab) => press(tab, 'ArrowDown'));
    await aMomentLater();
    expect(downs.filter((event) => event.defaultPrevented)).toEqual([]);
    expect(tabs.map((tab) => tab.timeline)).toEqual([[], []]);

    tabs.forEach((tab) => press(tab, 'j'));

    await expect.poll(() => tabs.map((tab) => tab.timeline), A_SCROLL).toEqual([
      ['Reels Feed scrolls', 'reel 1 in view'],
      ['Reels Feed scrolls', 'reel 1 in view'],
    ]);
  });
});
