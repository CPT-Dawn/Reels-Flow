# Changelog

All notable changes to Reels Flow are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2026-11-04

### Added

- **Open Reels card**: when the Popup opens away from the Reels Feed, a card says Reels Flow works on Instagram Reels and an Open Reels button goes there, in the current Instagram tab or a new tab. No new permission: the Popup reads only Instagram tabs' addresses, through the existing access to www.instagram.com.
- **First-run Tip**: a small note in the Popup on how Reels Flow starts, naming your own Auto-Scroll Shortcut. Close it once and it stays closed on that device.

### Changed

- The Auto-Scroll card in the Popup uses a deeper coral-to-amber glow, solid white text, a darker key cap and a smoked switch track, so all its text meets WCAG AA contrast (4.5:1 or more) in light and dark mode.
- Privacy wording in the README and store listing now says exactly what happens: Reels Flow collects nothing and sends nothing to anyone, and your settings sync through your own browser account only when browser sync is on.
- New store images: five screenshots per store, a small promo tile and a marquee, generated from the real extension by `bun run store-assets`.
- Store listing rewritten for 3.1.0: How to start steps, one category, help and privacy policy links, and a fuller host-access justification.

## [3.0.0] - 2026-10-31

A full rewrite in TypeScript on WXT, one codebase for Chrome and Firefox.

### Added

- Auto-Scroll that tells a Reel has ended from its playback position, so it keeps working however Instagram loops its videos.
- Holds: Auto-Scroll waits while the Reel is paused, the comments or a menu are open, you're typing, or you just scrolled by hand.
- The Reel Control, an Auto-Scroll button among Instagram's own buttons beside each Reel.
- Speed, playing every Reel at your Preferred Speed (0.5×–3×).
- Shortcuts for Auto-Scroll and Speed, which you can change; Instagram's own Up and Down keys still move between Reels.
- Reels watched this Session, an optional Session Limit and a calm Break Nudge.
- Welcome, What's new, Report and Goodbye pages on reelsflow.cptdawn.dev.
- A new flat icon that reads at 16px.

### Changed

- Every setting lives in the Popup; there is no separate settings page.
- Settings from 2.x carry over, including on a second synced device.
- Published on the Chrome Web Store and Firefox Add-ons (Firefox 142 or later); Edge and other Chromium browsers use the Chrome Web Store build.

### Security

- Zero telemetry: no analytics, error reports or usage counts.

[3.1.0]: https://github.com/CPT-Dawn/Reels-Flow/compare/v3.0.0...v3.1.0
[3.0.0]: https://github.com/CPT-Dawn/Reels-Flow/releases/tag/v3.0.0
