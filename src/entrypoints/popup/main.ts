import { mountPopup } from '@/popup/popup';
import { createSessionStore } from '@/settings/session';
import { createSettingsStore } from '@/settings/settings';

document.title = browser.i18n.getMessage('popupTitle');

mountPopup(document, {
  settings: createSettingsStore(),
  session: createSessionStore(),
  message: (key) => browser.i18n.getMessage(key),
  version: browser.runtime.getManifest().version,
  // Each store gets its own build, so the build knows its browser.
  browser: import.meta.env.BROWSER,
  openSettingsPage: () => {
    void browser.runtime.openOptionsPage();
    window.close();
  },
});
