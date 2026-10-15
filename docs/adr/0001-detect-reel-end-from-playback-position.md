# Detect a Reel's end from its playback position, not the `ended` event

Instagram sets `loop` on every Reel's video, and a looping video never fires `ended`. Earlier versions removed `loop` and listened for `ended`, but Instagram puts `loop` back, and that is how Reels Flow silently broke. We leave Instagram's looping alone and decide a Reel has ended by watching its playback position: it reaches the last moment of the video, or jumps from near the end back to the start. That works whatever Instagram does with `loop`, at any playback speed, and lets a Hold simply let the Reel loop once more.

## Considered Options

- **Strip `loop` repeatedly and listen for `ended`** (what competitors do): a race against Instagram's re-renders, and it is what broke.
- **Advance on a timer based on `duration`**: drifts with buffering, pausing and Speed, and cuts off the last word.
