import { storage } from 'wxt/utils/storage';

export type ShortcutAction =
  | 'toggleAutoScroll'
  | 'toggleSpeed'
  | 'nextReel'
  | 'previousReel';

/** A Shortcut binding is a `KeyboardEvent.key` value. */
export type Shortcuts = Record<ShortcutAction, string>;

export type SessionLimit =
  | { kind: 'off' }
  | { kind: 'reels' | 'minutes'; value: number };

export type Settings = {
  autoScroll: boolean;
  reelControlShown: boolean;
  speedOn: boolean;
  /** 0.5–3, in steps of 0.25. */
  preferredSpeed: number;
  shortcuts: Shortcuts;
  sessionLimit: SessionLimit;
};

export const DEFAULT_SETTINGS: Settings = {
  autoScroll: true,
  reelControlShown: true,
  speedOn: false,
  preferredSpeed: 1.5,
  shortcuts: {
    toggleAutoScroll: 'a',
    toggleSpeed: 's',
    nextReel: 'ArrowDown',
    previousReel: 'ArrowUp',
  },
  sessionLimit: { kind: 'off' },
};

export interface SettingsStore {
  get(): Promise<Settings>;
  set(changes: Partial<Settings>): Promise<void>;
  /**
   * Calls `listener` with the full settings whenever any of them changes,
   * from this page or any other. Returns a function that stops watching.
   */
  watch(listener: (settings: Settings) => void): () => void;
}

const KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];

// Each setting is its own synced key, so two tabs changing different
// settings at once never overwrite each other.
const storageKey = (key: keyof Settings) => `sync:${key}` as const;

export function createSettingsStore(): SettingsStore {
  const store: SettingsStore = {
    async get() {
      const items = await storage.getItems(
        KEYS.map((key) => ({
          key: storageKey(key),
          options: { fallback: DEFAULT_SETTINGS[key] },
        })),
      );
      return Object.fromEntries(
        items.map(({ value }, i) => [KEYS[i], value]),
      ) as Settings;
    },

    async set(changes) {
      await storage.setItems(
        Object.entries(changes).map(([key, value]) => ({
          key: storageKey(key as keyof Settings),
          value,
        })),
      );
    },

    watch(listener) {
      let watching = true;
      const unwatchers = KEYS.map((key) =>
        storage.watch(storageKey(key), async () => {
          const settings = await store.get();
          if (watching) listener(settings);
        }),
      );
      return () => {
        watching = false;
        unwatchers.forEach((unwatch) => unwatch());
      };
    },
  };
  return store;
}

/** Whether any setting has been saved, here or on another synced device. */
export async function hasSavedSettings(): Promise<boolean> {
  const items = await storage.getItems(KEYS.map(storageKey));
  return items.some(({ value }) => value != null);
}
