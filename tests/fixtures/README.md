# Reels Feed fixtures

Saved copies of instagram.com/reels/, scrubbed of personal data, that every engine test in `tests/browser/` runs against, in Chromium and in Firefox. Each folder holds one fixture:

- `page.html`: the scrubbed page, with Instagram's scripts removed and every Reel's video playing a short clip from `clips/`.
- `fixture.json`: the size of the window it was captured in, and its `/reels/` address.

`describeEachFixture()` and `mountReelsFeed()` in `tests/browser/support/feed.ts` pick up every folder here on their own; wrap every engine test in `describeEachFixture()` so it runs against all of them. Tests mount the engine onto a fixture with a test settings store and a clock they control. Since the scripts are gone, `mountReelsFeed()` also stands in for Instagram's player: it plays the Current Reel, pauses the others, and sets `loop` on every video at run time as Instagram does (ADR 0001). The captured markup has no `loop` attribute, so none is added to it.

## Adding a fixture

When Instagram changes its page, a fresh copy of the Reels Feed is the first step of the fix.

1. Log in to Instagram in a desktop browser, open instagram.com/reels/ and watch until at least three Reels have loaded. Set up whatever the fixture is for (dark mode, comments open, a narrow window).
2. Save the page with the [SingleFile](https://github.com/gildas-lormeau/SingleFile) extension, **outside this repo**: until it is scrubbed it holds your account and other people's data.
3. Note the window's inner size: run `[innerWidth, innerHeight]` in the console. A Reel fills the window height less 32px, so `innerHeight` is also the Reel's height plus 32.
4. Scrub it into a new fixture:

   ```sh
   node scripts/scrub-snapshot.ts ~/saved/reels.html reels-<what-it-shows> \
     --width 1920 --height 964 --description "What this fixture captures"
   ```

   The script refuses to write the fixture if a username, an Instagram address, a real picture or a script is left in it. It replaces names with `creator1`, `creator2`…, everything people wrote with lorem ipsum, and every picture with a grey square, and keeps Instagram's own labels (Like, Comment, Share…), which the engine relies on.
5. Open `page.html` and skim it for anything personal the script didn't know about, such as interface text it should have kept or a new kind of label. Improve the script's lists rather than editing the page by hand, so the next fixture benefits too.
6. Delete the saved page, then run `pnpm test`. The new fixture should now fail the tests the change on Instagram broke.

The clips in `clips/` are 2 to 3 second test patterns (VP9 WebM, which both browsers play), and `scrub-snapshot.ts` hands them out to Reels in turn.
