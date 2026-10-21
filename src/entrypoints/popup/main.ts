import { mountPopup } from '@/popup/popup';
import { createSessionStore } from '@/settings/session';
import { createSettingsStore } from '@/settings/settings';
import { createWhatsNew } from '@/lifecycle/whats-new';

document.title = browser.i18n.getMessage('popupTitle');

mountPopup(document, {
  settings: createSettingsStore(),
  session: createSessionStore(),
  whatsNew: createWhatsNew(),
  message: (key, substitutions) => browser.i18n.getMessage(key, substitutions),
  version: browser.runtime.getManifest().version,
  // Each store gets its own build, so the build knows its browser. Edge and
  // other Chromium browsers run the Chrome build and report "chrome".
  browser: import.meta.env.BROWSER,
});
