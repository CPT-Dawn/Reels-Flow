import { expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { aMomentLater, describeEachFixture, mountReelsFeed, TWO_REELS, type ReelsFeed } from './support/feed';
import { DEFAULT_SETTINGS } from '@/settings/settings';
import { createTestSettingsStore } from './support/settings';

/** Every button on the page a screen reader would announce as "Auto-Scroll". */
function reelControls({ document }: ReelsFeed) {
  return [...document.querySelectorAll('*')]
    .flatMap((element) => [...(element.shadowRoot?.querySelectorAll('button') ?? [])])
    .filter((button) => button.getAttribute('aria-label') === 'Auto-Scroll');
}

/** Each Reel's More button, the last of Instagram's action buttons beside it. */
function moreButtons({ document }: ReelsFeed) {
  return [...document.querySelectorAll('svg[aria-label="More"]')];
}

/** The Reel Controls right above `more`, centred on it, as Instagram's own buttons are. */
function controlsAbove(reelsFeed: ReelsFeed, more: Element) {
  const moreBox = more.getBoundingClientRect();
  return reelControls(reelsFeed).filter((button) => {
    const box = button.getBoundingClientRect();
    const offCentre = box.left + box.width / 2 - (moreBox.left + moreBox.width / 2);
    return box.bottom <= moreBox.top && moreBox.top - box.bottom < 40 && Math.abs(offCentre) < 1;
  });
}

/** Whether the Reel Controls show Auto-Scroll on: each different answer once. */
function pressed(reelsFeed: ReelsFeed) {
  return [...new Set(reelControls(reelsFeed).map((button) => button.ariaPressed))];
}

/** Stands in for Instagram changing its page so that its action buttons can't be found: takes them away. */
function removeActionButtons({ document }: ReelsFeed) {
  for (const more of document.querySelectorAll('svg[aria-label="More"]')) {
    let rail = more.parentElement!;
    while (!rail.querySelector('svg[aria-label="Like"]')) rail = rail.parentElement!;
    rail.remove();
  }
}

/** Stands in for Instagram changing its page so that the Reels Feed can't be told apart either: stops it scrolling. */
function flattenReelsFeed({ window, videos }: ReelsFeed) {
  let reelsFeed = videos[0]!.parentElement!;
  while (!['auto', 'scroll'].includes(window.getComputedStyle(reelsFeed).overflowY)) reelsFeed = reelsFeed.parentElement!;
  reelsFeed.style.overflowY = 'visible';
}

/**
 * How many Reel Controls lie over each video, top to bottom: each in place
 * only once the Reel Controls have caught up with the page, a frame or more on.
 */
function controlsOverEachVideo(reelsFeed: ReelsFeed) {
  return reelsFeed.videos.map((video) => controlsOver(reelsFeed, video).length);
}

/** The boxes of the Reel Controls lying entirely over `video`. */
function controlsOver(reelsFeed: ReelsFeed, video: HTMLVideoElement) {
  const videoBox = video.getBoundingClientRect();
  return reelControls(reelsFeed).filter((button) => {
    const box = button.getBoundingClientRect();
    return box.left >= videoBox.left && box.right <= videoBox.right && box.top >= videoBox.top && box.bottom <= videoBox.bottom;
  });
}

describeEachFixture((fixture) => {
  it("puts a Reel Control among each Reel's action buttons, just above More", async () => {
    const reelsFeed = await mountReelsFeed(fixture);

    await expect.poll(() => reelControls(reelsFeed).length).toBe(moreButtons(reelsFeed).length);
    for (const more of moreButtons(reelsFeed)) expect(controlsAbove(reelsFeed, more)).toHaveLength(1);
  });

  it('shows Auto-Scroll on as a filled chevron and off as an outline, with an "Auto" label and its Shortcut on hover', async () => {
    const settings = createTestSettingsStore();
    const reelsFeed = await mountReelsFeed(fixture, { settings });
    await expect.poll(() => reelControls(reelsFeed).length).toBeGreaterThan(0);
    // How every Reel Control looks: each different look once.
    const looks = () =>
      [
        ...new Set(
          reelControls(reelsFeed).map((button) =>
            JSON.stringify({
              pressed: button.ariaPressed,
              chevron: reelsFeed.window.getComputedStyle(button.querySelector('svg *')!).fill === 'none' ? 'outline' : 'filled',
              label: button.innerText,
              title: button.title,
            }),
          ),
        ),
      ].map((look) => JSON.parse(look));

    expect(looks()).toEqual([{ pressed: 'true', chevron: 'filled', label: 'Auto', title: 'Auto-Scroll · A' }]);

    await settings.set({ autoScroll: false });
    await expect.poll(looks).toEqual([{ pressed: 'false', chevron: 'outline', label: 'Auto', title: 'Auto-Scroll · A' }]);
  });

  it("names the viewer's own Shortcut key on hover once they change it", async () => {
    const settings = createTestSettingsStore();
    const reelsFeed = await mountReelsFeed(fixture, { settings });
    await expect.poll(() => reelControls(reelsFeed).length).toBeGreaterThan(0);

    await settings.set({ shortcuts: { ...DEFAULT_SETTINGS.shortcuts, toggleAutoScroll: 'x' } });

    await expect.poll(() => [...new Set(reelControls(reelsFeed).map((button) => button.title))]).toEqual(['Auto-Scroll · X']);
  });

  it('switches Auto-Scroll off and on everywhere when the viewer clicks it, in every open tab', async () => {
    const settings = createTestSettingsStore();
    const tabs = [await mountReelsFeed(fixture, { settings }), await mountReelsFeed(fixture, { settings })];
    const inEveryTab = () => tabs.map(pressed);
    await expect.poll(inEveryTab).toEqual([['true'], ['true']]);

    reelControls(tabs[0]!)[0]!.click();

    await expect.poll(inEveryTab).toEqual([['false'], ['false']]);
    expect((await settings.get()).autoScroll).toBe(false);
    await expect.poll(() => tabs[1]!.timeline, TWO_REELS).toEqual(['reel 0 started over']);
    await aMomentLater();
    expect(tabs[1]!.timeline).toEqual(['reel 0 started over']);

    reelControls(tabs[1]!).at(-1)!.click();

    await expect.poll(inEveryTab).toEqual([['true'], ['true']]);
    await expect.poll(() => tabs[0]!.timeline, TWO_REELS).toContain('Reels Feed scrolls');
  });

  it("keeps the viewer's presses on the Reel Control from reaching Instagram, which would pause or Like the Reel", async () => {
    const reelsFeed = await mountReelsFeed(fixture);
    await expect.poll(() => reelControls(reelsFeed).length).toBeGreaterThan(0);
    const reachedInstagram: string[] = [];
    for (const type of ['click', 'dblclick', 'pointerdown', 'mousedown']) {
      reelsFeed.document.addEventListener(type, () => reachedInstagram.push(type));
    }

    const button = reelControls(reelsFeed)[0]!;
    for (const type of ['pointerdown', 'mousedown', 'click', 'dblclick']) {
      button.dispatchEvent(new reelsFeed.window.MouseEvent(type, { bubbles: true, composed: true }));
    }

    expect(reachedInstagram).toEqual([]);
  });

  it("shows the Reel Control as a round button over each video when Instagram's action buttons can't be found", async () => {
    const reelsFeed = await mountReelsFeed(fixture);
    await expect.poll(() => reelControls(reelsFeed).length).toBeGreaterThan(0);

    removeActionButtons(reelsFeed);

    await expect.poll(() => controlsOverEachVideo(reelsFeed)).toEqual(reelsFeed.videos.map(() => 1));
    expect(reelControls(reelsFeed)).toHaveLength(reelsFeed.videos.length);
    const button = reelControls(reelsFeed).find((button) => {
      const box = button.getBoundingClientRect();
      return box.bottom > 0 && box.top < reelsFeed.window.innerHeight;
    })!;
    const box = button.getBoundingClientRect();
    const onTop = reelsFeed.document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    expect(onTop?.shadowRoot?.contains(button), 'nothing of Instagram covers it').toBe(true);
    const look = reelsFeed.window.getComputedStyle(button);
    expect(look.borderRadius).toBe('50%');
    const [red, green, blue, alpha] = look.backgroundColor.match(/[\d.]+/g)!.map(Number);
    expect(Math.max(red!, green!, blue!), 'dark').toBeLessThan(80);
    expect(alpha, 'translucent').toBeLessThan(1);
    expect(button.ariaPressed).toBe('true');
    expect(button.title).toBe('Auto-Scroll · A');
  });

  it("finds Instagram's action buttons in any language Instagram is shown in", async () => {
    const reelsFeed = await mountReelsFeed(fixture);
    const spanish: Record<string, string> = { Like: 'Me gusta', Comment: 'Comentar', Repost: 'Volver a publicar', Share: 'Compartir', Save: 'Guardar', More: 'Más' };
    for (const icon of reelsFeed.document.querySelectorAll('svg[aria-label]')) {
      const label = icon.getAttribute('aria-label')!;
      if (spanish[label]) icon.setAttribute('aria-label', spanish[label]);
    }
    const masButtons = [...reelsFeed.document.querySelectorAll('svg[aria-label="Más"]')];

    await expect.poll(() => reelControls(reelsFeed).length).toBe(masButtons.length);
    for (const more of masButtons) expect(controlsAbove(reelsFeed, more)).toHaveLength(1);
  });

  it("takes Instagram's own colours for its dark or light setting", async () => {
    const reelsFeed = await mountReelsFeed(fixture);
    await expect.poll(() => reelControls(reelsFeed).length).toBeGreaterThan(0);
    const { getComputedStyle } = reelsFeed.window;
    const like = reelsFeed.document.querySelector('svg[aria-label="Like"]')!;
    let likeItem = like.parentElement!;
    while (!likeItem.querySelector('span[dir="auto"]')) likeItem = likeItem.parentElement!;
    const likeCount = likeItem.querySelector('span[dir="auto"]')!;
    const dark = reelsFeed.document.documentElement.classList.contains('__fb-dark-mode');

    for (const button of reelControls(reelsFeed)) {
      expect(getComputedStyle(button.querySelector('svg')!).color).toBe(getComputedStyle(like).color);
      expect(getComputedStyle(button.querySelector('span')!).color).toBe(getComputedStyle(likeCount).color);
      expect(getComputedStyle(button.querySelector('span')!).fontSize).toBe(getComputedStyle(likeCount).fontSize);
    }
    expect(getComputedStyle(like).color).toBe(dark ? 'rgb(245, 245, 245)' : 'rgb(12, 16, 20)');
  });

  it('can be reached with Tab and switched with the keyboard', async () => {
    const settings = createTestSettingsStore();
    const reelsFeed = await mountReelsFeed(fixture, { settings });
    await expect.poll(() => reelControls(reelsFeed).length).toBeGreaterThan(0);
    const button = reelControls(reelsFeed)[0]!;

    button.focus();
    expect(button.getRootNode()).toHaveProperty('activeElement', button);
    await userEvent.keyboard('{Enter}');
    await expect.poll(async () => (await settings.get()).autoScroll).toBe(false);
    await userEvent.keyboard(' ');

    await expect.poll(async () => (await settings.get()).autoScroll).toBe(true);
    await expect.poll(() => button.ariaPressed).toBe('true');
  });

  it("is hidden entirely while 'Reel Control shown' is off", async () => {
    const settings = createTestSettingsStore({ reelControlShown: false });
    const reelsFeed = await mountReelsFeed(fixture, { settings });
    await aMomentLater();
    expect(reelControls(reelsFeed)).toEqual([]);

    await settings.set({ reelControlShown: true });
    await expect.poll(() => reelControls(reelsFeed).length).toBe(moreButtons(reelsFeed).length);
    await settings.set({ reelControlShown: false });

    await expect.poll(() => reelControls(reelsFeed)).toEqual([]);
  });

  it('puts a working Reel Control on each Reel Instagram loads later', async () => {
    const reelsFeed = await mountReelsFeed(fixture);
    await expect.poll(() => reelControls(reelsFeed).length).toBe(moreButtons(reelsFeed).length);

    reelsFeed.loadReelBelow(reelsFeed.videos.at(-1)!);

    await expect.poll(() => reelControls(reelsFeed).length).toBe(moreButtons(reelsFeed).length);
    const [newReelControl] = controlsAbove(reelsFeed, moreButtons(reelsFeed).at(-1)!);
    newReelControl!.click();
    await expect.poll(() => pressed(reelsFeed)).toEqual(['false']);
  });

  it('takes every Reel Control away when the viewer leaves the Reels Feed, and puts them back on return', async () => {
    const reelsFeed = await mountReelsFeed(fixture);
    await expect.poll(() => reelControls(reelsFeed).length).toBeGreaterThan(0);

    reelsFeed.navigate('/explore/');
    reelsFeed.clock.advance(1000);
    expect(reelControls(reelsFeed)).toEqual([]);
    reelsFeed.navigate(fixture.path);
    reelsFeed.clock.advance(1000);

    expect(reelControls(reelsFeed).length).toBe(moreButtons(reelsFeed).length);
  });

  it('leaves the look of the rest of Instagram as it was', async () => {
    const reelsFeed = await mountReelsFeed(fixture, { settings: createTestSettingsStore({ reelControlShown: false }) });
    const { document, window } = reelsFeed;
    const instagram = [...document.body.querySelectorAll('*')].filter((_, i) => i % 50 === 0);
    const look = () =>
      instagram.map((element) => {
        const style = window.getComputedStyle(element);
        return [style.color, style.backgroundColor, style.font, style.display, style.padding, style.margin, style.border].join('|');
      });
    const before = { look: look(), sheets: document.styleSheets.length, adopted: document.adoptedStyleSheets.length };

    await reelsFeed.settings.set({ reelControlShown: true });
    await expect.poll(() => reelControls(reelsFeed).length).toBeGreaterThan(0);

    expect({ look: look(), sheets: document.styleSheets.length, adopted: document.adoptedStyleSheets.length }).toEqual(before);
  });

  it("still shows a Reel Control over each video when neither Instagram's action buttons nor the Reels Feed can be found", async () => {
    const reelsFeed = await mountReelsFeed(fixture);
    await expect.poll(() => reelControls(reelsFeed).length).toBeGreaterThan(0);

    flattenReelsFeed(reelsFeed);
    removeActionButtons(reelsFeed);

    await expect.poll(() => controlsOverEachVideo(reelsFeed)).toEqual(reelsFeed.videos.map(() => 1));
    expect(reelControls(reelsFeed)).toHaveLength(reelsFeed.videos.length);
  });
});
