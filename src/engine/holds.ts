import type { Clock } from './engine';

/**
 * What Instagram opens over the Reels Feed when the viewer steps in: the
 * comments panel, and the menus behind a Reel's Share and More buttons.
 */
const PANELS = 'dialog, [role="dialog"], [role="alertdialog"], [role="menu"]';

/** The kinds of `<input>` the viewer doesn't type into. */
const NOT_TYPED_INTO = ['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'];

/** How long after the viewer scrolls by hand Auto-Scroll leaves them be, in ms. */
const SCROLL_HOLD = 1500;

/** The keys that scroll the Reels Feed, Instagram's own and the browser's. */
const SCROLL_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];

export type Holds = {
  /** Whether Auto-Scroll should decline to Advance `video`, which has just ended. */
  isHeld(video: HTMLVideoElement): boolean;
  stop(): void;
};

/**
 * The Hold evaluator. It keeps track of which Reels were paused and of the
 * viewer scrolling by hand; the rest it reads off the page when asked, at
 * the moment a Reel ends. A background tab is not a Hold.
 */
export function watchHolds(document: Document, clock: Clock): Holds {
  // A video pauses by itself when it ends, before Instagram starts it over;
  // only a pause before its end is the viewer's.
  const pausedBeforeEnd = new WeakSet<EventTarget>();
  const onPause = (event: Event) => {
    const video = event.target as HTMLVideoElement;
    if (video.tagName !== 'VIDEO') return;
    if (video.ended) pausedBeforeEnd.delete(video);
    else pausedBeforeEnd.add(video);
  };
  const onPlay = (event: Event) => pausedBeforeEnd.delete(event.target!);

  let scrolledByHandAt = -Infinity;
  const scrolledByHand = () => {
    scrolledByHandAt = clock.now();
  };
  const onKeyDown = (event: Event) => {
    if (SCROLL_KEYS.includes((event as KeyboardEvent).key) && !typing(document)) scrolledByHand();
  };

  // Caught on the window as they go down: media events don't bubble, and
  // Instagram's handlers and the Shortcuts could stop the rest. Passive, so
  // scrolling never waits on Reels Flow.
  const window = document.defaultView!;
  const listeners: [string, (event: Event) => void][] = [
    ['pause', onPause],
    ['play', onPlay],
    ['wheel', scrolledByHand],
    ['touchmove', scrolledByHand],
    ['keydown', onKeyDown],
  ];
  const options = { capture: true, passive: true };
  for (const [type, listener] of listeners) window.addEventListener(type, listener, options);

  return {
    isHeld: (video) =>
      (video.paused && pausedBeforeEnd.has(video)) ||
      clock.now() - scrolledByHandAt < SCROLL_HOLD ||
      panelOpen(document) ||
      typing(document),
    stop() {
      for (const [type, listener] of listeners) window.removeEventListener(type, listener, options);
    },
  };
}

function panelOpen(document: Document) {
  return [...document.querySelectorAll(PANELS)].some((panel) =>
    panel.checkVisibility({ visibilityProperty: true }),
  );
}

/** Whether focus is in a text field: a comment, a message, a search. */
function typing(document: Document) {
  let focused = document.activeElement as HTMLElement | null;
  while (focused?.shadowRoot?.activeElement) focused = focused.shadowRoot.activeElement as HTMLElement;
  if (!focused) return false;
  if (focused.tagName === 'INPUT') return !NOT_TYPED_INTO.includes((focused as HTMLInputElement).type);
  return focused.tagName === 'TEXTAREA' || focused.isContentEditable;
}
