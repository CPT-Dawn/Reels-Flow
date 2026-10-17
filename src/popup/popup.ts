import { sessionAt, type Session, type SessionStore } from '@/settings/session';
import type { SessionLimit, Settings, SettingsStore } from '@/settings/settings';
import type { WhatsNew } from '@/lifecycle/whats-new';
import { REPORT_PAGE, SUPPORT_PAGE, WELCOME_PAGE } from '@/site';
import './popup.css';

/** The keys in the message files the Popup shows. */
export type PopupMessage =
  | 'extensionShortName'
  | 'popupAutoScroll'
  | 'popupSpeed'
  | 'popupReelControl'
  | 'popupReelsWatched'
  | 'popupSettings'
  | 'popupWhatsNew'
  | 'popupWhatsNewUnread'
  | 'popupReportProblem'
  | 'popupSupport'
  | 'popupSessionLimit'
  | 'popupSessionLimitOff'
  | 'popupSessionLimitReels'
  | 'popupSessionLimitMinutes'
  | 'popupSessionLimitReelsValue'
  | 'popupSessionLimitMinutesValue';

type LimitKind = SessionLimit['kind'];

/** The Session Limit starts at this many Reels or minutes when the viewer picks a kind. */
const LIMIT_STARTS_AT = 30;

/** The largest Session Limit the Popup takes, in Reels or minutes. */
const LIMIT_MAX = 999;

export type PopupOptions = {
  settings: SettingsStore;
  /** The current Session, kept by the Reels Feed tabs. */
  session: SessionStore;
  /** The time now, in ms since the epoch: `Date.now` outside tests. */
  now?: () => number;
  /** Looks up a localised message by its key in the message files. */
  message: (key: PopupMessage) => string;
  /** The extension version, passed along to the Report Page. */
  version: string;
  /** The browser this build is for, passed along to the Report Page. */
  browser: string;
  openSettingsPage: () => void;
  /** Whether an update brought news the viewer hasn't opened yet. */
  whatsNew: WhatsNew;
};

type Switch = {
  key: 'autoScroll' | 'speedOn' | 'reelControlShown';
  label: PopupMessage;
};

const SWITCHES: Switch[] = [
  { key: 'autoScroll', label: 'popupAutoScroll' },
  { key: 'speedOn', label: 'popupSpeed' },
  { key: 'reelControlShown', label: 'popupReelControl' },
];

/**
 * Builds the Popup into `document.body` and returns its teardown.
 */
