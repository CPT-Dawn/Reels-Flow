import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { createSessionStore, type Session } from '@/settings/session';

describe('session store', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('starts with no Reels Watched and no minutes', async () => {
    expect(await createSessionStore().get()).toEqual({ reelsWatched: 0, playingMs: 0, lastSeenAt: 0 });
  });

  it('keeps the Session in this browser only, never synced (ADR 0003)', async () => {
    await createSessionStore().update((session) => ({ ...session, reelsWatched: 3, lastSeenAt: 1000 }));

    expect(await createSessionStore().get()).toEqual({ reelsWatched: 3, playingMs: 0, lastSeenAt: 1000 });
    expect(await fakeBrowser.storage.sync.get()).toEqual({});
  });

  it('applies changes one after another, each to the Session the last one left', async () => {
    const session = createSessionStore();
    const count = (stored: Session) => ({ ...stored, reelsWatched: stored.reelsWatched + 1 });

    await Promise.all([session.update(count), session.update(count), session.update(count)]);

    expect((await session.get()).reelsWatched).toBe(3);
  });

  it('tells every open tab about a change', async () => {
    const tab = vi.fn();
    createSessionStore().watch(tab);

    await createSessionStore().update((session) => ({ ...session, reelsWatched: 5 }));

    await vi.waitFor(() => expect(tab).toHaveBeenLastCalledWith(expect.objectContaining({ reelsWatched: 5 })));
  });
});
