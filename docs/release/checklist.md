# Release checklist

Run before every release, on real Instagram (logged in, instagram.com/reels/), once in each of Chrome, Edge and Firefox. Note results on the release issue as a table: browser × step, pass/fail, notes.

## Build

1. `pnpm install && pnpm typecheck && pnpm test`: all green.
2. `pnpm zip`: the Chrome, Edge and Firefox zips and the Firefox sources zip appear in `.output/`, named with the release version.
3. `pnpm build:firefox && pnpm lint:firefox`: no errors.
4. Unzip the sources zip in an empty folder, run `pnpm install && pnpm build:firefox`, and check that the output matches `.output/firefox-mv3`.

## Install

Load the built package (`.output/chrome-mv3`, `.output/edge-mv3`, or the Firefox zip through `about:debugging` → Load Temporary Add-on).

5. The toolbar and the extensions page show the new Reels Flow icon (not the Instagram glyph) and the name "Reels Flow".
6. A fresh install opens the Welcome Page on reelsflow.cptdawn.dev once, and so does an upgrade from the 2.x store version. A later 3.x update opens nothing; the Popup's What's new link shows a dot until opened.

## Reels Feed

7. Auto-Scroll on: a Reel that finishes moves to the next one.
8. Holds: no advance while the Reel is paused, the comments are open, a menu is open, or right after scrolling by hand.
9. The Reel Control (Auto button) sits beside each Reel and switches Auto-Scroll; the Popup switch follows.
10. Popup "Button on Reels" off hides the Reel Control.
11. Speed on: Reels play at the Preferred Speed; off: normal speed.
12. Shortcuts `A`, `S`, `↓`, `↑` work on the Reels feed and do nothing while typing in a comment or the search box.
13. Change a Shortcut on the Settings Page; the new key works without reloading.
14. Reels watched count goes up in the Popup as Reels are watched.
15. Set a Session Limit of 2 Reels: the Break Nudge appears after 2 Reels. Keep watching resumes; I'm done turns Auto-Scroll off and leaves the Reel paused.
16. Away from instagram.com/reels/ (Home feed, a profile, a single post), Reels Flow does nothing.

## Popup links

17. Settings opens the Settings Page; What's new, Report a problem and Support Reels Flow each open the right page on reelsflow.cptdawn.dev.
18. Uninstall opens the Goodbye page.

## Store listing

19. Listing text matches `docs/release/store-listing.md`: says "for Instagram", never implies Meta made or endorses it, data-collection declarations say none.
20. Screenshots and promo tiles show the new icon.
