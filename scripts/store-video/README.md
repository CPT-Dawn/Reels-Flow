# Store video

The ~50 s promo linked from the Chrome Web Store and Firefox Add-ons listings (uploaded unlisted to YouTube).

- `web/compose.{html,css,js}`: the whole film as one page; `compose.js` holds the timeline (100 BPM, cuts on beats).
- `render.ts`: renders it frame by frame from the real built extension. A render-only copy of
  `.output/chrome-mv3` (in `.raw/ext/`, content script allowed into iframes, `web/hook.js` in the Popup)
  serves the page, with the real Reels Feed fixture and the real Popup live in iframes. Every CSS animation
  is seeked to the video clock, so renders are deterministic.
- `music/score.py`: the original score, synthesized.

Finishing (sound design, mix, master to −14 LUFS, 4K HEVC encode, QC) happens in the SouVi Engine,
project `reels-flow`.

```sh
bun run build:chrome
bun scripts/store-video/render.ts --scale 1 --stills 2,8,23    # review stills in .raw/stills/
bun scripts/store-video/render.ts --jobs 5                     # 4K60 ProRes picture in .raw/picture.mov
```
