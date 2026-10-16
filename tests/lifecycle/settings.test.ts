import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { createSettingsStore } from '@/settings/settings';

describe('settings store', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('reads the v3 defaults when nothing has been saved', async () => {
    const settings = createSettingsStore();

    expect(await settings.get()).toEqual({
      autoScroll: true,
      reelControlShown: true,
      speedOn: false,
      preferredSpeed: 1.5,
      shortcuts: {
        toggleAutoScroll: 'a',
        toggleSpeed: 's',
        nextReel: 'ArrowDown',
        previousReel: 'ArrowUp',
      },
      sessionLimit: { kind: 'off' },
    });
  });

  it('keeps a change and leaves the other settings at their defaults', async () => {
    const settings = createSettingsStore();

    await settings.set({ autoScroll: false, preferredSpeed: 2 });

    expect(await createSettingsStore().get()).toMatchObject({
      autoScroll: false,
      preferredSpeed: 2,
      reelControlShown: true,
      speedOn: false,
    });
  });

  it('tells every open tab about a change made in another', async () => {
    const popup = createSettingsStore();
    const tabA = vi.fn();
    const tabB = vi.fn();
    createSettingsStore().watch(tabA);
    createSettingsStore().watch(tabB);

    await popup.set({ speedOn: true });

    for (const tab of [tabA, tabB]) {
      await vi.waitFor(() =>
        expect(tab).toHaveBeenLastCalledWith(
          expect.objectContaining({ speedOn: true, autoScroll: true }),
        ),
      );
    }
  });

  it('stops telling a tab about changes once it stops watching', async () => {
    const closedTab = vi.fn();
    const openTab = vi.fn();
    const unwatch = createSettingsStore().watch(closedTab);
    createSettingsStore().watch(openTab);

    unwatch();
    await createSettingsStore().set({ autoScroll: false });

    await vi.waitFor(() => expect(openTab).toHaveBeenCalled());
    expect(closedTab).not.toHaveBeenCalled();
  });
});
