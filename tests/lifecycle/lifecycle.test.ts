import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { startLifecycle } from '@/lifecycle/lifecycle';
import { createSettingsStore } from '@/settings/settings';
import { createWhatsNew } from '@/settings/whats-new';

const WELCOME = 'https://reelsflow.cptdawn.dev/welcome';

/** The pages the browser has opened in new tabs. */
async function openedPages() {
  const tabs = await fakeBrowser.tabs.query({});
  return tabs.flatMap((tab) => (tab.url ? [tab.url] : []));
}

// WXT's fake browser leaves the uninstall URL unimplemented; remember it here.
let uninstallUrl: string | undefined;

beforeEach(() => {
  fakeBrowser.reset();
  uninstallUrl = undefined;
  fakeBrowser.runtime.setUninstallURL = async (url?: string) => {
    uninstallUrl = url;
  };
  startLifecycle();
});

describe('uninstall', () => {
  it('opens the Goodbye Page', () => {
    expect(uninstallUrl).toBe('https://reelsflow.cptdawn.dev/goodbye');
  });
});

describe('fresh install', () => {
  it('opens the Welcome Page once', async () => {
    await fakeBrowser.runtime.onInstalled.trigger({ reason: 'install' });

    expect(await openedPages()).toEqual([WELCOME]);
  });
});

describe('upgrade from 2.x', () => {
  beforeEach(async () => {
    // What Reels Flow 2.x kept: both off unless the viewer turned them on.
    await fakeBrowser.storage.sync.set({ autoReelsStart: false, injectReelsButton: true });
  });

  const upgrade = () =>
    fakeBrowser.runtime.onInstalled.trigger({ reason: 'update', previousVersion: '2.1.0' });

  it('forgets the 2.x settings', async () => {
    await upgrade();

    expect(await fakeBrowser.storage.sync.get(['autoReelsStart', 'injectReelsButton'])).toEqual({});
  });

  it('starts the viewer on the v3 defaults, like a new install', async () => {
    await upgrade();

    expect(await fakeBrowser.storage.sync.get()).toEqual({
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

  it('opens the Welcome Page once', async () => {
    await upgrade();

    expect(await openedPages()).toEqual([WELCOME]);
  });
});

describe('later update', () => {
  const update = () =>
    fakeBrowser.runtime.onInstalled.trigger({ reason: 'update', previousVersion: '3.0.0' });

  it('opens nothing', async () => {
    await update();

    expect(await openedPages()).toEqual([]);
  });

  it("leaves What's new unread until the viewer opens it", async () => {
    const whatsNew = createWhatsNew();
    expect(await whatsNew.isUnread()).toBe(false);

    await update();

    expect(await whatsNew.isUnread()).toBe(true);
    await whatsNew.markRead();
    expect(await createWhatsNew().isUnread()).toBe(false);
  });

  it("keeps the viewer's settings", async () => {
    await createSettingsStore().set({ autoScroll: false, preferredSpeed: 2 });

    await update();

    expect(await createSettingsStore().get()).toMatchObject({ autoScroll: false, preferredSpeed: 2 });
  });
});
