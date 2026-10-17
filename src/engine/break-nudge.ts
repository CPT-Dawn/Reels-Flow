import type { GetMessage } from './engine';

// Instagram's own dialog ("Unfollow?", "Log out?"): a rounded card over a dim
// backdrop, a title and a line of text, then full-width choices one above the
// other, the first in Instagram's button blue. Coloured from Instagram's
// variables, which follow its own dark or light setting. All of it lives in a
// shadow root, so none of it reaches the rest of Instagram.
const STYLE = `
dialog {
  box-sizing: border-box;
  width: 400px;
  max-width: calc(100vw - 32px);
  padding: 0;
  border: 0;
  border-radius: 12px;
  overflow: hidden;
  background: rgb(var(--ig-elevated-background, 255, 255, 255));
  color: rgb(var(--ig-primary-text, 0, 0, 0));
  text-align: center;
}
dialog::backdrop {
  background: rgba(0, 0, 0, 0.65);
}
.text {
  padding: 32px 32px 16px;
}
h2 {
  margin: 0;
  font-size: 20px;
  line-height: 25px;
  font-weight: 400;
}
p {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 18px;
  color: rgb(var(--ig-secondary-text, 115, 115, 115));
}
button {
  all: unset;
  box-sizing: border-box;
  display: block;
  width: 100%;
  min-height: 48px;
  padding: 4px 8px;
  border-top: 1px solid rgb(var(--ig-elevated-separator, 219, 219, 219));
  font-size: 14px;
  line-height: 18px;
  text-align: center;
  cursor: pointer;
}
button:active {
  background: rgba(var(--ig-primary-text, 0, 0, 0), 0.05);
}
button:focus-visible {
  outline: 2px solid rgb(var(--ig-primary-button, 0, 149, 246));
  outline-offset: -2px;
}
.keep-watching {
  font-weight: 700;
  color: rgb(var(--ig-primary-button, 0, 149, 246));
}
`;

export type BreakNudgeChoice = 'keepWatching' | 'done';

export type BreakNudge = {
  /** Shows the Break Nudge, unless it already shows; calls `onChoice` once with the viewer's answer. */
  show(onChoice: (choice: BreakNudgeChoice) => void): void;
  /** Takes the Break Nudge away unanswered. */
  remove(): void;
};

/**
 * The Break Nudge's notice: a modal dialog in Instagram's style, never the
 * browser's `alert()`. "Keep watching" comes first and has the focus, so
 * Space or Enter chooses it, as does Escape; "I'm done" is the other choice.
 * No countdown: it waits for the viewer.
 */
export function createBreakNudge(document: Document, getMessage: GetMessage): BreakNudge {
  let host: HTMLElement | undefined;

  const remove = () => {
    host?.remove();
    host = undefined;
  };

  return {
    show(onChoice) {
      if (host) return;
      host = document.createElement('div');
      host.setAttribute('data-reels-flow', 'break-nudge');
      const root = host.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = STYLE;

      const dialog = document.createElement('dialog');
      dialog.setAttribute('aria-labelledby', 'title');
      dialog.setAttribute('aria-describedby', 'text');
      const title = document.createElement('h2');
      title.id = 'title';
      title.textContent = getMessage('breakNudgeTitle');
      const text = document.createElement('p');
      text.id = 'text';
      text.textContent = getMessage('breakNudgeText');
      const words = document.createElement('div');
      words.className = 'text';
      words.append(title, text);

      const choose = (choice: BreakNudgeChoice) => {
        if (!host) return;
        dialog.close();
        remove();
        onChoice(choice);
      };
      const button = (label: string, className: string, choice: BreakNudgeChoice) => {
        const element = document.createElement('button');
        element.type = 'button';
        element.className = className;
        element.textContent = label;
        element.addEventListener('click', () => choose(choice));
        return element;
      };
      const keepWatching = button(getMessage('breakNudgeKeepWatching'), 'keep-watching', 'keepWatching');
      keepWatching.autofocus = true;
      const done = button(getMessage('breakNudgeDone'), 'done', 'done');

      dialog.append(words, keepWatching, done);
      // Escape dismisses it, which is to keep watching.
      dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        choose('keepWatching');
      });
      // The viewer's presses are the Break Nudge's alone: Instagram would
      // take Space for pause, and a click for pause or Like.
      for (const type of ['keydown', 'keyup', 'keypress', 'click', 'dblclick', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend']) {
        dialog.addEventListener(type, (event) => event.stopPropagation());
      }

      root.append(style, dialog);
      document.body.append(host);
      dialog.showModal();
      keepWatching.focus();
    },
    remove,
  };
}
