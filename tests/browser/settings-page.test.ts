import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { DEFAULT_SETTINGS, type Settings } from '@/settings/settings';
import { mountSettingsPage } from '@/settings-page/settings-page';
import { createTestSettingsStore } from './support/settings';

// The real English message file, which Vite serves from public/.
const messages: Record<string, { message: string }> = await (
  await fetch('/_locales/en/messages.json')
).json();

/** `browser.i18n.getMessage` for a message with at most one placeholder. */
const message = (key: string, substitution = '') =>
  messages[key]!.message.replace(/\$\w+\$/, substitution);

let unmount: (() => void) | undefined;

afterEach(() => {
  unmount?.();
  unmount = undefined;
  document.body.replaceChildren();
});

function openSettingsPage(initial: Partial<Settings> = {}) {
  const settings = createTestSettingsStore(initial);
  unmount = mountSettingsPage(document, {
    settings,
    message,
  });
  return settings;
}

/** A Shortcut's key on the Settings Page, named for what it does, then its key. */
const shortcut = (name: string) => page.getByRole('button', { name: new RegExp(`^${name} `) });

describe('Shortcuts', () => {
  it("lists each Shortcut with its key", async () => {
    openSettingsPage({ shortcuts: { ...DEFAULT_SETTINGS.shortcuts, nextReel: 'j' } });

    await expect.element(shortcut('Auto-Scroll on/off')).toHaveTextContent('A');
    await expect.element(shortcut('Next Reel')).toHaveTextContent('J');
    await expect.element(shortcut('Previous Reel')).toHaveTextContent('↑');
  });

  it('changes a Shortcut to the next key the viewer presses', async () => {
    const settings = openSettingsPage();

    await shortcut('Next Reel').click();
    await expect.element(shortcut('Next Reel')).toHaveTextContent('Press a key…');
    await userEvent.keyboard('J');

    await expect.poll(async () => (await settings.get()).shortcuts).toEqual({
      ...DEFAULT_SETTINGS.shortcuts,
      nextReel: 'j',
    });
    await expect.element(shortcut('Next Reel')).toHaveTextContent('J');
  });

  it("refuses a key another Shortcut already has, and waits for another", async () => {
    const settings = openSettingsPage();

    await shortcut('Next Reel').click();
    await userEvent.keyboard('a');
    await expect.element(page.getByRole('status')).toHaveTextContent('A is already a Shortcut.');
    await userEvent.keyboard('s');
    await expect.element(page.getByRole('status')).toHaveTextContent('S is already a Shortcut.');
    expect((await settings.get()).shortcuts).toEqual(DEFAULT_SETTINGS.shortcuts);
    await userEvent.keyboard('j');

    await expect.poll(async () => (await settings.get()).shortcuts.nextReel).toBe('j');
    await expect.element(page.getByRole('status')).toBeEmptyDOMElement();
  });

  it('takes Space as a Shortcut without starting to wait for a key again', async () => {
    const settings = openSettingsPage();

    await shortcut('Next Reel').click();
    await userEvent.keyboard(' ');

    await expect.poll(async () => (await settings.get()).shortcuts.nextReel).toBe(' ');
    await expect.element(shortcut('Next Reel')).toHaveTextContent('Space');
  });

  it("keeps a Shortcut's own key when the viewer presses it again", async () => {
    const settings = openSettingsPage();

    await shortcut('Next Reel').click();
    await userEvent.keyboard('{ArrowDown}');

    await expect.element(shortcut('Next Reel')).toHaveTextContent('↓');
    await expect.element(page.getByRole('status')).toBeEmptyDOMElement();
    expect((await settings.get()).shortcuts).toEqual(DEFAULT_SETTINGS.shortcuts);
  });

  it('puts every Shortcut back to its default on Reset', async () => {
    const settings = openSettingsPage({
      shortcuts: { toggleAutoScroll: 'q', toggleSpeed: 'w', nextReel: 'j', previousReel: 'k' },
    });
    await expect.element(shortcut('Next Reel')).toHaveTextContent('J');

    await page.getByRole('button', { name: 'Reset Shortcuts' }).click();

    await expect.poll(async () => (await settings.get()).shortcuts).toEqual({
      toggleAutoScroll: 'a',
      toggleSpeed: 's',
      nextReel: 'ArrowDown',
      previousReel: 'ArrowUp',
    });
    await expect.element(shortcut('Next Reel')).toHaveTextContent('↓');
  });

  it('follows a Shortcut changed in another tab', async () => {
    const settings = openSettingsPage();
    await expect.element(shortcut('Previous Reel')).toHaveTextContent('↑');

    await settings.set({ shortcuts: { ...DEFAULT_SETTINGS.shortcuts, previousReel: 'k' } });

    await expect.element(shortcut('Previous Reel')).toHaveTextContent('K');
  });

  it('keeps a Shortcut as it was when the viewer presses Escape', async () => {
    const settings = openSettingsPage();

    await shortcut('Next Reel').click();
    await userEvent.keyboard('{Escape}');

    await expect.element(shortcut('Next Reel')).toHaveTextContent('↓');
    expect((await settings.get()).shortcuts).toEqual(DEFAULT_SETTINGS.shortcuts);
  });
});

describe('Preferred Speed', () => {
  it('offers 0.5x to 3x in steps of 0.25, at 1.5x to begin with', async () => {
    openSettingsPage();
    const preferredSpeed = page.getByRole('combobox', { name: 'Preferred Speed' });

    await expect.element(preferredSpeed).toHaveValue('1.5');
    const options = [...(preferredSpeed.element() as HTMLSelectElement).options].map((option) => option.text);
    expect(options).toEqual(['0.5x', '0.75x', '1x', '1.25x', '1.5x', '1.75x', '2x', '2.25x', '2.5x', '2.75x', '3x']);
  });

  it('keeps the Preferred Speed the viewer picks', async () => {
    const settings = openSettingsPage();
    const preferredSpeed = page.getByRole('combobox', { name: 'Preferred Speed' });
    await expect.element(preferredSpeed).toBeEnabled();

    await preferredSpeed.selectOptions('2.25x');

    await expect.poll(async () => (await settings.get()).preferredSpeed).toBe(2.25);
  });

  it('lists the Speed Shortcut, S by default', async () => {
    openSettingsPage();

    await expect.element(shortcut('Speed on/off')).toHaveTextContent('S');
  });
});
