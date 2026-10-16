import { mountEngine } from '@/engine/engine';
import { createSettingsStore } from '@/settings/settings';

export default defineContentScript({
  // All of Instagram, not just the Reels Feed: Instagram reaches /reels/
  // without a page load, so the engine must already be there to notice.
  matches: ['https://www.instagram.com/*'],
  main(ctx) {
    ctx.onInvalidated(mountEngine(document, { settings: createSettingsStore() }));
  },
});
