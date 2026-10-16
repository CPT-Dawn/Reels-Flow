import type { Settings } from '@/settings/settings';
import { shortcutKeyName } from '@/settings/shortcut-key';
import type { GetMessage } from './engine';
import { reelsInFeed } from './reels-feed';

/** Instagram's action buttons beside a Reel: at least this many, or it isn't them. */
const MIN_ACTION_BUTTONS = 4;

// Everything the Reel Control looks like lives in its shadow root, where none
// of it can reach the rest of Instagram, and none of Instagram's styles can
// reach in. Only Instagram's colour variables, which it sets on the page root
// for its own dark or light setting, come through.
const STYLE = `
:host {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* As below Instagram's own buttons that show a count. */
  margin-bottom: 20px;
}
:host([data-place="video"]) {
  /* Over the video, above Instagram's mute button. */
  position: absolute;
  right: 16px;
  bottom: 56px;
  z-index: 1;
  margin: 0;
}
button {
  all: unset;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: rgb(var(--ig-primary-icon));
}
button:focus-visible {
  outline: 2px solid rgb(var(--ig-primary-button));
  outline-offset: 4px;
  border-radius: 4px;
}
:host([data-place="video"]) button {
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--ig-background-always-dark-blur, rgba(48, 48, 48, 0.4));
  backdrop-filter: blur(16px);
  color: rgb(var(--ig-text-on-media, 255, 255, 255));
}
svg {
  display: block;
  width: 24px;
  height: 24px;
}
:host([data-place="video"]) svg {
  width: 20px;
  height: 20px;
}
polygon {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linejoin: round;
}
[aria-pressed="true"] polygon {
  fill: currentColor;
}
span {
  font-size: 12px;
  line-height: 16px;
  font-weight: 400;
  color: rgb(var(--ig-primary-text));
}
:host([data-place="video"]) span {
  display: none;
}
`;

/** A chevron pointing down, in Instagram's 24px outline style: outlined when off, filled when on. */
const CHEVRON_DOWN = '4 6.5 12 14.5 20 6.5 20 11.5 12 19.5 4 11.5';

type ReelControl = { host: HTMLElement; button: HTMLButtonElement };

export type ReelControls = {
  /** Shows the Reel Controls as `settings` say, or hides them all. */
  update(settings: Settings): void;
  /** Takes every Reel Control off the page. */
  remove(): void;
};

/**
 * The Reel Control: an Auto-Scroll on/off button among each Reel's action
 * buttons, or over its video where those can't be found. Keeps one on every
 * Reel as Instagram loads, unloads and redraws them. Calls `onClick` when the
 * viewer presses one.
 */
