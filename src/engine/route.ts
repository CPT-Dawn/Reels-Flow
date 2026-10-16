import type { Clock } from './engine';

/**
 * How often to check which page Instagram is on, in ms. It changes pages
 * without a page load and without an event a content script could hear.
 */
const CHECK_INTERVAL = 500;

/**
 * Whether `pathname` is the Reels Feed: /reels/, or /reels/<Reel>/ as
 * Instagram shows it while the Reels Feed is scrolled. Not a single Reel page
 * (/reel/<Reel>/) or an audio page (/reels/audio/<id>/).
 */
function isReelsFeed(pathname: string) {
  return /^\/reels(\/[^/]+)?\/?$/.test(pathname);
}

/**
 * The Route watcher: calls `mount` whenever the page becomes the Reels Feed,
 * and the teardown it returns when the page leaves it. Returns a function
 * that stops watching and tears down.
 */
export function whileOnReelsFeed(
  window: Window,
  clock: Clock,
  mount: () => () => void,
): () => void {
  let unmount: (() => void) | undefined;
  let timer: number;

  const check = () => {
    const onReelsFeed = isReelsFeed(window.location.pathname);
    if (onReelsFeed && !unmount) {
      unmount = mount();
    } else if (!onReelsFeed && unmount) {
      unmount();
      unmount = undefined;
    }
    timer = clock.setTimeout(check, CHECK_INTERVAL);
  };
  check();

  return () => {
    clock.clearTimeout(timer);
    unmount?.();
  };
}
