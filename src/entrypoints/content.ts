import { mountEngine } from '@/engine/engine';
import { createSessionStore } from '@/settings/session';
import { createSettingsStore } from '@/settings/settings';

export default defineContentScript({
  // All of Instagram, not just the Reels Feed: Instagram reaches /reels/
  // without a page load, so the engine must already be there to notice.
  matches: ['https://www.instagram.com/*'],
  main(ctx) {
    ctx.onInvalidated(
      mountEngine(document, {
        settings: createSettingsStore(),
        session: createSessionStore(),
        getMessage: (name, substitution) => browser.i18n.getMessage(name, substitution),
      }),
    );
  },
});
