# Store listing: Reels Flow 3.0.0

Same text for the Chrome Web Store, Edge Add-ons and Firefox Add-ons. Always say "for Instagram"; never say or imply that Instagram or Meta made, endorses or supports Reels Flow, and don't use Instagram's logo or Reels glyph.

## Name

Reels Flow: Auto Scroll for Instagram Reels

## Summary (≤ 132 characters)

Watch Instagram Reels hands-free: Reels Flow moves to the next Reel when the current one finishes.

## Description

Reels Flow is an extension for Instagram's desktop Reels feed. When a Reel finishes, it moves on to the next one, so you can cook, work out or sit back without touching the mouse.

- Auto-Scroll: goes to the next Reel when the current one ends, and waits while you're paused, reading comments, typing or scrolling yourself.
- An Auto-Scroll button beside each Reel, next to Instagram's own buttons.
- Speed: play Reels at your preferred speed, from 0.5× to 3×.
- Shortcuts: single keys for Auto-Scroll, Speed, next and previous Reel. Change them in Settings.
- Reels watched: see how many Reels you've watched this session.
- Session limit: optionally take a gentle break after a number of Reels or minutes.

Privacy: Reels Flow collects no data. No analytics, no tracking, nothing leaves your browser. It needs only the storage permission and access to instagram.com.

Reels Flow is an independent project and is not affiliated with, made by or endorsed by Instagram or Meta.

Website and support: https://reelsflow.cptdawn.dev

## Category

Chrome / Edge: Entertainment (or Productivity). Firefox: Photos, Music & Videos.

## Data-collection declarations

- Chrome Web Store, Privacy practices: single purpose "Moves Instagram's Reels feed to the next Reel when the current one finishes." Data usage: tick none of the data types; certify all three disclosures (no selling, no unrelated use, no creditworthiness).
- Permission justifications: `storage` keeps the viewer's settings and Reels watched count in the browser; host access to `https://www.instagram.com/*` runs Reels Flow on the Reels feed.
- Remote code: No.
- Edge Add-ons: no personal data collected; privacy policy URL optional (https://reelsflow.cptdawn.dev if asked).
- Firefox Add-ons: the manifest declares `data_collection_permissions.required: ["none"]`; answer "no data collected" in the listing.

## Uploads

- Chrome / Edge package: `.output/reels-flow-3.0.0-chrome.zip`, `.output/reels-flow-3.0.0-edge.zip`
- Firefox package: `.output/reels-flow-3.0.0-firefox.zip`, plus source bundle `.output/reels-flow-3.0.0-sources.zip` (build: `pnpm install && pnpm build:firefox`)
- Images in `store assets/`: `Store-Icon.png` (128), `Small-Promo-Tile.png` (440×280), `Marquee-Promo-Tile.png` (1400×560). Screenshots must be redone with the new icon before submitting.