export function mountPopup(
  document: Document,
  { settings, session, now = Date.now, message, version, browser, openSettingsPage, whatsNew }: PopupOptions,
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

  const icon = element('img', 'rf-brand-icon');
  icon.src = '/icon/48.png';
  icon.alt = '';
  const settingsButton = element('button', 'rf-settings-button', gearIcon(document));
  settingsButton.type = 'button';
  settingsButton.title = message('popupSettings');
  settingsButton.setAttribute('aria-label', message('popupSettings'));
  settingsButton.addEventListener('click', () => openSettingsPage());

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
    settingsButton,
  );

  const inputs = SWITCHES.map(({ key, label }) => {
    const input = element('input', 'rf-switch');
    input.type = 'checkbox';
    input.setAttribute('role', 'switch');
    // Disabled until the settings arrive, so nothing shows a guess.
    input.disabled = true;
    input.addEventListener('change', () => {
      void settings.set({ [key]: input.checked });
    });
    const row = element('label', 'rf-row', element('span', 'rf-row-label', message(label)), input);
    return { key, input, row };
  });
  const reelsWatchedLabel = element('span', 'rf-row-label', message('popupReelsWatched'));
  reelsWatchedLabel.id = 'rf-reels-watched-label';
  // Blank until the Session arrives, so nothing shows a guess.
  const reelsWatched = element('output', 'rf-count');
  reelsWatched.setAttribute('aria-labelledby', reelsWatchedLabel.id);
  const reelsWatchedRow = element('div', 'rf-row rf-stat', reelsWatchedLabel, reelsWatched);

  // The Session Limit: off, or a number of Reels or minutes before a break.
  const limitKind = element('select', 'rf-select');
  limitKind.id = 'rf-session-limit';
  const kinds: [LimitKind, PopupMessage][] = [
    ['off', 'popupSessionLimitOff'],
    ['reels', 'popupSessionLimitReels'],
    ['minutes', 'popupSessionLimitMinutes'],
  ];
  for (const [value, label] of kinds) {
    const option = element('option', '', message(label));
    option.value = value;
    limitKind.append(option);
  }
  // Disabled until the settings arrive, so nothing shows a guess.
  limitKind.disabled = true;
  const limitValue = element('input', 'rf-number');
  limitValue.type = 'number';
  limitValue.min = '1';
  limitValue.max = String(LIMIT_MAX);
  limitValue.step = '1';
  limitValue.inputMode = 'numeric';
  const limitLabel = element('label', 'rf-row-label', message('popupSessionLimit'));
  limitLabel.htmlFor = limitKind.id;
  const limitInputs = element('span', 'rf-limit-inputs', limitKind);
  const limitRow = element('div', 'rf-row rf-limit', limitLabel, limitInputs);

  const setLimit = (sessionLimit: SessionLimit) => {
    showLimit(sessionLimit);
    void settings.set({ sessionLimit });
  };
  limitKind.addEventListener('change', () => {
    const kind = limitKind.value as LimitKind;
    setLimit(kind === 'off' ? { kind } : { kind, value: LIMIT_STARTS_AT });
  });
  limitValue.addEventListener('change', () => {
    const kind = limitKind.value as LimitKind;
    if (kind === 'off') return;
    const typed = Math.round(limitValue.valueAsNumber);
    const value = Number.isNaN(typed) ? LIMIT_STARTS_AT : Math.min(Math.max(typed, 1), LIMIT_MAX);
    setLimit({ kind, value });
  });

  const showLimit = (sessionLimit: SessionLimit) => {
    limitKind.value = sessionLimit.kind;
    limitKind.disabled = false;
    if (sessionLimit.kind === 'off') {
      limitValue.remove();
      return;
    }
    limitValue.setAttribute(
      'aria-label',
      message(sessionLimit.kind === 'reels' ? 'popupSessionLimitReelsValue' : 'popupSessionLimitMinutesValue'),
    );
    // Not while the viewer is typing a new one.
    if (document.activeElement !== limitValue) limitValue.value = String(sessionLimit.value);
    if (!limitValue.isConnected) limitInputs.prepend(limitValue);
  };

  const controls = element(
    'section',
    'rf-controls',
    ...inputs.map(({ row }) => row),
    limitRow,
    reelsWatchedRow,
  );

  const reportUrl = new URL(REPORT_PAGE);
  reportUrl.searchParams.set('version', version);
  reportUrl.searchParams.set('browser', browser);
  const heart = element('span', '', '♡ ');
  heart.setAttribute('aria-hidden', 'true');
  const footer = element(
    'footer',
    'rf-footer',
    opensInNewTab(element('a', 'rf-report', message('popupReportProblem')), reportUrl.href),
    opensInNewTab(element('a', 'rf-support', heart, message('popupSupport')), SUPPORT_PAGE),
  );

  const popup = element('main', 'rf-popup', header, controls, footer);
  document.body.append(popup);

  const show = (current: Settings) => {
    for (const { key, input } of inputs) {
      input.checked = current[key];
      input.disabled = false;
    }
    showLimit(current.sessionLimit);
  };

  let changedSinceRead = false;
  const unwatch = settings.watch((current) => {
    changedSinceRead = true;
    show(current);
  });
  void settings.get().then((current) => {
    if (!changedSinceRead) show(current);
  });

  const showSession = (stored: Session) => {
    reelsWatched.value = String(sessionAt(stored, now()).reelsWatched);
  };
  let sessionChangedSinceRead = false;
  const unwatchSession = session.watch((stored) => {
    sessionChangedSinceRead = true;
    showSession(stored);
  });
  void session.get().then((stored) => {
    if (!sessionChangedSinceRead) showSession(stored);
  });

  return () => {
    unwatch();
    unwatchSession();
    popup.remove();
  };
}

function opensInNewTab(anchor: HTMLAnchorElement, href: string): HTMLAnchorElement {
  anchor.href = href;
  anchor.target = '_blank';
  anchor.rel = 'noopener';
  return anchor;
}

function gearIcon(document: Document): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute(
    'd',
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
  );
  svg.append(path);
  return svg;
}
