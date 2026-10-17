<div align="center">
  <img src="store assets/Icon.png" alt="Reels Flow icon" width="100" height="100" />

  <h1>Reels Flow</h1>

  <p><b>Watch Instagram Reels hands-free.</b></p>

  <p>
    <img src="https://img.shields.io/badge/version-3.0.0-2EA043?style=for-the-badge" alt="Version 3.0.0">
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
    <img src="https://img.shields.io/badge/browsers-Chrome%20%7C%20Edge%20%7C%20Firefox-5A5A5A?style=for-the-badge" alt="Chrome, Edge and Firefox">
  </p>
</div>

Reels Flow is a browser extension for Instagram's desktop Reels feed (instagram.com/reels/). When a Reel finishes, it moves on to the next one, so you can cook, work out or just sit back.

Reels Flow is an independent project. It is not made, endorsed or supported by Instagram or Meta.

Website: [reelsflow.cptdawn.dev](https://reelsflow.cptdawn.dev)

## Features

- **Auto-Scroll**: moves to the next Reel when the current one ends. It holds back while you're in charge: the Reel is paused, the comments or a menu are open, you're typing, or you just scrolled by hand.
- **Reel Control**: an Auto-Scroll button beside each Reel, among Instagram's own buttons.
- **Speed**: play every Reel at your Preferred Speed (0.5×–3×), switched on or off from the Popup or a Shortcut.
- **Shortcuts**: single keys on the Reels feed, never while you type. Defaults: `A` Auto-Scroll, `S` Speed, `↓` next Reel, `↑` previous Reel. Change them on the Settings Page.
- **Reels watched**: the toolbar Popup counts the Reels you've seen this session.
- **Session Limit and Break Nudge**: optionally set a limit in Reels or minutes; when you reach it, the Reel pauses and a calm notice asks if you'd like a break. Off unless you set it.

## Browsers

- [Chrome Web Store](https://chromewebstore.google.com/detail/reels-flow-auto-scroll-fo/mlmllpiifbmfnopepamjhbdedfjajgcl) (also works in Brave and other Chromium browsers)
- Microsoft Edge Add-ons
- Firefox Add-ons (Firefox 142 or later)

## Privacy

Reels Flow collects no data at all: no analytics, no error reports, no usage counts. Your settings and the Reels watched count stay in your browser. It asks only for the `storage` permission and access to www.instagram.com. See [ADR 0003](docs/adr/0003-zero-telemetry.md).

Found a problem? Use **Report a problem** in the Popup, or visit [reelsflow.cptdawn.dev/report](https://reelsflow.cptdawn.dev/report).

## Building from source

Needs Node.js and pnpm.

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm zip   # Chrome, Edge and Firefox packages, plus the Firefox source bundle, in .output/
```

`pnpm dev` (Chrome) and `pnpm dev:firefox` run a development build. Before a release, run the [release checklist](docs/release/checklist.md).

## License

[MIT](LICENSE)
