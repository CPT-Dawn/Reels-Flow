import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { mountPopup, type PopupOptions } from '@/popup/popup';
import { DEFAULT_SETTINGS, type Settings, type SettingsStore } from '@/settings/settings';
import type { WhatsNew } from '@/lifecycle/whats-new';
import { createTestSessionStore } from './support/session';
import { createTestSettingsStore } from './support/settings';

// The real English message file, which Vite serves from public/.
const messages: Record<string, { message: string }> = await (
  await fetch('/_locales/en/messages.json')
).json();

/** `browser.i18n.getMessage`: fills in the message's placeholders in order. */
const message = (key: string, substitutions: string[] = []) => {
  let next = 0;
  return messages[key]!.message.replace(/\$\w+\$/g, () => substitutions[next++] ?? '');
};

// When the Popup opens, in ms since the epoch.
const NOW = Date.UTC(2026, 9, 17, 12);
const MINUTE = 60_000;

let unmount: (() => void) | undefined;

afterEach(() => {
  unmount?.();
  unmount = undefined;
  document.body.replaceChildren();
});

function openPopup(options: Partial<PopupOptions> & { settings: SettingsStore }) {
  unmount = mountPopup(document, {
    message,
    session: createTestSessionStore(),
    now: () => NOW,
    version: '3.0.0',
    browser: 'chrome',
    whatsNew: whatsNewFlag(false),
    // Most tests open the Popup over the Reels Feed.
    activeTab: async () => ({ id: 1, url: 'https://www.instagram.com/reels/' }),
    openTab: async () => {},
    ...options,
  });
}

/** An in-memory What's new flag, as an update would leave it. */
function whatsNewFlag(unread: boolean): WhatsNew {
  return {
    isUnread: async () => unread,
    markUnread: async () => void (unread = true),
    markRead: async () => void (unread = false),
  };
}

describe('Auto-Scroll switch', () => {
  it('shows the current setting', async () => {
    openPopup({ settings: createTestSettingsStore({ autoScroll: false }) });

    await expect.element(page.getByRole('switch', { name: 'Auto-Scroll' })).not.toBeChecked();
  });

  it('switches Auto-Scroll everywhere', async () => {
    const settings = createTestSettingsStore({ autoScroll: true });
    openPopup({ settings });
    const autoScroll = page.getByRole('switch', { name: 'Auto-Scroll' });
    await expect.element(autoScroll).toBeChecked();

    await autoScroll.click();

    await expect.poll(async () => (await settings.get()).autoScroll).toBe(false);
    await expect.element(autoScroll).not.toBeChecked();
  });

  it('follows a change made in another tab', async () => {
    const settings = createTestSettingsStore({ autoScroll: true });
    openPopup({ settings });
    const autoScroll = page.getByRole('switch', { name: 'Auto-Scroll' });
    await expect.element(autoScroll).toBeChecked();

    await settings.set({ autoScroll: false });

    await expect.element(autoScroll).not.toBeChecked();
  });
});

describe('Reel Control switch', () => {
  it('shows and hides the Reel Control everywhere', async () => {
    const settings = createTestSettingsStore({ reelControlShown: true });
    openPopup({ settings });
    const reelControl = page.getByRole('switch', { name: 'Button on Reels' });
    await expect.element(reelControl).toBeChecked();

    await reelControl.click();

    await expect.poll(async () => (await settings.get()).reelControlShown).toBe(false);
  });

  it('follows a change made in another tab', async () => {
    const settings = createTestSettingsStore({ reelControlShown: false });
    openPopup({ settings });
    const reelControl = page.getByRole('switch', { name: 'Button on Reels' });
    await expect.element(reelControl).not.toBeChecked();

    await settings.set({ reelControlShown: true });

    await expect.element(reelControl).toBeChecked();
  });
});

