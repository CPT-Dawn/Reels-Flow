# Contributing to Reels Flow

Thanks for helping. Reels Flow is small on purpose, so the best contributions are fixes for things Instagram broke, translations, and tests that pin down how the Reels Feed behaves.

## Before you start

- **Bugs and ideas**: open an [issue](https://github.com/CPT-Dawn/Reels-Flow/issues/new), or ask in [Discussions](https://github.com/CPT-Dawn/Reels-Flow/discussions) if you're not sure yet. For bugs, say which browser and Reels Flow version you're on.
- **Code**: pick an issue labelled [`good first issue`](https://github.com/CPT-Dawn/Reels-Flow/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22), or comment on one you'd like to take, so two people don't build the same thing.
- **Words**: [`CONTEXT.md`](CONTEXT.md) is the glossary. Code, tests, issues and the Popup all use its terms (Reel, Advance, Hold, Reel Control and so on), and avoid the words it lists under _Avoid_.
- **Decisions already made** live in [`docs/adr/`](docs/adr/). Some are firm: Reels Flow collects no data at all ([ADR 0003](docs/adr/0003-zero-telemetry.md)), and it only ever links to pages on its own website ([ADR 0002](docs/adr/0002-link-only-to-stable-pages-on-own-site.md)). A change that goes against an ADR needs a new ADR first.

## Set up

Needs [Bun](https://bun.sh) (and Node.js, which WXT and Vitest run on).

```sh
bun install
bunx playwright install chromium firefox   # once, for the browser tests
bun run dev            # development build in Chrome
bun run dev:firefox    # or in Firefox
```

## Before you open a pull request

```sh
bun run typecheck
bun run test
bun run build:firefox && bun run lint:firefox
```

All three should pass. The engine tests in `tests/browser/` run in real headless Chromium and Firefox against saved, scrubbed copies of instagram.com/reels/. If Instagram changed its page, a fresh fixture is usually the first step of the fix; see [`tests/fixtures/README.md`](tests/fixtures/README.md). Never commit an unscrubbed page: it holds your account and other people's data.

Keep each pull request to one change, explain what it fixes and how you checked it, and link the issue it closes.

## Translating

Every word Reels Flow shows lives in [`public/_locales/en/messages.json`](public/_locales/en/messages.json).

1. Copy it to `public/_locales/<code>/messages.json`, where `<code>` is a [Chrome locale code](https://developer.chrome.com/docs/extensions/reference/api/i18n#locales) such as `de`, `pt_BR` or `hi`.
2. Translate each `message`. Leave the keys and the `description`s as they are; the descriptions tell you where each phrase appears.
3. Keep "for Instagram" in the name and description, never anything that suggests Instagram or Meta made Reels Flow.
4. Load a development build with your browser set to that language and check that nothing in the Popup is cut off.

## License

By contributing, you agree that your contribution is released under the [MIT License](LICENSE).
