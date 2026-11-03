import { mountPopup } from '@/popup/popup';
import { createSessionStore } from '@/settings/session';
import { createSettingsStore } from '@/settings/settings';
import { createWhatsNew } from '@/lifecycle/whats-new';

document.title = browser.i18n.getMessage('popupTitle');

mountPopup(document, {
  settings: createSettingsStore(),
  session: createSessionStore(),
  whatsNew: createWhatsNew(),
  // Without the `tabs` permission, the host access to www.instagram.com is
  // what lets the Popup read an Instagram tab's address; any other tab's
  // stays undefined. That's all it needs, and the manifest stays minimal.
  activeTab: async () => (await browser.tabs.query({ active: true, currentWindow: true }))[0],
  openTab: async (url, tabId) => {
    if (tabId === undefined) await browser.tabs.create({ url });
    else await browser.tabs.update(tabId, { url });
    // The Popup has done its job; leave the viewer with the Reels Feed.
    window.close();
  },
  message: (key, substitutions) => browser.i18n.getMessage(key, substitutions),
  version: browser.runtime.getManifest().version,
  // Each store gets its own build, so the build knows its browser. Edge and
  // other Chromium browsers run the Chrome build and report "chrome".
  browser: import.meta.env.BROWSER,
});
