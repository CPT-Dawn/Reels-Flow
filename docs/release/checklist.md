# Release checklist

Run before every release, on real Instagram (logged in, instagram.com/reels/), once in each of Chrome, Edge and Firefox (Edge runs the Chrome package). Note results on the release issue as a table: browser × step, pass/fail, notes.

## Build

1. `bun install && bun run typecheck && bun run test`: all green.
2. `bun run zip`: the Chrome and Firefox zips and the Firefox sources zip appear in `.output/`, named with the release version.
3. `bun run build:firefox && bun run lint:firefox`: no errors.
4. Unzip the sources zip in an empty folder, run `bun install && bun run build:firefox`, and check that the output matches `.output/firefox-mv3`.
5. `bun run build:chrome`, then check `.output/chrome-mv3/manifest.json`: `permissions` is exactly `["storage"]` and `host_permissions` exactly `["https://www.instagram.com/*"]`. No `tabs`, no `activeTab`.
6. `CHANGELOG.md` has an entry for the release version, dated the release day.

## Install

Load the built package (`.output/chrome-mv3` in Chrome and Edge, or the Firefox zip through `about:debugging` → Load Temporary Add-on).

7. The toolbar and the extensions page show the new Reels Flow icon (not the Instagram glyph) and the name "Reels Flow".
8. A fresh install opens the Welcome Page on reelsflow.cptdawn.dev once, and so does an upgrade from the 2.x store version. A later 3.x update opens nothing; the Popup's What's new link shows a dot until opened.

## Reels Feed

9. Auto-Scroll on: a Reel that finishes moves to the next one.
10. Holds: no advance while the Reel is paused, the comments are open, a menu is open, or right after scrolling by hand.
11. The Reel Control (Auto button) sits beside each Reel and switches Auto-Scroll; the Popup switch follows.
12. Popup "Button on Reels" off hides the Reel Control.
13. Speed on: Reels play at the Preferred Speed; off: normal speed.
14. Shortcuts `A` and `S` work on the Reels feed and do nothing while typing in a comment or the search box. `↑` and `↓` still move between Reels the way Instagram does, once per press.
15. Change a Shortcut and the Preferred Speed in the Popup; both take effect without reloading.
16. Reels watched count goes up in the Popup as Reels are watched.
17. Set a Session Limit of 2 Reels: the Break Nudge appears after 2 Reels. Keep watching resumes; I'm done turns Auto-Scroll off and leaves the Reel paused.
18. Away from instagram.com/reels/ (Home feed, a profile, a single post), Reels Flow does nothing.

## Popup

19. Open the Popup on a non-Instagram tab (a new tab page or any site): the "Reels Flow works on Instagram Reels" card shows below the header; Open Reels opens instagram.com/reels/ in a new tab.
20. Open the Popup on an Instagram page that isn't the Reels Feed (home feed, a profile, a single Reel at /reel/…): Open Reels takes that same tab to instagram.com/reels/. On instagram.com/reels/ the card doesn't show.
21. After a fresh install the First-run Tip shows and names the Auto-Scroll Shortcut key; change that key under Keyboard shortcuts and the Tip follows. Tab to its close button and press Enter: the Tip goes, focus lands on the Auto-Scroll switch, and it stays gone after reopening the Popup.
22. With Auto-Scroll on, the Auto-Scroll card's text is readable in light and dark mode (the contrast test in `tests/browser/popup.test.ts` passes), and its switch knob, the moving Reels and the focus ring are clearly visible.

## Popup links

23. What's new and Report a problem each open the right page on reelsflow.cptdawn.dev, and the Popup offers no donation link. The extensions page offers no Options/Preferences entry for Reels Flow.
24. Uninstall opens the Goodbye page.

## Store listing

25. Listing text matches `docs/release/store-listing.md`: says "for Instagram", never implies Meta made or endorses it, data-collection declarations say none, and the privacy wording says settings sync only through the viewer's own browser account (never "nothing leaves your browser").
26. Screenshots and promo tiles show the new icon.
27. `file "store assets"/*/*.png` reports the sizes the listing's Images section asks for: every `screenshot-*.png` 1280 x 800, `promo-small-440x280.png` 440 x 280 and `marquee-1400x560.png` 1400 x 560.
