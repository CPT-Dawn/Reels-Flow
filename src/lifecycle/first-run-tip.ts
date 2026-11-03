import { storage } from 'wxt/utils/storage';

/**
 * Whether the viewer has closed the First-run Tip at the top of the Popup.
 * Kept on this device only: a new browser is a new place to learn the
 * Shortcut, and the Tip is no setting worth syncing.
 */
export interface FirstRunTip {
  isDismissed(): Promise<boolean>;
  dismiss(): Promise<void>;
}

const dismissed = storage.defineItem<boolean>('local:firstRunTipDismissed', { fallback: false });

export function createFirstRunTip(): FirstRunTip {
  return {
    isDismissed: () => dismissed.getValue(),
    dismiss: () => dismissed.setValue(true),
  };
}
