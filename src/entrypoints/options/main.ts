import { mountSettingsPage } from '@/settings-page/settings-page';
import { createSettingsStore } from '@/settings/settings';

document.title = browser.i18n.getMessage('settingsPageTitle');

mountSettingsPage(document, {
  settings: createSettingsStore(),
  message: (key, substitution) => browser.i18n.getMessage(key, substitution),
});
