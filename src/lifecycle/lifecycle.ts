import { browser } from 'wxt/browser';
import { storage } from 'wxt/utils/storage';
import { createSettingsStore, DEFAULT_SETTINGS, hasSavedSettings } from '@/settings/settings';
import { createWhatsNew } from '@/lifecycle/whats-new';
import { GOODBYE_PAGE, WELCOME_PAGE } from '@/site';

/** What Reels Flow 2.x kept in synced storage, superseded by the v3 settings. */
const LEGACY_KEYS = ['sync:autoReelsStart', 'sync:injectReelsButton'] as const;

/**
 * Wires up what happens when Reels Flow is installed, updated or removed.
 * Call once, synchronously, when the background starts, so the browser's
 * install event is never missed.
 */
export function startLifecycle(): void {
  void browser.runtime.setUninstallURL(GOODBYE_PAGE);

  browser.runtime.onInstalled.addListener(async ({ reason, previousVersion }) => {
    if (reason === 'install') {
      await openWelcomePage();
    } else if (reason === 'update') {
      if (majorVersion(previousVersion) < 3) {
        await upgradeFromV2();
      } else {
        // Later updates never open a tab: the Popup shows a dot instead.
        await createWhatsNew().markUnread();
      }
    }
  });
}

/**
 * Everyone coming from 2.x starts afresh, as if newly installed: 2.x had
 * Auto-Scroll and its button off by default, which hid what v3 does. A
 * device upgrading after another synced one keeps what the viewer has
 * chosen there since.
 */
async function upgradeFromV2() {
  await storage.removeItems([...LEGACY_KEYS]);
  if (!(await hasSavedSettings())) {
    await createSettingsStore().set(DEFAULT_SETTINGS);
  }
  await openWelcomePage();
}

async function openWelcomePage() {
  await browser.tabs.create({ url: WELCOME_PAGE });
}

function majorVersion(version: string | undefined): number {
  return Number.parseInt(version ?? '', 10);
}
