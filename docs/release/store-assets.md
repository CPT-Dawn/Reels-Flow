# Store images

The Chrome Web Store and Firefox Add-ons images in `store assets/` are generated, not drawn. Every Popup, Auto button and Break Nudge in them is the real extension, built from this repo and running in Chromium, so the images can't drift from what ships.

```sh
bun run store-assets
```

That builds the Chrome package, then runs the two steps below. It takes about a minute. Commit the regenerated images with the change that made them differ.

## How it works

1. **Capture** (`scripts/store-assets/capture.ts`). Launches Chromium with `.output/chrome-mv3` loaded and serves the scrubbed Reels Feed fixture from `tests/fixtures/reels-dark` at its real `https://www.instagram.com/reels/` address, so the content script mounts as it would for a viewer. `stage.ts` dresses the fixture for a store image:
   - Reels show stock photos.
   - Names and captions are fictional (`nonna.at.noon`, `pug.diaries`…), not `creator1`/lorem ipsum.
   - Instagram's logo is hidden.

   Settings and the Session are written straight into extension storage, so each scene is a real state: Auto-Scroll on with 24 Reels watched, Speed at 1.75×, a 30-Reel Session Limit one Reel short of its Break Nudge. The Popup is captured at 3×, and the Reels Feed at 2× in a 1440×964 window. Raw captures go to `scripts/store-assets/.raw/` (gitignored).
2. **Compose** (`scripts/store-assets/shots.ts`, design kit in `kit.ts`). Lays the captures out as HTML pages and renders them at 2×. ImageMagick then downsamples each one with a Lanczos filter to the exact store size, as a 24-bit PNG with no alpha channel (both stores reject transparency in screenshots). The Firefox set uses a Firefox window frame; the Chrome set a Chrome one.

## The set

| # | File | Message | Scene |
| --- | --- | --- | --- |
| 1 | `screenshot-1.png` | Instagram Reels, hands-free. | The Reels Feed with the Popup open: Auto-Scroll on, 24 Reels watched |
| 2 | `screenshot-2.png` | The Auto button, right on the Reel. | Close-up of the Reel Control among Instagram's buttons |
| 3 | `screenshot-3.png` | Watch at your own pace. | Speed at 1.75×, with the Popup's Speed card |
| 4 | `screenshot-4.png` | Breaks, when you want them. | The real Break Nudge, with the Session Limit card |
| 5 | `screenshot-5.png` | Nothing to sign up for. Nothing collected. | Privacy facts and the Shortcuts card |
| | `promo-small-440x280.png` | Reels Flow · Instagram Reels, hands-free. | Chrome small promo tile: icon, name, a strip of Reels |
| | `marquee-1400x560.png` | Instagram Reels, hands-free. | Chrome marquee: headline beside screenshot 1's scene |

Screenshot 1 does most of the work: the store shows it first, and most visitors see no other. It states the one benefit in four words and shows the product doing it.

## Design rules

- **One system:** a deep ink canvas (`#0d0b11`); soft auras, a faint grid and film grain in the icon's coral → orange → amber; Manrope (the website's typeface, SIL OFL) at 800 weight with tight tracking for headlines; muted 21px body text. The gradient appears only on the words that carry the benefit.
- **One idea per image:** a numbered eyebrow, a headline of no more than seven words, and one or two sentences. The text has to read at the store's carousel size (about half scale).
- **Real UI only:** never mock up a control the extension doesn't have, and never show a state it can't reach.
- **Brand safety (store-listing.md):** no Instagram logo, no Reels glyph, and nothing that suggests Instagram or Meta made Reels Flow. Instagram's own action buttons appear only as the place the Reel Control sits.
- **Contrast:** headline and body text clear WCAG AA against the canvas.

## Photo credits

The Reels show photos from Unsplash under the [Unsplash License](https://unsplash.com/license) (free for commercial use, no attribution required; credited here anyway), fetched through picsum.photos. They live in `scripts/store-assets/photos/`, named by picsum id.

| Photo | Photographer | Source |
| --- | --- | --- |
| 292 | Webvilla | https://unsplash.com/photos/hv1MrBzGGNY |
| 1025 | Matthew Wiebe | https://unsplash.com/photos/U5rMrSI7Pn4 |
| 1011 | Roberto Nickson | https://unsplash.com/photos/7BjmDICVloE |
| 1060 | Karl Fredrickson | https://unsplash.com/photos/TYIzeCiZ_60 |
| 1069 | Marat Gilyadzinov | https://unsplash.com/photos/wpTWYBll4_w |
| 237 | André Spieker | https://unsplash.com/photos/8wTPqxlnKM4 |
| 1080 | veeterzy | https://unsplash.com/photos/OJJIaFZOeX4 |
| 177 | Danka & Peter | https://unsplash.com/photos/tvicgTdh7Fg |
| 1027 | Roksolana Zasiadko | https://unsplash.com/photos/LyeduBb2Auk |
| 64 | Alexander Shustov | https://unsplash.com/photos/AHBiSKaENwc |
| 225 | Vee O | https://unsplash.com/photos/hGO27G5tZJ8 |
| 431 | Carli Jean | https://unsplash.com/photos/UWRqlJcDCXA |
| 219 | Martyn Seddon | https://unsplash.com/photos/7iB4OZDlRok |