describe('links', () => {
  it('reports a problem with the version and browser in the link', async () => {
    openPopup({ settings: createTestSettingsStore(), version: '3.1.2', browser: 'firefox' });

    await expect
      .element(page.getByRole('link', { name: 'Report a problem' }))
      .toHaveAttribute('href', 'https://reelsflow.cptdawn.dev/report?version=3.1.2&browser=firefox');
  });

  it('links to the Support Page', async () => {
    openPopup({ settings: createTestSettingsStore() });

    await expect
      .element(page.getByRole('link', { name: 'Support Reels Flow' }))
      .toHaveAttribute('href', 'https://reelsflow.cptdawn.dev/support');
  });
});

describe("What's new", () => {
  const dot = () => page.getByRole('img', { name: 'New' });

  it('shows a dot after an update', async () => {
    openPopup({ settings: createTestSettingsStore(), whatsNew: whatsNewFlag(true) });

    await expect.element(dot()).toBeVisible();
  });

  it('shows no dot when there is nothing new', async () => {
    openPopup({ settings: createTestSettingsStore(), whatsNew: whatsNewFlag(false) });
    await expect.element(page.getByRole('link', { name: "What's new" })).toBeVisible();

    await expect.element(dot()).not.toBeInTheDocument();
  });

  it('clears the dot once the viewer opens it', async () => {
    const whatsNew = whatsNewFlag(true);
    openPopup({ settings: createTestSettingsStore(), whatsNew });
    const link = page.getByRole('link', { name: /What's new/ });
    await expect.element(link).toHaveAttribute('href', 'https://reelsflow.cptdawn.dev/welcome');
    await expect.element(dot()).toBeVisible();
    // Stay on the test page rather than following the link.
    document.addEventListener('click', (event) => event.preventDefault(), { once: true });

    await link.click();

    await expect.element(dot()).not.toBeInTheDocument();
    expect(await whatsNew.isUnread()).toBe(false);
  });
});

describe('Speed switch', () => {
  it('switches Speed on everywhere, and follows it being switched off elsewhere', async () => {
    const settings = createTestSettingsStore({ speedOn: false });
    openPopup({ settings });
    const speed = page.getByRole('switch', { name: 'Speed' });
    await expect.element(speed).not.toBeChecked();

    await speed.click();
    await expect.poll(async () => (await settings.get()).speedOn).toBe(true);

    await settings.set({ speedOn: false });
    await expect.element(speed).not.toBeChecked();
  });
});

describe('Reels Watched', () => {
  it('shows how many Reels the viewer has watched this Session', async () => {
    const session = createTestSessionStore({ reelsWatched: 12, lastSeenAt: NOW - MINUTE });
    openPopup({ settings: createTestSettingsStore(), session });

    await expect.element(page.getByRole('status', { name: 'Reels watched this session' })).toHaveTextContent('12');
  });

  it('counts on while the viewer watches in another tab', async () => {
    const session = createTestSessionStore({ reelsWatched: 12, lastSeenAt: NOW });
    openPopup({ settings: createTestSettingsStore(), session });
    const reelsWatched = page.getByRole('status', { name: 'Reels watched this session' });
    await expect.element(reelsWatched).toHaveTextContent('12');

    await session.update((stored) => ({ ...stored, reelsWatched: 13 }));

    await expect.element(reelsWatched).toHaveTextContent('13');
  });

  it('shows none once the viewer has been away from the Reels Feed for 30 minutes', async () => {
    const session = createTestSessionStore({ reelsWatched: 12, lastSeenAt: NOW - 30 * MINUTE });
    openPopup({ settings: createTestSettingsStore(), session });

    await expect.element(page.getByRole('status', { name: 'Reels watched this session' })).toHaveTextContent('0');
  });
});

describe('Session Limit', () => {
  const kind = (name: string) =>
    page.getByRole('radiogroup', { name: 'Session limit' }).getByRole('radio', { name });

  it('is off by default', async () => {
    openPopup({ settings: createTestSettingsStore() });

    await expect.element(kind('Off')).toBeChecked();
    await expect.element(page.getByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('sets a limit in Reels Watched', async () => {
    const settings = createTestSettingsStore();
    openPopup({ settings });

    await kind('Reels').click();
    const reels = page.getByRole('spinbutton', { name: 'Reels before a break' });
    await reels.fill('40');
    await userEvent.tab();

    await expect.poll(async () => (await settings.get()).sessionLimit).toEqual({ kind: 'reels', value: 40 });
  });

  it('sets a limit in minutes', async () => {
    const settings = createTestSettingsStore();
    openPopup({ settings });

    await kind('Minutes').click();
    const minutes = page.getByRole('spinbutton', { name: 'Minutes before a break' });
    await minutes.fill('45');
    await userEvent.tab();

    await expect.poll(async () => (await settings.get()).sessionLimit).toEqual({ kind: 'minutes', value: 45 });
  });

  it('turns the limit off', async () => {
    const settings = createTestSettingsStore({ sessionLimit: { kind: 'minutes', value: 20 } });
    openPopup({ settings });
    await expect.element(page.getByRole('spinbutton', { name: 'Minutes before a break' })).toHaveValue(20);

    await kind('Off').click();

    await expect.poll(async () => (await settings.get()).sessionLimit).toEqual({ kind: 'off' });
    await expect.element(page.getByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('steps the limit to the next multiple of five', async () => {
    const settings = createTestSettingsStore({ sessionLimit: { kind: 'reels', value: 32 } });
    openPopup({ settings });
    const reels = page.getByRole('spinbutton', { name: 'Reels before a break' });
    await expect.element(reels).toHaveValue(32);

    await page.getByRole('button', { name: 'Raise the limit' }).click();
    await expect.poll(async () => (await settings.get()).sessionLimit).toEqual({ kind: 'reels', value: 35 });

    await page.getByRole('button', { name: 'Lower the limit' }).click();
    await page.getByRole('button', { name: 'Lower the limit' }).click();
    await expect.poll(async () => (await settings.get()).sessionLimit).toEqual({ kind: 'reels', value: 25 });
    await expect.element(reels).toHaveValue(25);
  });

  it('never steps below one', async () => {
    const settings = createTestSettingsStore({ sessionLimit: { kind: 'minutes', value: 3 } });
    openPopup({ settings });
    const lower = page.getByRole('button', { name: 'Lower the limit' });

    await lower.click();

    await expect.poll(async () => (await settings.get()).sessionLimit).toEqual({ kind: 'minutes', value: 1 });
    await expect.element(lower).toBeDisabled();
  });

  it('shows how far this Session has come towards the limit', async () => {
    const session = createTestSessionStore({
      reelsWatched: 18,
      playingMs: 20 * MINUTE,
      lastSeenAt: NOW - MINUTE,
      limitFrom: { reelsWatched: 6, playingMs: 0 },
    });
    const settings = createTestSettingsStore({ sessionLimit: { kind: 'reels', value: 30 } });
    openPopup({ settings, session });

    await expect.element(page.getByText('12 of 30 Reels before a break')).toBeVisible();

    await settings.set({ sessionLimit: { kind: 'minutes', value: 45 } });

    await expect.element(page.getByText('20 of 45 minutes before a break')).toBeVisible();
  });

  it('keeps a limit of at least one', async () => {
    const settings = createTestSettingsStore({ sessionLimit: { kind: 'reels', value: 30 } });
    openPopup({ settings });
    const reels = page.getByRole('spinbutton', { name: 'Reels before a break' });

    await reels.fill('0');
    await userEvent.tab();

    await expect.poll(async () => (await settings.get()).sessionLimit).toEqual({ kind: 'reels', value: 1 });
    await expect.element(reels).toHaveValue(1);
  });

  it('follows a change made in another tab', async () => {
    const settings = createTestSettingsStore();
    openPopup({ settings });
    await expect.element(kind('Off')).toBeChecked();

    await settings.set({ sessionLimit: { kind: 'reels', value: 25 } });

    await expect.element(kind('Reels')).toBeChecked();
    await expect.element(page.getByRole('spinbutton', { name: 'Reels before a break' })).toHaveValue(25);
  });
});

describe('Preferred Speed', () => {
  const preferredSpeed = () => page.getByRole('slider', { name: 'Preferred Speed' });

  /** Moves the slider to `speed` and lets go, as dragging it would. */
  const slideTo = (speed: number) => {
    const slider = preferredSpeed().element() as HTMLInputElement;
    slider.value = String(speed);
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
  };

  it('offers 0.5x to 3x in steps of 0.25, at 1.5x to begin with', async () => {
    openPopup({ settings: createTestSettingsStore() });

    await expect.element(preferredSpeed()).toHaveValue('1.5');
    await expect.element(preferredSpeed()).toHaveAttribute('aria-valuetext', '1.5×');
    await expect.element(preferredSpeed()).toHaveAttribute('min', '0.5');
    await expect.element(preferredSpeed()).toHaveAttribute('max', '3');
    await expect.element(preferredSpeed()).toHaveAttribute('step', '0.25');
  });

  it('keeps the Preferred Speed the viewer picks', async () => {
    const settings = createTestSettingsStore();
    openPopup({ settings });
    await expect.element(preferredSpeed()).toBeEnabled();

    slideTo(2.25);

    await expect.poll(async () => (await settings.get()).preferredSpeed).toBe(2.25);
    await expect.element(page.getByText('Switch on to play Reels at 2.25×')).toBeVisible();
  });

  it('names the speed Reels play at while Speed is on', async () => {
    openPopup({ settings: createTestSettingsStore({ speedOn: true, preferredSpeed: 2 }) });

    await expect.element(page.getByText('Every Reel plays at 2×')).toBeVisible();
  });

  it('follows a change made in another tab', async () => {
    const settings = createTestSettingsStore();
    openPopup({ settings });
    await expect.element(preferredSpeed()).toHaveValue('1.5');

    await settings.set({ preferredSpeed: 0.75 });

    await expect.element(preferredSpeed()).toHaveValue('0.75');
  });
});

describe('Shortcuts', () => {
  /** Opens the Shortcuts, folded away to begin with, and returns the settings. */
  async function openShortcuts(initial: Partial<Settings> = {}) {
    const settings = createTestSettingsStore(initial);
    openPopup({ settings });
    const toggle = page.getByRole('button', { name: 'Keyboard shortcuts' });
    await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
    return settings;
  }

  /** A Shortcut's key, named for what it does, then its key. */
  const shortcut = (name: string) => page.getByRole('button', { name: new RegExp(`^${name} `) });

  const status = () => page.getByRole('region', { name: 'Keyboard shortcuts' }).getByRole('status');

  it('keeps the Shortcuts out of reach until the viewer opens them', async () => {
    openPopup({ settings: createTestSettingsStore() });

    await expect.element(shortcut('Auto-Scroll on/off')).not.toBeInTheDocument();
  });

  it('lists each Shortcut with its key', async () => {
    await openShortcuts({ shortcuts: { ...DEFAULT_SETTINGS.shortcuts, toggleSpeed: 'j' } });

    await expect.element(shortcut('Auto-Scroll on/off')).toHaveTextContent('A');
    await expect.element(shortcut('Speed on/off')).toHaveTextContent('J');
  });

  it('lists only Auto-Scroll and Speed, as Instagram moves between Reels itself', async () => {
    await openShortcuts();
    await expect.element(shortcut('Speed on/off')).toBeVisible();

    expect(page.getByRole('listitem').elements()).toHaveLength(2);
  });

  it('changes a Shortcut to the next key the viewer presses', async () => {
    const settings = await openShortcuts();

    await shortcut('Speed on/off').click();
    await expect.element(shortcut('Speed on/off')).toHaveTextContent('Press a key…');
    await userEvent.keyboard('J');

    await expect.poll(async () => (await settings.get()).shortcuts).toEqual({
      ...DEFAULT_SETTINGS.shortcuts,
      toggleSpeed: 'j',
    });
    await expect.element(shortcut('Speed on/off')).toHaveTextContent('J');
  });

  it('refuses a key another Shortcut already has, and waits for another', async () => {
    const settings = await openShortcuts();

    await shortcut('Speed on/off').click();
    await userEvent.keyboard('a');
    await expect.element(status()).toHaveTextContent('A is already a Shortcut.');
    expect((await settings.get()).shortcuts).toEqual(DEFAULT_SETTINGS.shortcuts);
    await userEvent.keyboard('j');

    await expect.poll(async () => (await settings.get()).shortcuts.toggleSpeed).toBe('j');
    await expect.element(status()).toBeEmptyDOMElement();
  });

  it('takes Space as a Shortcut without starting to wait for a key again', async () => {
    const settings = await openShortcuts();

    await shortcut('Speed on/off').click();
    await userEvent.keyboard(' ');

    await expect.poll(async () => (await settings.get()).shortcuts.toggleSpeed).toBe(' ');
    await expect.element(shortcut('Speed on/off')).toHaveTextContent('Space');
  });

  it('frees the keys of the next and previous Reel Shortcuts that 3.0.0 saved', async () => {
    const settings = await openShortcuts({
      shortcuts: { ...DEFAULT_SETTINGS.shortcuts, nextReel: 'ArrowDown' } as Settings['shortcuts'],
    });

    await shortcut('Speed on/off').click();
    await userEvent.keyboard('{ArrowDown}');

    await expect.poll(async () => (await settings.get()).shortcuts).toEqual({
      toggleAutoScroll: 'a',
      toggleSpeed: 'ArrowDown',
    });
  });

  it('keeps a Shortcut as it was when the viewer presses Escape', async () => {
    const settings = await openShortcuts();

    await shortcut('Speed on/off').click();
    await userEvent.keyboard('{Escape}');

    await expect.element(shortcut('Speed on/off')).toHaveTextContent('S');
    expect((await settings.get()).shortcuts).toEqual(DEFAULT_SETTINGS.shortcuts);
  });

  it('puts every Shortcut back to its default on Reset', async () => {
    const settings = await openShortcuts({ shortcuts: { toggleAutoScroll: 'q', toggleSpeed: 'w' } });
    await expect.element(shortcut('Speed on/off')).toHaveTextContent('W');

    await page.getByRole('button', { name: 'Reset Shortcuts' }).click();

    await expect.poll(async () => (await settings.get()).shortcuts).toEqual({ toggleAutoScroll: 'a', toggleSpeed: 's' });
    await expect.element(shortcut('Speed on/off')).toHaveTextContent('S');
  });

  it('follows a Shortcut changed in another tab', async () => {
    const settings = await openShortcuts();
    await expect.element(shortcut('Auto-Scroll on/off')).toHaveTextContent('A');

    await settings.set({ shortcuts: { ...DEFAULT_SETTINGS.shortcuts, toggleAutoScroll: 'k' } });

    await expect.element(shortcut('Auto-Scroll on/off')).toHaveTextContent('K');
  });
});

describe('Auto-Scroll card contrast', () => {
  type RGBA = [number, number, number, number];

  /** Every colour in a computed CSS value, as [r, g, b, alpha]. */
  const colours = (value: string): RGBA[] =>
    [...value.matchAll(/rgba?\(([^)]+)\)/g)].map((match) => {
      const [r, g, b, a = 1] = match[1]!.split(/[\s,/]+/).filter(Boolean).map(Number);
      return [r!, g!, b!, a];
    });

  /** `top` laid over the opaque `bottom`. */
  const over = ([r, g, b, a]: RGBA, bottom: RGBA): RGBA => [
    r * a + bottom[0] * (1 - a),
    g * a + bottom[1] * (1 - a),
    b * a + bottom[2] * (1 - a),
    1,
  ];

  const luminance = ([r, g, b]: RGBA) => {
    const linear = (channel: number) => {
      const c = channel / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  };

  /** The WCAG 2 contrast ratio between two opaque colours. */
  const contrast = (a: RGBA, b: RGBA) => {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (light! + 0.05) / (dark! + 0.05);
  };

  /**
   * The lowest contrast of any text on the card, taken against every stop of
   * its glow with the sheen's brightest point on top: the worst place the
   * text could land.
   */
  const lowestContrast = () => {
    const hero = document.querySelector('.rf-hero')!;
    const stops = colours(getComputedStyle(hero, '::before').backgroundImage);
    const sheen = colours(getComputedStyle(hero, '::after').backgroundImage)
      .filter(([r, g, b]) => r === 255 && g === 255 && b === 255)
      .reduce((brightest, [, , , a]) => Math.max(brightest, a), 0);
    const texts = [...hero.querySelectorAll('.rf-hero-title, .rf-hero-status, .rf-stat-count, .rf-stat-label, .rf-key-hint')];
    expect(stops.length).toBeGreaterThan(1);
    return Math.min(
      ...stops.flatMap((stop) => {
        const behind = over([255, 255, 255, sheen], stop);
        return texts.map((text) => {
          // The key hint draws its own cap behind its letter.
          const cap = colours(getComputedStyle(text).backgroundColor)[0];
          const under = cap ? over(cap, behind) : behind;
          return contrast(over(colours(getComputedStyle(text).color)[0]!, under), under);
        });
      }),
    );
  };

  it('keeps every text on the glowing card at WCAG AA, 4.5:1 or more', async () => {
    openPopup({ settings: createTestSettingsStore({ autoScroll: true }) });
    await expect.element(page.getByRole('switch', { name: 'Auto-Scroll' })).toBeChecked();
    await expect.element(page.getByRole('status', { name: 'Reels watched this session' })).toHaveTextContent('0');

    // Polled, as the text eases to white once Auto-Scroll shows as on.
    await expect.poll(lowestContrast, { timeout: 2000 }).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Open the Reels Feed', () => {
  const card = () => page.getByRole('region', { name: 'Reels Flow works on Instagram Reels' });
  const openReels = () => page.getByRole('button', { name: 'Open Reels' });

  /** Opens the Popup over a tab like `tab`, noting every tab it opens. */
  function openOver(tab: { id?: number; url?: string } | undefined) {
    const opened: { url: string; tabId?: number }[] = [];
    openPopup({
      settings: createTestSettingsStore(),
      activeTab: async () => tab,
      openTab: async (url, tabId) => void opened.push({ url, tabId }),
    });
    return opened;
  }

  it('opens the Reels Feed in a new tab from a page that is not Instagram', async () => {
    // Without host access to it, the tab's address is unknown.
    const opened = openOver({ id: 4 });
    await expect.element(card()).toBeVisible();

    await openReels().click();

    expect(opened).toEqual([{ url: 'https://www.instagram.com/reels/', tabId: undefined }]);
    await expect.element(card()).not.toBeInTheDocument();
  });

  it.each([
    ['the home feed', 'https://www.instagram.com/'],
    ['a single Reel page', 'https://www.instagram.com/reel/FIXTURE0001/'],
    ['an audio page', 'https://www.instagram.com/reels/audio/123/'],
  ])('takes the Instagram tab on %s to the Reels Feed', async (_, url) => {
    const opened = openOver({ id: 7, url });

    await openReels().click();

    expect(opened).toEqual([{ url: 'https://www.instagram.com/reels/', tabId: 7 }]);
  });

  it('opens a new tab when there is no tab to look at', async () => {
    const opened = openOver(undefined);

    await openReels().click();

    expect(opened).toEqual([{ url: 'https://www.instagram.com/reels/', tabId: undefined }]);
  });

  it.each([
    ['/reels/', 'https://www.instagram.com/reels/'],
    ['a Reel in the Reels Feed', 'https://www.instagram.com/reels/FIXTURE0001/'],
  ])('stays out of the way on %s', async (_, url) => {
    openOver({ id: 7, url });
    await expect.element(page.getByRole('switch', { name: 'Auto-Scroll' })).toBeEnabled();

    await expect.element(card()).not.toBeInTheDocument();
  });

  it('works by keyboard', async () => {
    const opened = openOver({ id: 4 });
    await expect.element(card()).toBeVisible();

    (openReels().element() as HTMLElement).focus();
    await userEvent.keyboard('{Enter}');

    expect(opened).toHaveLength(1);
  });
});
