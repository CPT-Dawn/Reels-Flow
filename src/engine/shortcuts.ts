import type { ShortcutAction, Shortcuts } from '@/settings/settings';
import { shortcutKey } from '@/settings/shortcut-key';

/**
 * The Shortcut watcher: calls the action for a key the viewer presses on
 * `document`, looked up in the Shortcuts `shortcuts()` returns at the time,
 * once however long the key is held. It listens on the window as the key
 * goes down, before Instagram's own handlers can hear it. Returns a function
 * that stops watching.
 */
export function watchShortcuts(
  document: Document,
  shortcuts: () => Shortcuts | undefined,
  actions: Partial<Record<ShortcutAction, () => void>>,
): () => void {
  const window = document.defaultView!;

  const onKeyDown = (event: KeyboardEvent) => {
    const bindings = shortcuts();
    const key = shortcutKey(event);
    if (!bindings || !key || isTyping(event) || inPanel(event)) return;
    const action = (Object.keys(bindings) as ShortcutAction[]).find(
      (action) => bindings[action] === key,
    );
    const act = action && actions[action];
    if (!act) return;
    // Instagram's own handlers and the browser's scrolling would move the
    // Reels Feed a second time, so the key is Reels Flow's alone.
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!event.repeat) act();
  };

  window.addEventListener('keydown', onKeyDown, true);
  return () => window.removeEventListener('keydown', onKeyDown, true);
}

/** Whether the key went to somewhere the viewer types: a comment, a search, a message. */
function isTyping(event: KeyboardEvent) {
  const target = event.composedPath()[0] as HTMLElement;
  return (
    event.isComposing ||
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  );
}

/**
 * Whether the key went into something Instagram opened over the Reels Feed,
 * the comments or a menu, where Up and Down are the panel's own.
 */
function inPanel(event: KeyboardEvent) {
  const target = event.composedPath()[0] as HTMLElement;
  return target.closest('dialog, [role="dialog"], [role="alertdialog"], [role="menu"]') !== null;
}