export function placeReelControls(
  document: Document,
  { getMessage, onClick }: { getMessage: GetMessage; onClick: () => void },
): ReelControls {
  const window = document.defaultView!;
  // Keyed by the Reel each is on.
  const controls = new Map<Element, ReelControl>();
  let settings: Settings | undefined;
  let frame: number | undefined;

  const create = (): ReelControl => {
    const host = document.createElement('div');
    const root = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = STYLE;

    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', getMessage('reelControlName'));
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    chevron.setAttribute('points', CHEVRON_DOWN);
    svg.append(chevron);
    const label = document.createElement('span');
    label.setAttribute('aria-hidden', 'true');
    label.textContent = getMessage('reelControlLabel');
    button.append(svg, label);
    root.append(style, button);

    // Keep the viewer's presses to the Reel Control: Instagram would take a
    // click over the video for pause, and a double click for Like.
    for (const type of ['click', 'dblclick', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend']) {
      button.addEventListener(type, (event) => event.stopPropagation());
    }
    for (const type of ['keydown', 'keyup']) {
      button.addEventListener(type, (event) => {
        const { key } = event as KeyboardEvent;
        if (key === 'Enter' || key === ' ') event.stopPropagation();
      });
    }
    button.addEventListener('click', onClick);
    return { host, button };
  };

  const render = ({ button }: ReelControl, { autoScroll, shortcuts }: Settings) => {
    button.setAttribute('aria-pressed', String(autoScroll));
    button.title = getMessage('reelControlTitle', shortcutKeyName(shortcuts.toggleAutoScroll));
  };

  const sync = () => {
    if (frame !== undefined) window.cancelAnimationFrame(frame);
    frame = undefined;
    const placed = new Set<HTMLElement>();
    if (settings?.reelControlShown) {
      for (const reel of reelsInFeed(document)) {
        const rail = actionRail(reel);
        const video = reel.tagName === 'VIDEO' ? (reel as HTMLVideoElement) : reel.querySelector('video');
        if (!rail && !video) continue;
        let control = controls.get(reel);
        if (!control) {
          control = create();
          controls.set(reel, control);
        }
        if (rail) placeInRail(control.host, rail);
        else placeOverVideo(control.host, video!, reel);
        render(control, settings);
        placed.add(control.host);
      }
    }
    for (const [reel, control] of controls) {
      if (placed.has(control.host)) continue;
      control.host.remove();
      controls.delete(reel);
    }
  };

  // Instagram adds, removes and redraws Reels all the time. Catch up once a
  // frame at most, whatever it changed.
  const observer = new window.MutationObserver(() => {
    if (settings && frame === undefined) frame = window.requestAnimationFrame(sync);
  });
  observer.observe(document, { childList: true, subtree: true });

  return {
    update(changed) {
      settings = changed;
      sync();
    },
    remove() {
      observer.disconnect();
      settings = undefined;
      sync();
    },
  };
}

type ActionRail = { rail: Element; buttons: Element[] };

/**
 * Instagram's action buttons beside `reel` (Like, Comment, Share, Save,
 * More…), found by their shape alone so it works in any language: the
 * element, clear of the video, with the most of the Reel's labelled icon
 * buttons each in a child of its own. Undefined if no element holds enough.
 */
function actionRail(reel: Element): ActionRail | undefined {
  const buttonsIn = new Map<Element, Set<Element>>();
  for (const icon of reel.querySelectorAll('svg[aria-label]')) {
    const button = icon.closest('button, [role="button"]');
    if (!button || !reel.contains(button)) continue;
    let item = button;
    for (let container = button.parentElement; container; container = container.parentElement) {
      if (!buttonsIn.has(container)) buttonsIn.set(container, new Set());
      buttonsIn.get(container)!.add(item);
      if (container === reel) break;
      item = container;
    }
  }

  let best: ActionRail | undefined;
  for (const [rail, items] of buttonsIn) {
    if (items.size < MIN_ACTION_BUTTONS || items.size <= (best?.buttons.length ?? 0)) continue;
    if (rail.querySelector('video')) continue;
    best = { rail, buttons: [...items] };
  }
  return best;
}

/** Puts the Reel Control just above the last of Instagram's action buttons, More. */
function placeInRail(host: HTMLElement, { rail, buttons }: ActionRail) {
  const more = buttons.at(-1)!;
  host.setAttribute('data-place', 'rail');
  if (host.parentElement !== rail || host.nextElementSibling !== more) rail.insertBefore(host, more);
}

/**
 * Puts the Reel Control in the outermost box that is exactly the video's,
 * and that it can be positioned in, so it shows over the video and over
 * whatever Instagram lays across it.
 */
function placeOverVideo(host: HTMLElement, video: HTMLVideoElement, reel: Element) {
  const window = video.ownerDocument.defaultView!;
  const box = video.getBoundingClientRect();
  let frame = video.parentElement!;
  for (let container = frame; container && container !== reel; container = container.parentElement!) {
    if (!sameBox(container.getBoundingClientRect(), box)) break;
    if (window.getComputedStyle(container).position !== 'static') frame = container;
  }
  host.setAttribute('data-place', 'video');
  if (host.parentElement !== frame) frame.append(host);
}

function sameBox(a: DOMRect, b: DOMRect) {
  return (
    Math.abs(a.left - b.left) < 1 &&
    Math.abs(a.top - b.top) < 1 &&
    Math.abs(a.width - b.width) < 1 &&
    Math.abs(a.height - b.height) < 1
  );
}
