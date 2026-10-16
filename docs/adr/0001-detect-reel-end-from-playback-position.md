# Detect a Reel's end from its playback position, not the `ended` event

Instagram loops every Reel, and how it does so is not ours to rely on. Earlier versions removed `loop` and listened for `ended`, and Reels Flow silently broke when Instagram changed its player. As of October 2026 Instagram sets no `loop` at all: its player lets the video end, fires `ended`, then seeks back to 0 and plays again, faster than any Advance could happen first. We leave Instagram's looping alone and decide a Reel has ended by watching its playback position: it reaches the last moment of the video, or jumps from near the end back to the start. That works whether Instagram restarts the video itself or sets `loop` (which never fires `ended`), at any playback speed, and lets a Hold simply let the Reel loop once more.

## Considered Options

- **Strip `loop` repeatedly and listen for `ended`** (what competitors do): a race against Instagram's re-renders, and it is what broke.
- **Listen for `ended` alone**, now that Instagram fires it: works only until Instagram's player changes again, and it races Instagram's own restart.
- **Advance on a timer based on `duration`**: drifts with buffering, pausing and Speed, and cuts off the last word.
