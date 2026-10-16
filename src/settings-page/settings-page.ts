import {
  DEFAULT_SETTINGS,
  type Settings,
  type SettingsStore,
  type ShortcutAction,
} from '@/settings/settings';
import { shortcutKey, shortcutKeyName } from '@/settings/shortcut-key';
import './settings-page.css';

/** The keys in the message files the Settings Page shows. */
export type SettingsPageMessage =
  | 'settingsPageTitle'
  | 'settingsShortcuts'
  | 'settingsShortcutsHint'
  | 'shortcutToggleAutoScroll'
  | 'shortcutNextReel'
  | 'shortcutPreviousReel'
  | 'settingsPressKey'
  | 'settingsKeyTaken'
  | 'settingsResetShortcuts';

export type SettingsPageOptions = {
  settings: SettingsStore;
  /**
   * Looks up a localised message by its key in the message files, filling
   * in its placeholder with `substitution`.
   */
  message: (key: SettingsPageMessage, substitution?: string) => string;
};

/** The Shortcuts the Settings Page lists, in order. */
const SHORTCUTS: { action: ShortcutAction; label: SettingsPageMessage }[] = [
  { action: 'toggleAutoScroll', label: 'shortcutToggleAutoScroll' },
  { action: 'nextReel', label: 'shortcutNextReel' },
  { action: 'previousReel', label: 'shortcutPreviousReel' },
];

/**
 * Builds the Settings Page into `document.body` and returns its teardown.
 */
export function mountSettingsPage(
  document: Document,
  { settings, message }: SettingsPageOptions,
): () => void {
  const element = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className: string,
    ...children: (Node | string)[]
  ) => {
    const node = document.createElement(tag);
    node.className = className;
    node.append(...children);
    return node;
  };

  /** The Shortcut waiting for the viewer to press its new key, if any. */
  let capturing: ShortcutAction | undefined;
  let current: Settings | undefined;

  const status = element('p', 'rf-status');
  status.setAttribute('role', 'status');

  const rows = SHORTCUTS.map(({ action, label }) => {
    const name = element('span', 'rf-shortcut-name', message(label));
    name.id = `rf-shortcut-${action}`;
    const key = element('button', 'rf-shortcut-key');
    key.type = 'button';
    key.id = `rf-shortcut-${action}-key`;
    // Read as "Next Reel ↓": what the Shortcut does, then its key.
    key.setAttribute('aria-labelledby', `${name.id} ${key.id}`);
    // Disabled until the settings arrive, so nothing shows a guess.
    key.disabled = true;
    key.addEventListener('click', () => (capturing === action ? capture(undefined) : capture(action)));
    key.addEventListener('keydown', (event) => onCaptureKey(action, event));
    key.addEventListener('blur', () => capturing === action && capture(undefined));
    return { action, key, row: element('li', 'rf-shortcut', name, key) };
  });

  const capture = (action: ShortcutAction | undefined) => {
    capturing = action;
    status.textContent = '';
    if (current) show(current);
  };

  const onCaptureKey = (action: ShortcutAction, event: KeyboardEvent) => {
    if (capturing !== action || !current) return;
    // Tab moves on, and the blur that follows stops capturing.
    if (event.key === 'Tab') return;
    if (event.key === 'Escape') {
      event.preventDefault();
      capture(undefined);
      return;
    }
    // A combination, or a key like Shift: wait for a key that can be a Shortcut.
    const key = shortcutKey(event);
    if (!key) return;
    event.preventDefault();
    // Every binding counts, listed here or not, so no key ever does two things.
    const taken = Object.entries(current.shortcuts).some(
      ([other, binding]) => other !== action && binding === key,
    );
    if (taken) {
      status.textContent = message('settingsKeyTaken', shortcutKeyName(key));
      return;
    }
    status.textContent = '';
    void settings.set({ shortcuts: { ...current.shortcuts, [action]: key } });
    capture(undefined);
  };

  const reset = element('button', 'rf-reset', message('settingsResetShortcuts'));
  reset.type = 'button';
  reset.addEventListener('click', () => {
    capture(undefined);
    void settings.set({ shortcuts: { ...DEFAULT_SETTINGS.shortcuts } });
  });

  const page = element(
    'main',
    'rf-settings-page',
    element('h1', 'rf-title', message('settingsPageTitle')),
    element(
      'section',
      'rf-section',
      element('h2', 'rf-section-title', message('settingsShortcuts')),
      element('p', 'rf-section-hint', message('settingsShortcutsHint')),
      element('ul', 'rf-shortcuts', ...rows.map(({ row }) => row)),
      status,
      reset,
    ),
  );
  document.body.append(page);

  const show = (settings: Settings) => {
    current = settings;
    for (const { action, key } of rows) {
      key.textContent =
        capturing === action
          ? message('settingsPressKey')
          : shortcutKeyName(settings.shortcuts[action]);
      key.classList.toggle('rf-capturing', capturing === action);
      key.disabled = false;
    }
  };

  let changedSinceRead = false;
  const unwatch = settings.watch((changed) => {
    changedSinceRead = true;
    show(changed);
  });
  void settings.get().then((read) => {
    if (!changedSinceRead) show(read);
  });

  return () => {
    unwatch();
    page.remove();
  };
}
