import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { createFirstRunTip } from '@/lifecycle/first-run-tip';

describe('First-run Tip', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('shows until the viewer closes it', async () => {
    expect(await createFirstRunTip().isDismissed()).toBe(false);

    await createFirstRunTip().dismiss();

    expect(await createFirstRunTip().isDismissed()).toBe(true);
  });

  it('keeps its dismissal on this device only, never synced', async () => {
    await createFirstRunTip().dismiss();

    expect(await fakeBrowser.storage.local.get()).toEqual({ firstRunTipDismissed: true });
    expect(await fakeBrowser.storage.sync.get()).toEqual({});
  });
});
