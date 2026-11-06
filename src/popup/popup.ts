import { NO_SESSION, sessionAt, type Session, type SessionStore } from '@/settings/session';
import {
  DEFAULT_SETTINGS,
  type SessionLimit,
  type Settings,
  type SettingsStore,
  type ShortcutAction,
  type Shortcuts,
} from '@/settings/settings';
import { shortcutKey, shortcutKeyName } from '@/settings/shortcut-key';
import type { WhatsNew } from '@/lifecycle/whats-new';
import type { FirstRunTip } from '@/lifecycle/first-run-tip';
import { INSTAGRAM_ORIGIN, isReelsFeed, REELS_FEED_URL } from '@/engine/route';
import { REPORT_PAGE, WELCOME_PAGE } from '@/site';
import './popup.css';

/** The keys in the message files the Popup shows. */
export type PopupMessage =
  | 'extensionShortName'
  | 'popupAutoScroll'
  | 'popupAutoScrollOn'
  | 'popupAutoScrollOff'
  | 'popupSpeed'
  | 'popupSpeedOn'
  | 'popupSpeedOff'
  | 'popupPreferredSpeed'
  | 'popupReelControl'
  | 'popupReelControlHint'
  | 'popupReelsWatched'
  | 'popupWhatsNew'
  | 'popupWhatsNewUnread'
  | 'popupReportProblem'
  | 'popupSessionLimit'
  | 'popupSessionLimitOff'
  | 'popupSessionLimitReels'
  | 'popupSessionLimitMinutes'
  | 'popupSessionLimitReelsValue'
  | 'popupSessionLimitMinutesValue'
  | 'popupSessionLimitProgressReels'
  | 'popupSessionLimitProgressMinutes'
  | 'popupSessionLimitLower'
  | 'popupSessionLimitRaise'
  | 'popupShortcuts'
  | 'popupShortcutsHint'
  | 'shortcutToggleAutoScroll'
  | 'shortcutToggleSpeed'
  | 'popupPressKey'
  | 'popupKeyTaken'
  | 'popupResetShortcuts'
  | 'popupOpenReelsFeedText'
  | 'popupOpenReelsFeed'
  | 'popupFirstRunTip'
  | 'popupFirstRunTipLabel'
  | 'popupFirstRunTipDismiss';

type LimitKind = SessionLimit['kind'];

/** The Session Limit starts at this many Reels or minutes when the viewer picks a kind. */
const LIMIT_STARTS_AT = 30;

/** The largest Session Limit the Popup takes, in Reels or minutes. */
const LIMIT_MAX = 999;

/** How far the Session Limit's minus and plus buttons move it, to the nearest multiple. */
const LIMIT_STEP = 5;

/** The Preferred Speeds the viewer can pick: 0.5x to 3x in steps of 0.25. */
const SPEED_MIN = 0.5;
const SPEED_MAX = 3;
const SPEED_STEP = 0.25;

/** How long a folded section takes to unfold, in ms: see `.rf-reveal` in popup.css. */
const REVEAL_MS = 400;

/** The Shortcuts the Popup lists, in order. */
const SHORTCUTS: { action: ShortcutAction; label: PopupMessage }[] = [
  { action: 'toggleAutoScroll', label: 'shortcutToggleAutoScroll' },
  { action: 'toggleSpeed', label: 'shortcutToggleSpeed' },
];

export type PopupOptions = {
  settings: SettingsStore;
  /** The current Session, kept by the Reels Feed tabs. */
  session: SessionStore;
  /** The time now, in ms since the epoch: `Date.now` outside tests. */
  now?: () => number;
  /**
   * Looks up a localised message by its key in the message files, filling
   * in its placeholders with `substitutions`, in order.
   */
  message: (key: PopupMessage, substitutions?: string[]) => string;
  /** The extension version, passed along to the Report Page. */
  version: string;
  /** The browser this build is for, passed along to the Report Page. */
  browser: string;
  /** Whether an update brought news the viewer hasn't opened yet. */
  whatsNew: WhatsNew;
  /** Whether the viewer has closed the First-run Tip. */
  firstRunTip: FirstRunTip;
  /**
   * The tab the Popup opened over, if any. Its `url` is known only on
   * Instagram, where Reels Flow has host access, and undefined everywhere
   * else: no `tabs` permission needed.
   */
  activeTab: () => Promise<{ id?: number; url?: string } | undefined>;
  /** Shows `url` in the tab `tabId`, or in a new tab when `tabId` is undefined. */
  openTab: (url: string, tabId?: number) => Promise<void>;
};

