# Reels Flow

A browser extension that makes Instagram's desktop Reels feed play hands-free, moving on to the next reel when the current one finishes, with controls that look and feel like a native Instagram feature.

## Language

### Watching

**Reels Feed**:
The vertically scrolling stream of reels at instagram.com/reels/. The only place Reels Flow acts.
_Avoid_: Reels page, feed (unqualified), Explore, single reel page

**Reel**:
One short video in the Reels Feed.
_Avoid_: Video, short, post

**Current Reel**:
The Reel the viewer is watching right now — the one occupying the viewport.
_Avoid_: Active video, focused reel

**Auto-Scroll**:
The mode in which Reels Flow Advances the Reels Feed on its own. It is either on or off, and the setting applies everywhere at once, not per tab.
_Avoid_: Auto-play, autoReelsStart, auto-next

**Advance**:
One move from the Current Reel to the next Reel, made by Auto-Scroll.
_Avoid_: Skip, scroll (as a noun), next

**Hold**:
A condition under which Auto-Scroll declines to Advance a Reel that has ended, because the viewer has stepped in: the Reel is paused, the comments or a menu is open, the viewer is typing, or the viewer scrolled by hand moments ago. A background tab is not a Hold.
_Avoid_: Pause (that word belongs to the Reel), block, interrupt

**Speed**:
Whether the Reels Feed plays at the Preferred Speed instead of normal speed. On or off, everywhere, until switched.
_Avoid_: Fast mode, playback rate

**Preferred Speed**:
The viewer's chosen playback speed (0.5×–3×) that Speed switches to.
_Avoid_: Custom speed, rate

### Wellbeing

**Session**:
One continuous stretch of watching the Reels Feed. It ends after 30 minutes with no Reel playing, whether the viewer was away from the Reels Feed or left it paused in front of them.
_Avoid_: Visit, sitting

**Reels Watched**:
The count of Reels the viewer has seen in the current Session, whether reached by Advance or by hand.
_Avoid_: Scroll count, advances

**Session Limit**:
An optional cap on a Session, in Reels Watched or in minutes. Off unless the viewer sets it.
_Avoid_: Timer, screen-time limit

**Break Nudge**:
What happens when a Session reaches its Session Limit: the Current Reel pauses and a gentle notice appears, which the viewer can dismiss to keep watching.
_Avoid_: Lock, block, alert

### Controls

**Reel Control**:
The Auto-Scroll on/off button Reels Flow places on the Reels Feed, ideally among Instagram's own action buttons beside each Reel.
_Avoid_: Toggle, injected button, floating button, injectReelsButton

**Shortcut**:
A single key that acts on the Reels Feed (e.g. Auto-Scroll on/off, Speed on/off, next/previous Reel). Active only on the Reels Feed and never while the viewer is typing. The viewer can change which key does what.
_Avoid_: Hotkey, command, keybind

**Popup**:
The panel that opens from the extension's toolbar icon; it holds the everyday controls, the Session counter and the links.
_Avoid_: Dashboard, control center, menu

**Settings Page**:
The full-page settings screen for less-used options: Shortcuts and the Preferred Speed.
_Avoid_: Options page, preferences

**What's new**:
The Popup link to news about recent versions. After an update it carries a dot until the viewer opens it; updates never open a tab on their own.
_Avoid_: Changelog, release notes, update notification

### Outreach

**Support Page**:
The page on the Reels Flow website where a viewer can choose to donate. The extension only ever links here, never to a payment provider directly.
_Avoid_: Donate link, tip jar

**Welcome Page**:
The page on the Reels Flow website opened once, right after a fresh install or an upgrade from 2.x (then showing what's new in v3). The Popup's What's new link also leads here.
_Avoid_: Onboarding tab, landing page

**Report Page**:
The page on the Reels Flow website where a viewer reports a problem, by GitHub issue or by plain message. The extension passes along its version and browser when linking here.
_Avoid_: Bug report link, GitHub link

**Goodbye Page**:
The page on the Reels Flow website opened when the extension is uninstalled; it asks why.
_Avoid_: Uninstall survey
