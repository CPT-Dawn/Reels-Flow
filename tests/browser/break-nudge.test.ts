import { expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { aMomentLater, describeEachFixture, mountReelsFeed, TWO_REELS, type ReelsFeed } from './support/feed';
import { createTestSessionStore } from './support/session';
import { createTestSettingsStore } from './support/settings';
import type { Settings } from '@/settings/settings';

// A Reel counts once it has been the Current Reel for about a second.
const OVER_A_SECOND = 1500;
const MINUTE = 60_000;

describeEachFixture((fixture) => {
  /** The Reels Feed with a Session Limit set, Reels looping in place. */
  const mount = (sessionLimit: Settings['sessionLimit'], options: Parameters<typeof mountReelsFeed>[1] = {}) =>
    mountReelsFeed(fixture, {
      settings: createTestSettingsStore({ autoScroll: false, sessionLimit }),
      ...options,
    });

  it('pauses the Current Reel and shows the Break Nudge once the Session reaches its limit in Reels', async () => {
    const reelsFeed = await mount(
      { kind: 'reels', value: 3 },
      { session: createTestSessionStore({ reelsWatched: 2 }) },
    );
    await reelPlays(reelsFeed);

    reelsFeed.clock.advance(OVER_A_SECOND);

    await expect.poll(() => breakNudge(reelsFeed)).toBeDefined();
    expect(reelsFeed.videos[0]!.paused).toBe(true);
  });

  it('shows no Break Nudge before the limit in Reels', async () => {
    const reelsFeed = await mount(
      { kind: 'reels', value: 3 },
      { session: createTestSessionStore({ reelsWatched: 1 }) },
    );
    await reelPlays(reelsFeed);

    reelsFeed.clock.advance(OVER_A_SECOND);
    await expect.poll(() => reelsWatched(reelsFeed)).toBe(2);
    await aMomentLater();

    expect(breakNudge(reelsFeed)).toBeUndefined();
    expect(reelsFeed.videos[0]!.paused).toBe(false);
  });

  it('shows the Break Nudge once Reels have played for the limit in minutes, and not before', async () => {
    const reelsFeed = await mount({ kind: 'minutes', value: 20 });
    await reelPlays(reelsFeed);

    reelsFeed.clock.advance(19 * MINUTE);
    await aMomentLater();
    expect(breakNudge(reelsFeed)).toBeUndefined();
    reelsFeed.clock.advance(MINUTE + OVER_A_SECOND);

    await expect.poll(() => breakNudge(reelsFeed)).toBeDefined();
    expect(reelsFeed.videos[0]!.paused).toBe(true);
  });

  it('counts minutes already played this Session, in other tabs too, towards the limit', async () => {
    const reelsFeed = await mount(
      { kind: 'minutes', value: 20 },
      { session: createTestSessionStore({ playingMs: 19 * MINUTE }) },
    );
    await reelPlays(reelsFeed);

    reelsFeed.clock.advance(MINUTE + OVER_A_SECOND);

    await expect.poll(() => breakNudge(reelsFeed)).toBeDefined();
  });

  it('shows no Break Nudge while the Session Limit is off', async () => {
    const reelsFeed = await mount({ kind: 'off' }, { session: createTestSessionStore({ reelsWatched: 500 }) });
    await reelPlays(reelsFeed);

    reelsFeed.clock.advance(120 * MINUTE);
    await aMomentLater();

    expect(breakNudge(reelsFeed)).toBeUndefined();
  });

  it('offers Keep watching first, and focuses it, so Space or Enter chooses it', async () => {
    const reelsFeed = await nudged(await mount({ kind: 'reels', value: 1 }));
    const nudge = breakNudge(reelsFeed)!;

    expect(nudge.buttons.map((button) => button.textContent)).toEqual(['Keep watching', "I'm done"]);
    expect(focused(reelsFeed)).toBe(nudge.buttons[0]);
  });

  it('is a dialog with a name and a description for screen readers', async () => {
    const reelsFeed = await nudged(await mount({ kind: 'reels', value: 1 }));
    const { dialog } = breakNudge(reelsFeed)!;

    expect(dialog.tagName).toBe('DIALOG');
    expect(dialog.matches(':modal')).toBe(true);
    const root = dialog.getRootNode() as ShadowRoot;
    expect(root.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBeTruthy();
    expect(root.getElementById(dialog.getAttribute('aria-describedby')!)?.textContent).toBeTruthy();
  });

  it('has no countdown', async () => {
    const reelsFeed = await nudged(await mount({ kind: 'reels', value: 1 }));
    const text = breakNudge(reelsFeed)!.dialog.textContent;

    reelsFeed.clock.advance(5 * MINUTE);
    await aMomentLater();

    expect(breakNudge(reelsFeed)!.dialog.textContent).toBe(text);
    expect(text).not.toMatch(/\d/);
  });

  it("follows Instagram's dark or light setting", async () => {
    const reelsFeed = await nudged(await mount({ kind: 'reels', value: 1 }));
    const instagramIsDark = reelsFeed.document.documentElement.classList.contains('__fb-dark-mode');

    const background = reelsFeed.window.getComputedStyle(breakNudge(reelsFeed)!.dialog).backgroundColor;

    expect(isDark(background)).toBe(instagramIsDark);
  });

  for (const key of ['Enter', ' ']) {
    it(`resumes the Reel with Auto-Scroll on when the viewer presses ${key === ' ' ? 'Space' : key}`, async () => {
      const reelsFeed = await nudged(
        await mount({ kind: 'reels', value: 1 }, { settings: createTestSettingsStore({ autoScroll: true, sessionLimit: { kind: 'reels', value: 1 } }) }),
      );

      await userEvent.keyboard(key === ' ' ? '[Space]' : `[${key}]`);

      await expect.poll(() => breakNudge(reelsFeed)).toBeUndefined();
      await expect.poll(() => reelsFeed.videos[0]!.paused).toBe(false);
      expect((await reelsFeed.settings.get()).autoScroll).toBe(true);
    });
  }

  it('resumes the Reel when the viewer clicks Keep watching, and keeps Auto-Scroll on', async () => {
    const reelsFeed = await nudged(
      await mount({ kind: 'reels', value: 1 }, { settings: createTestSettingsStore({ autoScroll: true, sessionLimit: { kind: 'reels', value: 1 } }) }),
    );

    choose(reelsFeed, 'Keep watching');

    await expect.poll(() => breakNudge(reelsFeed)).toBeUndefined();
    await expect.poll(() => reelsFeed.videos[0]!.paused).toBe(false);
    expect((await reelsFeed.settings.get()).autoScroll).toBe(true);
  });

  it("turns Auto-Scroll off and leaves the Reel paused when the viewer chooses I'm done", async () => {
    const reelsFeed = await nudged(
      await mount({ kind: 'reels', value: 1 }, { settings: createTestSettingsStore({ autoScroll: true, sessionLimit: { kind: 'reels', value: 1 } }) }),
    );

    choose(reelsFeed, "I'm done");

    await expect.poll(() => breakNudge(reelsFeed)).toBeUndefined();
    await expect.poll(async () => (await reelsFeed.settings.get()).autoScroll).toBe(false);
    await aMomentLater();
    expect(reelsFeed.videos[0]!.paused).toBe(true);
  });

  it('nudges again only after another full limit in Reels', async () => {
    const reelsFeed = await nudged(await mount({ kind: 'reels', value: 2 }, { session: createTestSessionStore({ reelsWatched: 1 }) }));
    choose(reelsFeed, 'Keep watching');
    await expect.poll(() => breakNudge(reelsFeed)).toBeUndefined();

    scrollTo(reelsFeed, 1);
    await reelPlays(reelsFeed, 1);
    reelsFeed.clock.advance(OVER_A_SECOND);
    await expect.poll(() => reelsWatched(reelsFeed)).toBe(3);
    await aMomentLater();
    expect(breakNudge(reelsFeed)).toBeUndefined();
    scrollTo(reelsFeed, 2);
    // The Break Nudge comes while a Reel plays, for it to pause.
    await reelPlays(reelsFeed, 2);
    reelsFeed.clock.advance(OVER_A_SECOND);

    await expect.poll(() => breakNudge(reelsFeed)).toBeDefined();
  });

  it('nudges again only after another full limit in minutes', async () => {
    const reelsFeed = await mount({ kind: 'minutes', value: 10 });
    await reelPlays(reelsFeed);
    reelsFeed.clock.advance(10 * MINUTE + OVER_A_SECOND);
    await expect.poll(() => breakNudge(reelsFeed)).toBeDefined();
    choose(reelsFeed, 'Keep watching');
    await reelPlays(reelsFeed);

    reelsFeed.clock.advance(9 * MINUTE);
    await aMomentLater();
    expect(breakNudge(reelsFeed)).toBeUndefined();
    reelsFeed.clock.advance(MINUTE + OVER_A_SECOND);

    await expect.poll(() => breakNudge(reelsFeed)).toBeDefined();
  });

  it('takes the Break Nudge away when the viewer leaves the Reels Feed', async () => {
    const reelsFeed = await nudged(await mount({ kind: 'reels', value: 1 }));

    reelsFeed.navigate('/explore/');
    reelsFeed.clock.advance(OVER_A_SECOND);

    await expect.poll(() => breakNudge(reelsFeed)).toBeUndefined();
  });
});

/** Lets the Current Reel count, and waits for the Break Nudge a limit of one Reel brings. */
async function nudged(reelsFeed: ReelsFeed) {
  await reelPlays(reelsFeed);
  reelsFeed.clock.advance(OVER_A_SECOND);
  await expect.poll(() => breakNudge(reelsFeed), TWO_REELS).toBeDefined();
  return reelsFeed;
}

/** The Break Nudge showing on the Reels Feed, or undefined while none does. */
function breakNudge({ document }: ReelsFeed) {
  for (const host of document.querySelectorAll('*')) {
    const dialog = host.shadowRoot?.querySelector<HTMLDialogElement>('dialog[open]');
    if (dialog) return { dialog, buttons: [...dialog.querySelectorAll('button')] };
  }
  return undefined;
}

/** Clicks the Break Nudge's button named `name`. */
function choose(reelsFeed: ReelsFeed, name: string) {
  breakNudge(reelsFeed)!.buttons.find((button) => button.textContent === name)!.click();
}

/** The element the keyboard is on, inside shadow roots too. */
function focused({ document }: ReelsFeed) {
  let element = document.activeElement;
  while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement;
  return element;
}

function isDark(color: string) {
  const [r, g, b] = color.match(/\d+(\.\d+)?/g)!.map(Number);
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! < 128;
}

/** Waits for the `n`th Reel, the Current Reel, to be playing. */
async function reelPlays({ videos }: ReelsFeed, n = 0) {
  await expect.poll(() => !videos[n]!.paused && videos[n]!.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA, TWO_REELS).toBe(true);
}

/** Scrolls the Reels Feed by hand, straight to its `n`th Reel. */
function scrollTo({ videos }: ReelsFeed, n: number) {
  videos[n]!.scrollIntoView({ block: 'center', behavior: 'instant' });
}

async function reelsWatched({ session }: ReelsFeed) {
  return (await session.get()).reelsWatched;
}