/** How a speed reads to the viewer: 1.5 as 1.5×. */
const speedName = (speed: number) => `${speed}×`;

/**
 * Builds the Popup into `document.body` and returns its teardown.
 */
export function mountPopup(
  document: Document,
  {
    settings,
    session,
    now = Date.now,
    message,
    version,
    browser,
    whatsNew,
    firstRunTip,
    activeTab,
    openTab,
  }: PopupOptions,
): () => void {
  /** Whether the Popup is still up, so late answers don't build into a closed one. */
  let mounted = true;

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

  /** A native checkbox drawn as a switch, so it keeps its keyboard and screen reader behaviour. */
  const switchInput = (labelledBy: string, describedBy: string) => {
    const input = element('input', 'rf-switch');
    input.type = 'checkbox';
    input.setAttribute('role', 'switch');
    input.setAttribute('aria-labelledby', labelledBy);
    input.setAttribute('aria-describedby', describedBy);
    // Disabled until the settings arrive, so nothing shows a guess.
    input.disabled = true;
    return input;
  };

  /** The Shortcut key shown beside a control's name, as a hint. */
  const keyHint = () => {
    const hint = element('kbd', 'rf-key-hint');
    hint.setAttribute('aria-hidden', 'true');
    return hint;
  };

  /** Settings as last read or changed: unknown until they arrive. */
  let current: Settings | undefined;
  /** The Session as last stored: unknown until it arrives. */
  let stored: Session | undefined;

  // The header: Reels Flow's own brand, and its news.
  const icon = element('img', 'rf-brand-icon');
  icon.src = '/icon/48.png';
  icon.alt = '';

  // The Welcome Page carries the news.
  const whatsNewLink = opensInNewTab(
    element('a', 'rf-whats-new', message('popupWhatsNew')),
    WELCOME_PAGE,
  );
  const unreadDot = element('span', 'rf-unread-dot');
  unreadDot.setAttribute('role', 'img');
  unreadDot.setAttribute('aria-label', message('popupWhatsNewUnread'));
  let whatsNewOpened = false;
  whatsNewLink.addEventListener('click', () => {
    whatsNewOpened = true;
    unreadDot.remove();
    void whatsNew.markRead();
  });
  void whatsNew.isUnread().then((unread) => {
    if (unread && !whatsNewOpened) whatsNewLink.append(unreadDot);
  });

  const header = element(
    'header',
    'rf-header',
    icon,
    element('h1', 'rf-brand-name', message('extensionShortName')),
    whatsNewLink,
  );

  // Away from the Reels Feed, the way there: every control below acts only on it.
  /** The Instagram tab to take to the Reels Feed, or undefined for a new tab. */
  let instagramTab: number | undefined;
  const openReelsFeed = element('button', 'rf-open-reels-button', message('popupOpenReelsFeed'));
  openReelsFeed.type = 'button';
  openReelsFeed.addEventListener('click', () => {
    openReelsCard.remove();
    void openTab(REELS_FEED_URL, instagramTab);
  });
  const openReelsCard = element(
    'section',
    'rf-open-reels',
    element('p', 'rf-open-reels-text', message('popupOpenReelsFeedText')),
    openReelsFeed,
  );
  openReelsCard.setAttribute('aria-label', message('popupOpenReelsFeedText'));
  void activeTab()
    .then((tab) => {
      const url = tab?.url ? URL.parse(tab.url) : null;
      const onInstagram = url?.origin === INSTAGRAM_ORIGIN;
      if (!mounted || (onInstagram && isReelsFeed(url.pathname))) return;
      instagramTab = onInstagram ? tab?.id : undefined;
      header.after(openReelsCard);
    })
    // Without the tab, say nothing rather than guess.
    .catch(() => {});

  // The First-run Tip: how Reels Flow starts, until the viewer closes it.
  const tipText = element('p', 'rf-tip-text');
  const tipClose = element('button', 'rf-tip-close');
  tipClose.type = 'button';
  tipClose.setAttribute('aria-label', message('popupFirstRunTipDismiss'));
  const tip = element('aside', 'rf-tip', tipText, tipClose);
  tip.setAttribute('aria-label', message('popupFirstRunTipLabel'));
  /** Whether the Tip is still to show: unknown until its storage answers. */
  let tipWanted: boolean | undefined;
  /** Shows the Tip once both its storage and the Shortcut key are known. */
  const showTip = () => {
    if (!tipWanted || !current) return;
    tipText.textContent = message('popupFirstRunTip', [shortcutKeyName(current.shortcuts.toggleAutoScroll)]);
    if (!tip.isConnected) hero.after(tip);
  };
  tipClose.addEventListener('click', () => {
    tipWanted = false;
    tip.remove();
    // Focus would otherwise fall to the page; land it on the control the Tip was about.
    autoScroll.focus();
    void firstRunTip.dismiss();
  });
  void firstRunTip.isDismissed().then((dismissed) => {
    tipWanted = !dismissed;
    if (mounted) showTip();
  });

  // Auto-Scroll: the one control the Popup is for, drawn as Reels flowing by.
  const autoScrollTitle = element('span', 'rf-hero-title', message('popupAutoScroll'));
  autoScrollTitle.id = 'rf-auto-scroll-title';
  const autoScrollKey = keyHint();
  const autoScrollStatus = element('span', 'rf-hero-status');
  autoScrollStatus.id = 'rf-auto-scroll-status';
  const autoScroll = switchInput(autoScrollTitle.id, autoScrollStatus.id);
  autoScroll.classList.add('rf-switch-on-media');
  autoScroll.addEventListener('change', () => void settings.set({ autoScroll: autoScroll.checked }));
  const flow = element(
    'span',
    'rf-flow',
    element('span', 'rf-flow-track', ...Array.from({ length: 6 }, () => element('span', 'rf-flow-reel'))),
  );
  flow.setAttribute('aria-hidden', 'true');
  const heroToggle = element(
    'label',
    'rf-hero-toggle',
    flow,
    element(
      'span',
      'rf-hero-text',
      element('span', 'rf-hero-name', autoScrollTitle, autoScrollKey),
      autoScrollStatus,
    ),
    autoScroll,
  );

  const reelsWatchedLabel = element('span', 'rf-stat-label', message('popupReelsWatched'));
  reelsWatchedLabel.id = 'rf-reels-watched-label';
  // Blank until the Session arrives, so nothing shows a guess.
  const reelsWatched = element('output', 'rf-stat-count');
  reelsWatched.setAttribute('aria-labelledby', reelsWatchedLabel.id);
  // Replays its little lift each time the count goes up.
  reelsWatched.addEventListener('animationend', () => reelsWatched.classList.remove('rf-counted'));
  const hero = element(
    'section',
    'rf-hero',
    heroToggle,
    element('div', 'rf-stat', reelsWatched, reelsWatchedLabel),
  );

  // Speed, and the Preferred Speed it switches to.
  const speedTitle = element('span', 'rf-row-title', message('popupSpeed'));
  speedTitle.id = 'rf-speed-title';
  const speedKey = keyHint();
  const speedStatus = element('span', 'rf-row-hint');
  speedStatus.id = 'rf-speed-status';
  const speedOn = switchInput(speedTitle.id, speedStatus.id);
  speedOn.addEventListener('change', () => void settings.set({ speedOn: speedOn.checked }));

  const preferredSpeed = element('input', 'rf-slider');
  preferredSpeed.type = 'range';
  preferredSpeed.min = String(SPEED_MIN);
  preferredSpeed.max = String(SPEED_MAX);
  preferredSpeed.step = String(SPEED_STEP);
  preferredSpeed.setAttribute('aria-label', message('popupPreferredSpeed'));
  // Disabled until the settings arrive, so nothing shows a guess.
  preferredSpeed.disabled = true;
  const speedBubble = element('span', 'rf-slider-bubble');
  speedBubble.setAttribute('aria-hidden', 'true');
  /** The slowest or fastest speed, at its end of the slider. */
  const speedEnd = (speed: number) => {
    const end = element('span', 'rf-slider-end', speedName(speed));
    end.setAttribute('aria-hidden', 'true');
    return end;
  };
  /** Moves the slider's fill and bubble to `speed`, and names it everywhere it shows. */
  const showSpeed = (speed: number) => {
    const name = speedName(speed);
    preferredSpeed.style.setProperty('--at', String(speedShare(speed)));
    preferredSpeed.setAttribute('aria-valuetext', name);
    speedBubble.textContent = name;
    speedBubble.style.setProperty('--at', String(speedShare(speed)));
    speedStatus.textContent = message(current?.speedOn ? 'popupSpeedOn' : 'popupSpeedOff', [name]);
  };
  // The bubble follows the thumb as it moves; the speed is kept once it lands.
  preferredSpeed.addEventListener('input', () => showSpeed(preferredSpeed.valueAsNumber));
  preferredSpeed.addEventListener('change', () => {
    void settings.set({ preferredSpeed: preferredSpeed.valueAsNumber });
  });

  const speedCard = element(
    'section',
    'rf-section rf-speed',
    element(
      'label',
      'rf-row',
      element('span', 'rf-row-text', element('span', 'rf-row-name', speedTitle, speedKey), speedStatus),
      speedOn,
    ),
    element(
      'div',
      'rf-slider-row',
      speedEnd(SPEED_MIN),
      element('div', 'rf-slider-wrap', speedBubble, preferredSpeed),
      speedEnd(SPEED_MAX),
    ),
  );

  // The Session Limit: off, or a number of Reels or minutes before a break.
  const limitTitle = element('span', 'rf-row-title', message('popupSessionLimit'));
  limitTitle.id = 'rf-session-limit-title';
  const kinds: [LimitKind, PopupMessage][] = [
    ['off', 'popupSessionLimitOff'],
    ['reels', 'popupSessionLimitReels'],
    ['minutes', 'popupSessionLimitMinutes'],
  ];
  const kindInputs = kinds.map(([kind, label]) => {
    const input = element('input', 'rf-segment-input');
    input.type = 'radio';
    input.name = 'rf-session-limit';
    input.value = kind;
    // Disabled until the settings arrive, so nothing shows a guess.
    input.disabled = true;
    input.addEventListener('change', () => {
      if (input.checked) setLimit(kind === 'off' ? { kind } : { kind, value: LIMIT_STARTS_AT });
    });
    return { kind, input, segment: element('label', 'rf-segment', input, element('span', '', message(label))) };
  });
  const segmentPill = element('span', 'rf-segment-pill');
  segmentPill.setAttribute('aria-hidden', 'true');
  const limitKind = element('div', 'rf-segments', segmentPill, ...kindInputs.map(({ segment }) => segment));
  limitKind.setAttribute('role', 'radiogroup');
  limitKind.setAttribute('aria-labelledby', limitTitle.id);

  const limitValue = element('input', 'rf-stepper-value');
  limitValue.type = 'number';
  limitValue.min = '1';
  limitValue.max = String(LIMIT_MAX);
  limitValue.step = '1';
  limitValue.inputMode = 'numeric';
  limitValue.addEventListener('change', () => {
    const kind = current?.sessionLimit.kind;
    if (!kind || kind === 'off') return;
    const typed = Math.round(limitValue.valueAsNumber);
    setLimit({ kind, value: Number.isNaN(typed) ? LIMIT_STARTS_AT : clampLimit(typed) });
  });
  const stepButton = (label: PopupMessage, symbol: string, step: (value: number) => number) => {
    const button = element('button', 'rf-stepper-button', symbol);
    button.type = 'button';
    button.setAttribute('aria-label', message(label));
    button.addEventListener('click', () => {
      const limit = current?.sessionLimit;
      if (limit && limit.kind !== 'off') setLimit({ kind: limit.kind, value: clampLimit(step(limit.value)) });
    });
    return button;
  };
  const lower = stepButton('popupSessionLimitLower', '−', (value) => Math.ceil(value / LIMIT_STEP) * LIMIT_STEP - LIMIT_STEP);
  const raise = stepButton('popupSessionLimitRaise', '+', (value) => Math.floor(value / LIMIT_STEP) * LIMIT_STEP + LIMIT_STEP);
  const limitUnit = element('span', 'rf-stepper-unit');
  limitUnit.setAttribute('aria-hidden', 'true');
  const limitProgressText = element('span', 'rf-progress-text');
  const limitProgressFill = element('span', 'rf-progress-fill');
  const limitProgressBar = element('span', 'rf-progress-bar', limitProgressFill);
  limitProgressBar.setAttribute('aria-hidden', 'true');
  const limitDetails = element(
    'div',
    'rf-reveal',
    element(
      'div',
      'rf-reveal-inner',
      element(
        'div',
        'rf-limit-details',
        element('div', 'rf-stepper', lower, element('label', 'rf-stepper-readout', limitValue, limitUnit), raise),
        element('div', 'rf-progress', limitProgressBar, limitProgressText),
      ),
    ),
  );

  const limitCard = element(
    'section',
    'rf-section rf-limit',
    element('div', 'rf-limit-head', limitTitle, limitKind),
    limitDetails,
  );

  const setLimit = (sessionLimit: SessionLimit) => {
    if (current) showLimit({ ...current, sessionLimit });
    void settings.set({ sessionLimit });
  };

  const showLimit = (shown: Settings) => {
    current = shown;
    const limit = shown.sessionLimit;
    kindInputs.forEach(({ kind, input }, index) => {
      input.checked = kind === limit.kind;
      input.disabled = false;
      if (input.checked) limitKind.style.setProperty('--index', String(index));
    });
    const open = limit.kind !== 'off';
    limitDetails.classList.toggle('rf-open', open);
    // Out of reach of Tab and screen readers while it's folded away.
    limitDetails.inert = !open;
    if (!open) return;
    limitValue.setAttribute(
      'aria-label',
      message(limit.kind === 'reels' ? 'popupSessionLimitReelsValue' : 'popupSessionLimitMinutesValue'),
    );
    limitUnit.textContent = message(limit.kind === 'reels' ? 'popupSessionLimitReels' : 'popupSessionLimitMinutes');
    // Not while the viewer is typing a new one.
    if (document.activeElement !== limitValue) limitValue.value = String(limit.value);
    lower.disabled = limit.value <= 1;
    raise.disabled = limit.value >= LIMIT_MAX;
    showProgress();
  };

  /** How far the current Session has come towards its Session Limit. */
  const showProgress = () => {
    const limit = current?.sessionLimit;
    if (!limit || limit.kind === 'off') return;
    const at = sessionAt(stored ?? NO_SESSION, now());
    const from = at.limitFrom ?? NO_SESSION;
    const count =
      limit.kind === 'reels'
        ? at.reelsWatched - from.reelsWatched
        : Math.floor((at.playingMs - from.playingMs) / 60_000);
    const shown = Math.min(Math.max(count, 0), limit.value);
    limitProgressText.textContent = message(
      limit.kind === 'reels' ? 'popupSessionLimitProgressReels' : 'popupSessionLimitProgressMinutes',
      [String(shown), String(limit.value)],
    );
    limitProgressFill.style.setProperty('--at', String(shown / limit.value));
  };

  // The Reel Control.
  const reelControlTitle = element('span', 'rf-row-title', message('popupReelControl'));
  reelControlTitle.id = 'rf-reel-control-title';
  const reelControlHint = element('span', 'rf-row-hint', message('popupReelControlHint'));
  reelControlHint.id = 'rf-reel-control-hint';
  const reelControl = switchInput(reelControlTitle.id, reelControlHint.id);
  reelControl.addEventListener('change', () => void settings.set({ reelControlShown: reelControl.checked }));
  const reelControlCard = element(
    'section',
    'rf-section',
    element(
      'label',
      'rf-row',
      element('span', 'rf-row-text', element('span', 'rf-row-name', reelControlTitle), reelControlHint),
      reelControl,
    ),
  );

  // The Shortcuts, folded away until the viewer opens them.
  /** The Shortcut waiting for the viewer to press its new key, if any. */
  let capturing: ShortcutAction | undefined;

  const shortcutsStatus = element('p', 'rf-shortcuts-status');
  shortcutsStatus.setAttribute('role', 'status');

  const shortcutRows = SHORTCUTS.map(({ action, label }) => {
    const name = element('span', 'rf-shortcut-name', message(label));
    name.id = `rf-shortcut-${action}`;
    const key = element('button', 'rf-keycap');
    key.type = 'button';
    key.id = `rf-shortcut-${action}-key`;
    // Read as "Speed on/off S": what the Shortcut does, then its key.
    key.setAttribute('aria-labelledby', `${name.id} ${key.id}`);
    // Disabled until the settings arrive, so nothing shows a guess.
    key.disabled = true;
    key.addEventListener('click', () => capture(capturing === action ? undefined : action));
    key.addEventListener('keydown', (event) => onCaptureKey(action, event));
    key.addEventListener('blur', () => capturing === action && capture(undefined));
    return { action, key, row: element('li', 'rf-shortcut', name, key) };
  });

  const capture = (action: ShortcutAction | undefined) => {
    capturing = action;
    shortcutsStatus.textContent = '';
    if (current) showShortcuts(current.shortcuts);
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
    // No key ever does two things.
    const shortcuts = listedShortcuts(current.shortcuts);
    const taken = SHORTCUTS.some(({ action: other }) => other !== action && shortcuts[other] === key);
    if (taken) {
      shortcutsStatus.textContent = message('popupKeyTaken', [shortcutKeyName(key)]);
      return;
    }
    shortcutsStatus.textContent = '';
    void settings.set({ shortcuts: { ...shortcuts, [action]: key } });
    capture(undefined);
  };

  const resetShortcuts = element('button', 'rf-text-button', message('popupResetShortcuts'));
  resetShortcuts.type = 'button';
  resetShortcuts.addEventListener('click', () => {
    capture(undefined);
    void settings.set({ shortcuts: { ...DEFAULT_SETTINGS.shortcuts } });
  });

  const chevron = element('span', 'rf-chevron');
  chevron.setAttribute('aria-hidden', 'true');
  const shortcutsToggle = element(
    'button',
    'rf-disclosure',
    element('span', 'rf-row-title', message('popupShortcuts')),
    chevron,
  );
  shortcutsToggle.type = 'button';
  shortcutsToggle.id = 'rf-shortcuts-toggle';
  shortcutsToggle.setAttribute('aria-expanded', 'false');
  shortcutsToggle.setAttribute('aria-controls', 'rf-shortcuts-panel');
  const shortcutsPanel = element(
    'div',
    'rf-reveal',
    element(
      'div',
      'rf-reveal-inner',
      element(
        'div',
        'rf-shortcuts-body',
        element('p', 'rf-shortcuts-hint', message('popupShortcutsHint')),
        element('ul', 'rf-shortcuts', ...shortcutRows.map(({ row }) => row)),
        element('div', 'rf-shortcuts-foot', shortcutsStatus, resetShortcuts),
      ),
    ),
  );
  shortcutsPanel.id = 'rf-shortcuts-panel';
  shortcutsPanel.setAttribute('role', 'region');
  shortcutsPanel.setAttribute('aria-labelledby', shortcutsToggle.id);
  shortcutsPanel.inert = true;
  shortcutsToggle.addEventListener('click', () => {
    const open = shortcutsToggle.getAttribute('aria-expanded') !== 'true';
    shortcutsToggle.setAttribute('aria-expanded', String(open));
    shortcutsPanel.classList.toggle('rf-open', open);
    shortcutsPanel.inert = !open;
    if (!open) {
      capture(undefined);
      return;
    }
    // The Popup has a height limit, so bring the Shortcuts into view once they've unfolded.
    const reducedMotion = document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(
      () => shortcutsCard.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'instant' : 'smooth' }),
      reducedMotion ? 0 : REVEAL_MS,
    );
  });
  const shortcutsCard = element('section', 'rf-section rf-shortcuts-card', shortcutsToggle, shortcutsPanel);

  const showShortcuts = (shortcuts: Shortcuts) => {
    for (const { action, key } of shortcutRows) {
      key.textContent = capturing === action ? message('popupPressKey') : shortcutKeyName(shortcuts[action]);
      key.classList.toggle('rf-capturing', capturing === action);
      key.disabled = false;
    }
    autoScrollKey.textContent = shortcutKeyName(shortcuts.toggleAutoScroll);
    speedKey.textContent = shortcutKeyName(shortcuts.toggleSpeed);
    showTip();
  };

  // The footer.
  const reportUrl = new URL(REPORT_PAGE);
  reportUrl.searchParams.set('version', version);
  reportUrl.searchParams.set('browser', browser);
  const footer = element(
    'footer',
    'rf-footer',
    opensInNewTab(element('a', 'rf-report', message('popupReportProblem')), reportUrl.href),
  );

  const popup = element(
    'main',
    'rf-popup',
    header,
    hero,
    element('div', 'rf-group', speedCard, limitCard, reelControlCard, shortcutsCard),
    footer,
  );
  document.body.append(popup);

  const show = (shown: Settings) => {
    current = shown;
    autoScroll.checked = shown.autoScroll;
    hero.classList.toggle('rf-on', shown.autoScroll);
    autoScrollStatus.textContent = message(shown.autoScroll ? 'popupAutoScrollOn' : 'popupAutoScrollOff');
    speedOn.checked = shown.speedOn;
    reelControl.checked = shown.reelControlShown;
    for (const input of [autoScroll, speedOn, reelControl, preferredSpeed]) input.disabled = false;
    // Not while the viewer is dragging it.
    if (document.activeElement !== preferredSpeed) preferredSpeed.value = String(shown.preferredSpeed);
    showSpeed(preferredSpeed.valueAsNumber);
    showLimit(shown);
    showShortcuts(shown.shortcuts);
    popup.classList.add('rf-ready');
  };

  let changedSinceRead = false;
  const unwatch = settings.watch((changed) => {
    changedSinceRead = true;
    show(changed);
  });
  void settings.get().then((read) => {
    if (!changedSinceRead) show(read);
  });

  const showSession = (changed: Session) => {
    const before = stored && sessionAt(stored, now()).reelsWatched;
    stored = changed;
    const count = sessionAt(changed, now()).reelsWatched;
    reelsWatched.value = String(count);
    if (before !== undefined && count > before) reelsWatched.classList.add('rf-counted');
    showProgress();
  };
  let sessionChangedSinceRead = false;
  const unwatchSession = session.watch((changed) => {
    sessionChangedSinceRead = true;
    showSession(changed);
  });
  void session.get().then((read) => {
    if (!sessionChangedSinceRead) showSession(read);
  });

  return () => {
    mounted = false;
    unwatch();
    unwatchSession();
    popup.remove();
  };
}

/** Where `speed` sits along the Preferred Speed slider, from 0 to 1. */
function speedShare(speed: number) {
  return (speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN);
}

function clampLimit(value: number) {
  return Math.min(Math.max(value, 1), LIMIT_MAX);
}

/**
 * Only the Shortcuts the Popup lists: settings saved by 3.0.0 also hold
 * bindings for next and previous Reel, which no longer exist.
 */
function listedShortcuts(shortcuts: Shortcuts): Shortcuts {
  return Object.fromEntries(SHORTCUTS.map(({ action }) => [action, shortcuts[action]])) as Shortcuts;
}

function opensInNewTab(anchor: HTMLAnchorElement, href: string): HTMLAnchorElement {
  anchor.href = href;
  anchor.target = '_blank';
  anchor.rel = 'noopener';
  return anchor;
}
