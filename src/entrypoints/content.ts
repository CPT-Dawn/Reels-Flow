export default defineContentScript({
  // All of Instagram, not just the Reels Feed: Instagram reaches /reels/
  // without a page load, so the engine must already be there to notice.
  matches: ['https://www.instagram.com/*'],
  main() {},
});
