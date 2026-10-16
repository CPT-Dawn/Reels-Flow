import type { Settings, SettingsStore } from '@/settings/settings';
import type { WhatsNew } from '@/settings/whats-new';
import './popup.css';

/** The keys in the message files the Popup shows. */
export type PopupMessage =
  | 'extensionShortName'
  | 'popupAutoScroll'
  | 'popupReelControl'
  | 'popupSettings'
  | 'popupWhatsNew'
  | 'popupWhatsNewUnread'
  | 'popupReportProblem'
  | 'popupSupport';

export type PopupOptions = {
  settings: SettingsStore;
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

// Fixed paths on the Reels Flow website: see ADR 0002.
const SITE = 'https://reelsflow.cptdawn.dev';

type Switch = {
  key: 'autoScroll' | 'reelControlShown';
  label: PopupMessage;
};

const SWITCHES: Switch[] = [
  { key: 'autoScroll', label: 'popupAutoScroll' },
  { key: 'reelControlShown', label: 'popupReelControl' },
];

/**
 * Builds the Popup into `document.body` and returns its teardown.
 */
export function mountPopup(
  document: Document,
  { settings, message, version, browser, openSettingsPage, whatsNew }: PopupOptions,
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

  // The Welcome Page carries the news (ADR 0002 keeps links to fixed paths).
  const whatsNewLink = opensInNewTab(
    element('a', 'rf-whats-new', message('popupWhatsNew')),
    `${SITE}/welcome`,
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
  const controls = element('section', 'rf-controls', ...inputs.map(({ row }) => row));

  const reportUrl = new URL('/report', SITE);
  reportUrl.searchParams.set('version', version);
  reportUrl.searchParams.set('browser', browser);
  const heart = element('span', '', '♡ ');
  heart.setAttribute('aria-hidden', 'true');
  const footer = element(
    'footer',
    'rf-footer',
    opensInNewTab(element('a', 'rf-report', message('popupReportProblem')), reportUrl.href),
    opensInNewTab(element('a', 'rf-support', heart, message('popupSupport')), `${SITE}/support`),
  );

  const popup = element('main', 'rf-popup', header, controls, footer);
  document.body.append(popup);

  const show = (current: Settings) => {
    for (const { key, input } of inputs) {
      input.checked = current[key];
      input.disabled = false;
    }
  };

  let changedSinceRead = false;
  const unwatch = settings.watch((current) => {
    changedSinceRead = true;
    show(current);
  });
  void settings.get().then((current) => {
    if (!changedSinceRead) show(current);
  });

  return () => {
    unwatch();
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
