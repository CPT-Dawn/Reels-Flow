/** Keys that only change other keys, or that the keyboard hasn't settled on yet. */
const NOT_SHORTCUT_KEYS = [
  'Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'CapsLock', 'Fn', 'Dead', 'Process', 'Unidentified',
];

/**
 * The Shortcut binding a keydown is for: its `key`, letters in lower case so
 * Shift and Caps Lock don't matter. Undefined for a key combination with
 * Ctrl, Alt or Meta, which belong to the browser and the system, and for a
 * key that can't be a Shortcut on its own.
 */
export function shortcutKey(event: KeyboardEvent): string | undefined {
  if (event.ctrlKey || event.altKey || event.metaKey) return undefined;
  if (NOT_SHORTCUT_KEYS.includes(event.key)) return undefined;
  return event.key.length === 1 ? event.key.toLowerCase() : event.key;
}

const KEY_NAMES: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  ' ': 'Space',
};

/** How a Shortcut binding is shown to the viewer: `a` as A, `ArrowDown` as ↓. */
export function shortcutKeyName(key: string): string {
  return KEY_NAMES[key] ?? (key.length === 1 ? key.toUpperCase() : key);
}
