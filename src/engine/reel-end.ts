/**
 * How short of its end, in seconds of real time, a Reel may jump back and
 * still count as having played to its end: the browser takes a moment to
 * report the jump.
 */
const END_TOLERANCE = 0.25;

const HAVE_FUTURE_DATA = 3;

/** The last time a Reel's video reported where it was. */
type Report = {
  /** Its playback position, in seconds. */
  time: number;
  /** When it was there, in ms on the page's clock. */
  at: number;
  /** How fast it was playing on from there: 0 while paused or waiting for data. */
  speed: number;
  /** Whether this playthrough has reached its end already. */
  ended: boolean;
};

/**
 * The Reel end detector (ADR 0001). Calls `onEnd` with a Reel's video once
 * per playthrough, when its playback position reaches the end, or jumps back
 * once playback has run into the end: whichever it sees first. That works
 * whether Instagram restarts the video itself or sets `loop`, which is left
 * alone. `ended` is listened to only as one more moment to read the position
 * at. Returns a function that stops watching.
 */
export function watchReelEnds(
  document: Document,
  onEnd: (video: HTMLVideoElement) => void,
): () => void {
  const reports = new WeakMap<HTMLVideoElement, Report>();

  const observe = (event: Event) => {
    const video = event.target as HTMLVideoElement;
    if (video.tagName !== 'VIDEO') return;
    // Reloaded: its position goes back to 0 without the Reel having looped.
    if (event.type === 'emptied') {
      reports.delete(video);
      return;
    }
    const { currentTime: time, duration } = video;
    if (!(duration > 0)) return;

    const last = reports.get(video);
    const speed = !video.paused && video.readyState >= HAVE_FUTURE_DATA ? video.playbackRate : 0;
    // Media plays in real time, so this is the page's clock, not the engine's.
    const at = event.timeStamp;
    const jumpedBack = last !== undefined && time < last.time;
    // Where playback had got to when it jumped, had it kept going since its
    // last report. Sparse reports, at any speed, still see it reach the end.
    const reached = last ? last.time + ((at - last.at) / 1000) * last.speed : time;
    const finished =
      video.ended ||
      time >= duration ||
      (jumpedBack && reached >= duration - END_TOLERANCE * last.speed);

    if (finished && !last?.ended) onEnd(video);
    // A jump back clear of the end begins the next playthrough.
    const nextPlaythrough = jumpedBack && time < duration - END_TOLERANCE * video.playbackRate;
    reports.set(video, {
      time,
      at,
      speed,
      ended: !nextPlaythrough && (finished || (last?.ended ?? false)),
    });
  };

  // Every event that reports a change in where or how fast a video plays.
  // Media events don't bubble, so catch them on their way down to the video.
  const types = ['timeupdate', 'seeking', 'ended', 'pause', 'playing', 'waiting', 'ratechange', 'emptied'];
  for (const type of types) document.addEventListener(type, observe, true);
  return () => {
    for (const type of types) document.removeEventListener(type, observe, true);
  };
}
