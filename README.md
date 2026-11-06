<div align="center">

<img src="store%20assets/Icon.png" alt="" width="96" height="96" />

# Reels Flow

**Instagram Reels, hands-free.**

When a Reel ends, the next one starts on its own.<br />
Cook, stretch or sit back while the feed keeps flowing.

<a href="https://chromewebstore.google.com/detail/reels-flow-auto-scroll-fo/mlmllpiifbmfnopepamjhbdedfjajgcl"><img src="https://img.shields.io/chrome-web-store/v/mlmllpiifbmfnopepamjhbdedfjajgcl?style=flat-square&logo=googlechrome&logoColor=white&label=Chrome%20Web%20Store&color=ff5a4a" alt="Chrome Web Store" /></a>
<a href="https://addons.mozilla.org/firefox/addon/reels-flow/"><img src="https://img.shields.io/amo/v/reels-flow?style=flat-square&logo=firefoxbrowser&logoColor=white&label=Firefox%20Add-ons&color=ff8a3d" alt="Firefox Add-ons" /></a>
<img src="https://img.shields.io/badge/data%20collected-none-2b2b33?style=flat-square" alt="Collects no data" />
<a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2b2b33?style=flat-square" alt="MIT License" /></a>

[**Website**](https://reelsflow.cptdawn.dev) · [**Report a problem**](https://reelsflow.cptdawn.dev/report) · [**Changelog**](CHANGELOG.md)

<br />

<img src="store%20assets/chrome/marquee-1400x560.png" alt="Reels Flow's Popup open over the Instagram Reels feed, with Auto-Scroll switched on" width="100%" />

</div>

<br />

## Install

| Browser | Get it |
| --- | --- |
| **Chrome**, **Edge**, Brave, Opera, Vivaldi and other Chromium browsers | [Chrome Web Store](https://chromewebstore.google.com/detail/reels-flow-auto-scroll-fo/mlmllpiifbmfnopepamjhbdedfjajgcl) |
| **Firefox** 142 or later | [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/reels-flow/) |

Open [instagram.com/reels](https://www.instagram.com/reels/), switch on Auto-Scroll, and let it play. In Edge, allow extensions from other stores when it asks; Reels Flow isn't listed on Edge Add-ons ([why](docs/adr/0005-chrome-web-store-and-firefox-add-ons-only.md)).

## What it does

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="store%20assets/chrome/screenshot-2.png" alt="The Auto button beside a Reel, among Instagram's own buttons" />
      <h3>Auto-Scroll</h3>
      Moves to the next Reel the moment one ends, and knows when to wait: while the Reel is paused, the comments or a menu are open, you're typing, or you just scrolled by hand. Switch it from the Auto button beside each Reel, the Popup, or <kbd>A</kbd>.
    </td>
    <td width="50%" valign="top">
      <img src="store%20assets/chrome/screenshot-3.png" alt="A Reel playing at 1.75× with the Speed slider" />
      <h3>Speed</h3>
      Play every Reel at your own pace, anywhere from 0.5× to 3×. Flip it on in the Popup or press <kbd>S</kbd>.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="store%20assets/chrome/screenshot-4.png" alt="The Break Nudge asking whether it's time for a break" />
      <h3>Breaks, when you want them</h3>
      Set an optional Session Limit in Reels or minutes. When you reach it, the Reel pauses and a calm note asks: keep watching, or call it a day?
    </td>
    <td width="50%" valign="top">
      <img src="store%20assets/chrome/screenshot-5.png" alt="Reels Flow's privacy promises and keyboard shortcuts" />
      <h3>Private by design</h3>
      No account, no analytics, no tracking. One permission, one site, and every line of code is right here to read.
    </td>
  </tr>
</table>

A few small comforts, too: every setting lives in the toolbar Popup, it counts the Reels you've watched this session, and your Shortcuts are single keys you can change, which never fire while you're typing. Instagram's own <kbd>↑</kbd> and <kbd>↓</kbd> keep working as always.

## Privacy

Reels Flow collects nothing and sends nothing to anyone: no analytics, no error reports, no usage counts.

Your settings live in your browser's synced extension storage, so when browser sync is on, your own Google or Mozilla account carries them to your other browsers; Reels Flow never sees them. The Reels watched count and the Popup's notes stay on this device. It asks only for the `storage` permission and access to www.instagram.com. The reasoning is in [ADR 0003](docs/adr/0003-zero-telemetry.md), and the full policy is at [reelsflow.cptdawn.dev/privacy](https://reelsflow.cptdawn.dev/privacy).

## Building from source

You'll need [Bun](https://bun.sh), plus Node.js, which WXT and Vitest run on.

```sh
bun install
bun run dev            # development build in Chrome (or: bun run dev:firefox)
bun run typecheck
bun run test           # real headless Chromium and Firefox
bun run zip            # store packages and the Firefox source bundle, in .output/
```

CI runs the same checks, plus `web-ext lint`, on every push and pull request. Fixes, translations and better tests are all welcome; [CONTRIBUTING.md](CONTRIBUTING.md) has the details, and [issue #18](https://github.com/CPT-Dawn/Reels-Flow/issues/18) is a good place to start.

<br />

<div align="center">
<sub>
Reels Flow is an independent project, not made, endorsed or supported by Instagram or Meta.<br />
<a href="LICENSE">MIT License</a> · Made by <a href="https://github.com/CPT-Dawn">CPT Dawn</a>
</sub>
</div>
