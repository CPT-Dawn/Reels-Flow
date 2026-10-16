import { mountPopup } from '@/popup/popup';
import { createSettingsStore } from '@/settings/settings';
import { createWhatsNew } from '@/settings/whats-new';

document.title = browser.i18n.getMessage('popupTitle');

mountPopup(document, {
  settings: createSettingsStore(),
  whatsNew: createWhatsNew(),
  message: (key) => browser.i18n.getMessage(key),
  version: browser.runtime.getManifest().version,
  // Each store gets its own build, so the build knows its browser.
  browser: import.meta.env.BROWSER,
  openSettingsPage: () => {
    void browser.runtime.openOptionsPage();
    window.close();
  },
});
