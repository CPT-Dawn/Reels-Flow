import type { Settings } from '@/settings/settings';
import type { Clock } from './engine';
import { currentReelVideo } from './reels-feed';

/** How long the Speed badge shows on the Reel after Speed changes, in ms. */
const BADGE_MS = 1000;

const BADGE_STYLE = `
:host {
  position: fixed;
  z-index: 2147483647;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
span {
  display: block;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font: 600 16px/20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
`;

export type Speed = {
  /** Plays every Reel as `settings` say, and shows the badge if Speed changed. */
  update(settings: Settings): void;
  /** Stops setting Reels' speed and takes the badge away. */
  stop(): void;
};

/**
 * Speed: while on, keeps every Reel's video at the Preferred Speed, setting
 * it again whenever Instagram loads a video or resets its rate. Switched off,
 * it puts each video back to 1x once and leaves the rate alone after that.
 * Shows a badge such as `1.5x` over the Current Reel for about a second each
 * time the speed it plays at changes.
 */
export function watchSpeed(document: Document, clock: Clock): Speed {
  /** The rate Reels must play at, or undefined while Speed is off. */
  let rate: number | undefined;
  /** The rate last shown, so the badge appears only on a change. */
  let shownRate: number | undefined;
  let badge: HTMLElement | undefined;
  let badgeTimer: number | undefined;

  const applyTo = (video: HTMLVideoElement) => {
    if (rate === undefined) return;
    video.defaultPlaybackRate = rate;
    if (video.playbackRate !== rate) video.playbackRate = rate;
  };

  const onVideoEvent = (event: Event) => {
    const video = event.target as HTMLVideoElement;
    if (video.tagName === 'VIDEO') applyTo(video);
  };
  // Media events don't bubble, so catch them on their way down to the video.
  const types = ['loadstart', 'loadedmetadata', 'play', 'playing', 'ratechange'];
  for (const type of types) document.addEventListener(type, onVideoEvent, true);

  const hideBadge = () => {
    if (badgeTimer !== undefined) clock.clearTimeout(badgeTimer);
    badgeTimer = undefined;
    badge?.remove();
    badge = undefined;
  };

  const showBadge = (text: string) => {
    hideBadge();
    const video = currentReelVideo(document);
    if (!video) return;
    const host = document.createElement('div');
    host.setAttribute('data-reels-flow', 'speed-badge');
    host.setAttribute('aria-hidden', 'true');
    const root = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = BADGE_STYLE;
    const label = document.createElement('span');
    label.textContent = text;
    root.append(style, label);
    const box = video.getBoundingClientRect();
    host.style.left = `${box.left + box.width / 2}px`;
    host.style.top = `${box.top + box.height / 2}px`;
    document.body.append(host);
    badge = host;
    badgeTimer = clock.setTimeout(hideBadge, BADGE_MS);
  };

  return {
    update({ speedOn, preferredSpeed }) {
      const next = speedOn ? preferredSpeed : 1;
      const wasOn = rate !== undefined;
      rate = speedOn ? preferredSpeed : undefined;
      if (shownRate === next) return;
      const videos = document.querySelectorAll('video');
      if (rate !== undefined) videos.forEach(applyTo);
      else if (wasOn) {
        videos.forEach((video) => {
          video.defaultPlaybackRate = 1;
          video.playbackRate = 1;
        });
      }
      // The first settings read sets the speed without announcing it.
      if (shownRate !== undefined) showBadge(`${next}x`);
      shownRate = next;
    },
    stop() {
      for (const type of types) document.removeEventListener(type, onVideoEvent, true);
      hideBadge();
    },
  };
}
