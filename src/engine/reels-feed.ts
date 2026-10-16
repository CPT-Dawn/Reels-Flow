/**
 * The Current Reel tracker: the video of the Reel that has the largest share
 * of itself inside the viewport, or of two that share it fully, the larger.
 */
export function currentReelVideo(document: Document): HTMLVideoElement | undefined {
  const { innerWidth, innerHeight } = document.defaultView!;
  let current: HTMLVideoElement | undefined;
  let largestShare = 0;
  let largestArea = 0;
  for (const video of document.querySelectorAll('video')) {
    const { left, top, right, bottom, width, height } = video.getBoundingClientRect();
    const visibleWidth = Math.min(right, innerWidth) - Math.max(left, 0);
    const visibleHeight = Math.min(bottom, innerHeight) - Math.max(top, 0);
    if (visibleWidth <= 0 || visibleHeight <= 0) continue;
    const area = visibleWidth * visibleHeight;
    const share = area / (width * height);
    if (share > largestShare || (share === largestShare && area > largestArea)) {
      current = video;
      largestShare = share;
      largestArea = area;
    }
  }
  return current;
}

/**
 * The Advancer: scrolls the Reels Feed to the Reel below `video`'s.
 *
 * The Reels Feed is the nearest ancestor that scrolls vertically, and each of
 * its children is one Reel, whether or not Instagram has loaded its video yet.
 * Scrolling to an absolute position, not by an amount, means Advancing twice
 * from the same Reel still lands on the Reel right below it.
 */
export function advance(video: HTMLVideoElement) {
  const reelsFeed = scrollingAncestor(video);
  if (!reelsFeed) return;
  let reel: Element = video;
  while (reel.parentElement !== reelsFeed) reel = reel.parentElement!;
  let next = reel.nextElementSibling;
  while (next && next.getBoundingClientRect().height === 0) next = next.nextElementSibling;
  if (!next) return;

  reelsFeed.scrollTo({
    top: reelsFeed.scrollTop + next.getBoundingClientRect().top - reelsFeed.getBoundingClientRect().top,
    // A tab in the background draws no frames to animate a smooth scroll in.
    behavior: video.ownerDocument.visibilityState === 'hidden' ? 'instant' : 'smooth',
  });
}

function scrollingAncestor(element: Element) {
  const window = element.ownerDocument.defaultView!;
  for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
    const { overflowY } = window.getComputedStyle(ancestor);
    if ((overflowY === 'auto' || overflowY === 'scroll') && ancestor.scrollHeight > ancestor.clientHeight) {
      return ancestor;
    }
  }
  return null;
}
