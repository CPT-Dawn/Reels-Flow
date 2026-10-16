import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { mountPopup, type PopupOptions } from '@/popup/popup';
import type { SettingsStore } from '@/settings/settings';
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
    ...options,
  });
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

describe('Settings Page', () => {
  it('opens from the Popup', async () => {
    let opened = 0;
    openPopup({ settings: createTestSettingsStore(), openSettingsPage: () => opened++ });

    await page.getByRole('button', { name: 'Settings' }).click();

    expect(opened).toBe(1);
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
