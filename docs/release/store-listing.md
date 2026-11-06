# Store listing: Reels Flow 3.1.1

Same text for the Chrome Web Store and Firefox Add-ons. Reels Flow is not listed on Edge Add-ons; Edge users install the Chrome Web Store version (ADR 0005). Always say "for Instagram"; never say or imply that Instagram or Meta made, endorses or supports Reels Flow, and don't use Instagram's logo or Reels glyph.

Privacy wording must stay accurate (ADR 0003): Reels Flow collects nothing and sends nothing to anyone. Settings live in the browser's synced extension storage, so the browser itself carries them to the viewer's other browsers through the viewer's own browser account, and only when browser sync is on. Never write "nothing leaves your browser".

## Name

Reels Flow: Auto Scroll for Instagram Reels

## Summary (≤ 132 characters)

Watch Instagram Reels hands-free: Reels Flow moves to the next Reel when the current one finishes.

## Description

Watch Instagram Reels hands-free: when a Reel ends, Reels Flow moves on to the next one.

Cooking, working out, or just sitting back? Open Reels on instagram.com and keep your hands free. Reels Flow waits whenever you step in, and stays out of the way everywhere else.

HOW TO START
1. Install Reels Flow and pin it to your toolbar.
2. Open instagram.com/reels/ (or click the Reels Flow icon and choose Open Reels).
3. Let a Reel play. When it ends, the next one starts. Press A to switch Auto-Scroll on or off.

FEATURES
• Auto-Scroll: moves to the next Reel when the current one ends. It waits while you're in charge: the Reel is paused, the comments or a menu are open, you're typing, or you just scrolled yourself.
• Auto button on every Reel: switch Auto-Scroll from beside each Reel, next to Instagram's own buttons.
• Speed: play every Reel at your preferred speed, from 0.5× to 3×.
• Keyboard shortcuts: single keys for Auto-Scroll and Speed, never while you type. Pick your own keys.
• Session limit: if you want one, take a gentle break after a number of Reels or minutes. Off unless you set it.
• Reels watched: see how many Reels you've watched this session.
• One clean popup: every setting is in the toolbar popup, readable in light and dark mode and usable by keyboard.

PRIVACY
Reels Flow collects nothing and sends nothing to anyone: no analytics, no tracking, no ads, no account. Your settings are kept by your browser. If you've turned on browser sync, your browser syncs them across your own devices through your browser account, like your bookmarks; Reels Flow never sees them. The Reels watched count stays on this device. Reels Flow asks only for the storage permission and access to www.instagram.com.

Reels Flow is an independent project. It is not affiliated with, made by or endorsed by Instagram or Meta.

Website: https://reelsflow.cptdawn.dev

## Category

- Chrome: **Lifestyle › Entertainment**. Reels Flow changes how people watch short videos, not how they work, and Entertainment is where Chrome's featured video-watching enhancers sit; Productivity would put it next to task managers, where neither reviewers nor viewers look for it.
- Firefox: **Photos, Music & Videos**.

## URLs

- Homepage: https://reelsflow.cptdawn.dev
- Support: https://reelsflow.cptdawn.dev/report (the Report Page, where a viewer gets help by GitHub issue or plain message; see `src/site.ts`.)
- Privacy policy: https://reelsflow.cptdawn.dev/privacy

## Privacy practices and permissions

- Single purpose (Chrome): "Moves Instagram's Reels feed to the next Reel when the current one finishes, with optional speed, shortcut and break-reminder controls."
- Permission justification, `storage`: "Saves the viewer's settings (Auto-Scroll, Speed, Shortcuts, Session Limit) and the Reels watched count. Settings use the browser's synced storage so the viewer's own browser can carry them to their other browsers when browser sync is on; Reels Flow sends nothing anywhere."
- Permission justification, host access to `https://www.instagram.com/*`: "Reels Flow acts only on the Reels feed (www.instagram.com/reels/). Instagram moves between its pages without loading a new page, so a viewer who starts on the home feed and clicks Reels never triggers a page load there; the content script must already be running on www.instagram.com to notice the move. It does nothing on any other Instagram page. The same access lets the popup see whether the current tab is the Reels feed, so it can offer to open it, without the tabs permission."
- Remote code: No.
- Data usage (Chrome): tick none of the data types; certify all three disclosures (no selling, no unrelated use, no creditworthiness). Browser sync of settings is the browser's own feature, through the viewer's account, and sends nothing to the developer or anyone else.
- Firefox Add-ons: the manifest declares `data_collection_permissions.required: ["none"]`; answer "no data collected" in the listing.

## Uploads

- Chrome package: `.output/reels-flow-3.1.1-chrome.zip`
- Firefox package: `.output/reels-flow-3.1.1-firefox.zip`, plus source bundle `.output/reels-flow-3.1.1-sources.zip` (build: `bun install && bun run build:firefox`)

## Images

All in `store assets/`, generated from the real extension by `bun run store-assets` (see `docs/release/store-assets.md`). Never edit them by hand: change the scenes in `scripts/store-assets/` and regenerate. Check sizes with `file "store assets"/*/*.png` (see the release checklist).

| Store | File | Size | Slot |
| --- | --- | --- | --- |
| Both | `store assets/Store-Icon.png` | 128×128 | Store icon |
| Chrome | `store assets/chrome/screenshot-1.png` … `screenshot-5.png` | 1280×800 each | Screenshots, in order |
| Chrome | `store assets/chrome/promo-small-440x280.png` | 440×280 | Small promo tile |
| Chrome | `store assets/chrome/marquee-1400x560.png` | 1400×560 | Marquee promo tile (shown when featured) |
| Firefox | `store assets/firefox/screenshot-1.png` … `screenshot-5.png` | 1280×800 each | Screenshots, in order |

Screenshots and tiles show the Reels Flow icon and the Popup, never Instagram's logo or Reels glyph, and no real people's accounts.

## Featured badge nomination

Submit through the Chrome Web Store One Stop Support form (https://support.google.com/chrome_webstore/contact/one_stop_support, the "badge / featuring" option) once 3.1.0 is live and its new listing images are published. Chrome staff review by hand, usually within about two weeks, and don't share reasons for a decline; a declined item may have to wait before trying again, so nominate only after the release checklist passes on real Instagram. Ready to paste:

> Hello Chrome Web Store team,
>
> I'd like to nominate Reels Flow: Auto Scroll for Instagram Reels (ID mlmllpiifbmfnopepamjhbdedfjajgcl) for the Featured badge.
>
> Reels Flow does one thing: on Instagram's desktop Reels feed, it moves to the next Reel when the current one ends, so people can watch hands-free while cooking or working out. It waits whenever the viewer steps in (a paused Reel, open comments or menus, typing, a manual scroll).
>
> - Manifest V3, with the smallest permissions that work: `storage` and host access to www.instagram.com only. No tabs, activeTab, scripting or remote code.
> - Zero data collection: no analytics, tracking, ads or accounts. Settings sync only through the user's own browser account when Chrome sync is on. Privacy policy: https://reelsflow.cptdawn.dev/privacy
> - A polished popup that holds every setting: WCAG AA contrast in light and dark mode, native controls with screen-reader names, full keyboard use, and reduced-motion support. It guides new users to the Reels feed and shows a one-time tip with their own shortcut key.
> - Gentle wellbeing features: an optional session limit with a calm break reminder.
> - Clear disclosure that it is independent of Instagram and Meta, with no Instagram branding.
> - Help and problem reports at https://reelsflow.cptdawn.dev/report; open source on GitHub (CPT-Dawn/Reels-Flow), with tests in real Chromium and Firefox.
>
> Thank you for considering it.
