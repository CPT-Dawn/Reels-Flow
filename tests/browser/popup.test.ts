import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { mountPopup, type PopupOptions } from '@/popup/popup';
import type { SettingsStore } from '@/settings/settings';
import type { WhatsNew } from '@/settings/whats-new';
import { createTestSettingsStore } from './support/settings';

// The real English message file, which Vite serves from public/.
const messages: Record<string, { message: string }> = await (
  await fetch('/_locales/en/messages.json')
).json();

let unmount: (() => void) | undefined;

afterEach(() => {
  unmount?.();
  unmount = undefined;
  document.body.replaceChildren();
});

function openPopup(options: Partial<PopupOptions> & { settings: SettingsStore }) {
  unmount = mountPopup(document, {
    message: (key) => messages[key]!.message,
    version: '3.0.0',
    browser: 'chrome',
    openSettingsPage: () => {},
    whatsNew: whatsNewFlag(false),
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

describe('Settings Page', () => {
  it('opens from the Popup', async () => {
    let opened = 0;
    openPopup({ settings: createTestSettingsStore(), openSettingsPage: () => opened++ });

    await page.getByRole('button', { name: 'Settings' }).click();

    expect(opened).toBe(1);
  });
});
