#!/usr/bin/env python3
"""Reels Flow store video: original score (fully synthesized, no samples).

100 BPM, 4/4, bar = 2.4 s, beat = 0.6 s, bar 1 at t = 0. File length 51.0 s.
Key: D major. Output: 48 kHz / 24-bit stereo WAV, peak -3 dBFS, unmastered.

    python score.py [out.wav]          (needs numpy, scipy, soundfile)

Sections (bars, 1-based):
  1-2   intro: pad swells from silence, sparse glass motif, no drums
  3-6   pulse enters (kick, sub, arp), gentle build; rim from bar 5
  7-8   lift: accents at 14.4 / 15.6 / 16.8 s, swell into bar 9
  9-15  main groove (fullest)
  16-17 soften: drums out, calm breath
  18    rebuild + filtered riser
  19    resolve on D, final chord rings out to silence by ~51 s
"""
import sys
import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
LEN = 51.0
N = int(LEN * SR)
BAR = 2.4
BEAT = 0.6
RNG = np.random.default_rng(20261105)


def bar(n):
    return (n - 1) * BAR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def curve(points, t):
    """Piecewise-linear automation, points = [(time, value), ...]."""
    ts, vs = zip(*points)
    return np.interp(t, ts, vs)


def smooth(x, ms):
    a = np.exp(-1.0 / (SR * ms / 1000.0))
    return signal.lfilter([1 - a], [1, -a], x)


def stereo():
    return np.zeros((2, N))


def place(stem, x, t0, pan=0.0, gain=1.0):
    """Add mono (or stereo) x into stem at time t0 with constant-power pan."""
    i0 = int(round(t0 * SR))
    if x.ndim == 1:
        th = (pan + 1) * np.pi / 4
        x = np.stack([x * np.cos(th), x * np.sin(th)]) * np.sqrt(2)
    n = min(x.shape[1], N - i0)
    if n <= 0:
        return
    stem[:, i0:i0 + n] += gain * x[:, :n]


def fade_edges(x, a_ms=2.0, r_ms=10.0):
    a = int(SR * a_ms / 1000)
    r = int(SR * r_ms / 1000)
    x = x.copy()
    if a:
        x[..., :a] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, a))
    if r:
        x[..., -r:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, r))
    return x


def sos(kind, f, order=2):
    return signal.butter(order, f, btype=kind, fs=SR, output="sos")


def filt(x, kind, f, order=2):
    return signal.sosfilt(sos(kind, f, order), x, axis=-1)


# ----------------------------------------------------------------- harmony
# pad voicings (MIDI) and sub roots
CH = {
    "Dmaj9": ([50, 57, 61, 64, 66], 38),
    "Bm9":   ([50, 57, 61, 62, 66], 35),
    "Gmaj9": ([50, 57, 59, 62, 66], 31),
    "Em9":   ([50, 55, 59, 62, 66], 40),
    "A6sus": ([50, 57, 62, 64, 66], 33),
    "A6":    ([49, 57, 61, 64, 66], 33),
    "Dfin":  ([50, 57, 61, 64, 66, 69, 74], 38),
}
# (start time, end time, chord)
PROG = [
    (bar(1), bar(3), "Dmaj9"),
    (bar(3), bar(5), "Bm9"),
    (bar(5), bar(7), "Gmaj9"),
    (bar(7), bar(8), "Em9"),
    (bar(8), bar(8) + 2 * BEAT, "A6sus"),
    (bar(8) + 2 * BEAT, bar(9), "A6"),
    (bar(9), bar(11), "Dmaj9"),
    (bar(11), bar(13), "Bm9"),
    (bar(13), bar(15), "Gmaj9"),
    (bar(15), bar(15) + 2 * BEAT, "A6sus"),
    (bar(15) + 2 * BEAT, bar(16), "A6"),
    (bar(16), bar(17), "Gmaj9"),
    (bar(17), bar(18), "Em9"),
    (bar(18), bar(18) + 2 * BEAT, "A6sus"),
    (bar(18) + 2 * BEAT, bar(19), "A6"),
]
FINAL = bar(19)  # 43.2 s

T = np.arange(N) / SR

# ----------------------------------------------------------------- automation
# pad low-pass cutoff (Hz) across the piece
PAD_FC = curve([
    (0.0, 500), (2.0, 900), (4.8, 1200), (14.4, 1700), (19.0, 2600), (19.2, 2400),
    (35.5, 2500), (36.6, 1000), (40.8, 1000), (43.1, 3000), (43.2, 3200),
    (46.0, 1500), (51.0, 700)], T)
PAD_FC *= 1 + 0.08 * np.sin(2 * np.pi * T / (4 * BAR))  # slow breathing
# pad level
PAD_LVL = curve([
    (0.0, 0.0), (1.5, 0.85), (4.8, 0.8), (14.4, 0.85), (19.2, 1.0), (36.0, 1.0),
    (36.8, 0.62), (40.8, 0.62), (43.2, 0.9), (51.0, 0.9)], T)
# the opening swell: raised-cosine from silence over 1.5 s
sw = int(1.5 * SR)
PAD_LVL[:sw] = 0.85 * (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, sw)))


# ----------------------------------------------------------------- pad
def saw_voice(f0, t_abs, fc, detune_c, ph0):
    """Band-limited saw built additively, 2-pole low-pass baked into partials."""
    f = f0 * 2 ** (detune_c / 1200)
    drift = 1 + 0.0012 * np.sin(2 * np.pi * (0.11 + 0.05 * RNG.random()) * t_abs + ph0)
    phase = 2 * np.pi * np.cumsum(f * drift) / SR + ph0
    out = np.zeros_like(t_abs)
    kmax = int(min(7000, 2.6 * fc.max()) / f) + 1
    for k in range(1, kmax + 1):
        a = (1.0 / k) / np.sqrt(1 + (k * f / fc) ** 4)
        out += a * np.sin(k * phase + RNG.random() * 2 * np.pi)
    return out


VOICES = [(-11, -0.85), (-4, -0.35), (4, 0.35), (11, 0.85)]


def pad_note(m, t0, dur, att, rel, sustain_tau=None):
    L = int((dur + rel * 6) * SR)
    L = min(L, N - int(t0 * SR))
    tl = np.arange(L) / SR
    ta = t0 + tl
    i0 = int(t0 * SR)
    fc = PAD_FC[i0:i0 + L]
    env = np.ones(L)
    na = max(int(att * SR), 1)
    env[:na] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, na))
    if sustain_tau:
        env *= np.exp(-tl / sustain_tau)
    nd = int(dur * SR)
    if nd < L:
        env[nd:] *= np.exp(-(tl[nd:] - dur) / rel)
    out = np.zeros((2, L))
    for det, pan in VOICES:
        v = saw_voice(mtof(m), ta, fc, det, RNG.random() * 6.283)
        th = (pan + 1) * np.pi / 4
        out[0] += v * np.cos(th)
        out[1] += v * np.sin(th)
    out *= env / len(VOICES)
    return fade_edges(out, 0, 20)


def build_pad():
    pad = stereo()
    for i, (t0, t1, name) in enumerate(PROG):
        notes, _ = CH[name]
        att = 1.5 if i == 0 else 0.35
        for m in notes:
            place(pad, pad_note(m, t0, t1 - t0, att, 0.45), t0)
    # final chord: quick bloom then long natural decay
    for m in CH["Dfin"][0]:
        place(pad, pad_note(m, FINAL, 0.0, 0.02, 1.75, None), FINAL)
    # warmth: soft sine an octave under the lowest pad tone, centred
    warm = np.zeros(N)
    for t0, t1, name in PROG + [(FINAL, LEN, "Dfin")]:
        m = CH[name][1] + 12  # follow the root so it never beats against the sub
        i0, i1 = int(t0 * SR), int(min(t1 + 0.6, LEN) * SR)
        tl = np.arange(i1 - i0) / SR
        e = np.minimum(tl / 0.3, 1) * np.where(tl > t1 - t0, np.exp(-(tl - (t1 - t0)) / 0.25), 1)
        if name == "Dfin":
            e = np.minimum(tl / 0.02, 1) * np.exp(-tl / 1.5)
        warm[i0:i1] += 0.16 * e * np.sin(2 * np.pi * mtof(m) * tl)
    pad[0] += warm
    pad[1] += warm
    pad = filt(pad, "highpass", 110)
    return pad * PAD_LVL


# ----------------------------------------------------------------- glass pluck / bell
def fm_tone(m, dur, ratio, index, idx_tau, amp_tau, att=0.003, detune=0.0):
    f = mtof(m) * 2 ** (detune / 1200)
    L = int(dur * SR)
    t = np.arange(L) / SR
    I = index * np.exp(-t / idx_tau) + 0.08
    mod = I * np.sin(2 * np.pi * f * ratio * t)
    x = np.sin(2 * np.pi * f * t + mod)
    env = np.exp(-t / amp_tau)
    na = max(int(att * SR), 1)
    env[:na] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, na))
    return fade_edges(x * env, 0, 30)


def pluck(m, vel, bright):
    a = fm_tone(m, 1.0, 2.0, 1.1 * bright, 0.05, 0.20, detune=-5)
    b = fm_tone(m, 1.0, 2.0, 1.1 * bright, 0.05, 0.20, detune=5)
    # glass partial: soft 3x shimmer that dies quickly
    c = 0.12 * fm_tone(m + 19, 1.0, 1.0, 0.0, 0.1, 0.07)
    return vel * np.stack([a + c, b + c])


def bell(m, vel, dur=3.0, tau=1.1):
    a = fm_tone(m, dur, 3.5, 0.9, 0.25, tau, att=0.004, detune=-3)
    b = fm_tone(m, dur, 3.5, 0.9, 0.25, tau, att=0.004, detune=3)
    s = 0.35 * fm_tone(m, dur, 1.0, 0.6, 0.4, tau * 1.4, att=0.004)
    return vel * np.stack([a + s, b + s])


def arp_tones(name):
    pcs = sorted({n % 12 for n in CH[name][0]})
    tones = [o * 12 + pc for o in range(5, 8) for pc in pcs]
    return [m for m in tones if 69 <= m <= 88]


ARP_PAT = [0, 2, 4, 1, 3, 5, 2, 4, 0, 2, 4, 1, 3, 5, 4, 2]


def chord_at(t):
    for t0, t1, name in PROG:
        if t0 <= t + 1e-6 < t1:
            return name
    return "Dmaj9"


def build_arp(events):
    arp = stereo()
    step = BEAT / 2
    t, i = bar(3), 0
    while t < FINAL - 1e-6:
        bn = int(np.floor(t / BAR + 1e-6)) + 1
        pos = round((t - bar(bn)) / step)  # 8th index within bar 0..7
        name = chord_at(t)
        tones = arp_tones(name)
        m = tones[ARP_PAT[i % 16] % len(tones)]
        if bn <= 6:      # build
            lvl, br = 0.35 + 0.35 * (t - bar(3)) / (bar(7) - bar(3)), 0.6
        elif bn <= 8:    # lift
            lvl, br = 0.65, 0.8
        elif bn <= 15:   # main
            lvl, br = 0.8, 1.0
        elif bn <= 17:   # breath: quarter notes only
            lvl, br = 0.4, 0.5
            if pos % 2:
                t += step; i += 1
                continue
        else:            # bar 18: 16ths, crescendo
            lvl, br = 0.3, 0.6
        acc = 1.0 if pos % 2 == 0 else 0.72
        hum = 1 + 0.06 * (RNG.random() - 0.5)
        if bn == 18:
            for h in range(2):
                tt = t + h * step / 2
                prog = (tt - bar(18)) / BAR
                mm = tones[(ARP_PAT[(2 * i + h) % 16]) % len(tones)]
                place(arp, pluck(mm, (0.3 + 0.6 * prog) * hum * (1 if h == 0 else 0.75), 0.5 + 0.6 * prog), tt)
                events.append(("arp", tt))
        else:
            place(arp, pluck(m, lvl * acc * hum, br), t)
            events.append(("arp", t))
        t += step
        i += 1
    return filt(arp, "lowpass", 6500)


def tempo_delay(x, d=0.45, fb=0.36, repeats=6):
    """Dotted-8th ping-pong delay; each repeat darker."""
    out = np.zeros_like(x)
    D = int(d * SR)
    mono = 0.5 * (x[0] + x[1])
    cur = filt(mono, "highpass", 300)
    for r in range(1, repeats + 1):
        cur = filt(cur, "lowpass", 4200, 1)
        g = fb ** r
        ch = 0 if r % 2 else 1
        sh = D * r
        out[ch, sh:] += g * cur[:N - sh]
        out[1 - ch, sh:] += 0.25 * g * cur[:N - sh]
    return out


def build_bells(events):
    b = stereo()
    motif = [(1.2, 78, .55), (1.8, 81, .5), (2.4, 76, .6), (3.6, 73, .45), (4.2, 76, .4)]
    for t, m, v in motif:
        place(b, bell(m, 0.8 * v), t); events.append(("bell", t))
    # motif returns in the main groove (bar 9 on D, bar 13 on G)
    for base, notes in ((bar(9), [78, 81, 76, 73, 76]), (bar(13), [78, 81, 74, 71, 74])):
        for (dt, _, v), m in zip(motif, notes):
            place(b, bell(m, 0.55 * v), base + dt); events.append(("bell", base + dt))
    # lift accents: glass chord stabs on 14.4 / 15.6 / 16.8
    stabs = [(bar(7), [74, 78, 83], 0.55), (bar(7) + 2 * BEAT, [74, 79, 83], 0.5), (bar(8), [76, 81, 86], 0.6)]
    for t, ms, v in stabs:
        for m in ms:
            place(b, bell(m, v / 1.6, 2.4, 0.8), t)
        events.append(("stab", t))
    # breath: a single sustained bell answer in bar 17
    place(b, bell(81, 0.3, 3.0, 1.2), bar(17)); place(b, bell(78, 0.25, 3.0, 1.2), bar(17) + 2 * BEAT)
    # final chord bell
    for m, v in ((74, .45), (78, .4), (81, .38), (88, .14)):
        place(b, bell(m, v, 7.0, 1.6), FINAL)
    events.append(("bell", FINAL))
    return filt(b, "lowpass", 7000)


# ----------------------------------------------------------------- drums
def kick(vel, big=False, f_end=46.0):
    L = int(1.2 * SR if big else 0.6 * SR)
    t = np.arange(L) / SR
    f = f_end + (126 - f_end) * np.exp(-t / 0.032)
    ph = 2 * np.pi * np.cumsum(f) / SR
    tau = 0.32 if big else 0.24
    x = np.sin(ph) * np.exp(-t / tau)
    x = np.tanh(1.4 * x) / np.tanh(1.4)
    click = filt(RNG.standard_normal(L), "bandpass", [900, 3500]) * np.exp(-t / 0.003) * 0.06
    return fade_edges(vel * (x + click), 1.0, 40)


def noise_hit(L_s, band, tau, att=0.001):
    L = int(L_s * SR)
    t = np.arange(L) / SR
    n = filt(RNG.standard_normal(L), "bandpass", band)
    e = np.exp(-t / tau)
    na = max(int(att * SR), 1)
    e[:na] *= np.linspace(0, 1, na)
    return fade_edges(n * e, 0, 15)


def shaker(vel):
    x = noise_hit(0.14, [4500, 9500], 0.035, att=0.006)
    return vel * x / 3.0


def rim(vel):
    L = int(0.25 * SR)
    t = np.arange(L) / SR
    tone = np.sin(2 * np.pi * 1650 * t) * np.exp(-t / 0.018) * 0.5
    body = noise_hit(0.25, [1200, 5000], 0.05)
    return fade_edges(vel * (tone + 0.35 * body), 0.5, 15)


KICK_TUNE = {"Dmaj9": mtof(33), "Dfin": mtof(33), "Bm9": mtof(35), "Gmaj9": mtof(31),
             "Em9": mtof(28), "A6sus": mtof(33), "A6": mtof(33)}


def build_drums(events):
    k = stereo(); hat = stereo(); sn = stereo()
    kicks = []

    def K(t, v, big=False):
        # kick tail tuned to the chord (root, or the fifth on D) so it never beats against the sub
        root = chord_at(t) if t < FINAL else "Dfin"
        f_end = KICK_TUNE[root]
        place(k, kick(v, big, f_end), t); kicks.append((t, v)); events.append(("kick", t))

    def H(t, v, pan):
        place(hat, shaker(v), t, pan=pan); events.append(("hat", t))

    def S(t, v):
        place(sn, rim(v), t, pan=0.1); events.append(("rim", t))

    for bn in range(3, 19):
        b0 = bar(bn)
        if bn in (3, 4):
            K(b0, .55); K(b0 + 2 * BEAT, .45)
            for e in range(8):
                H(b0 + e * BEAT / 2, .22 if e % 2 == 0 else .32, .3)
        elif bn in (5, 6):
            K(b0, .62); K(b0 + 2 * BEAT, .52)
            if bn == 6:
                K(b0 + 1.5 * BEAT, .28)
            S(b0 + BEAT, .28); S(b0 + 3 * BEAT, .32)
            for e in range(8):
                H(b0 + e * BEAT / 2, .25 if e % 2 == 0 else .38, .3)
        elif bn in (7, 8):
            # lift: the three word accents carry the bar
            if bn == 7:
                K(b0, 1.0, True); K(b0 + 2 * BEAT, .95, True)
            else:
                K(b0, 1.0, True); K(b0 + 2 * BEAT, .5)
            for e in range(8):
                H(b0 + e * BEAT / 2, .2 if e % 2 == 0 else .3, .3)
            if bn == 8:
                for e in range(8):   # 16th shaker rise into bar 9
                    H(b0 + 2 * BEAT + e * BEAT / 4, .15 + .05 * e, -.3)
        elif 9 <= bn <= 15:
            K(b0, .82); K(b0 + 2 * BEAT, .72)
            if bn % 2 == 0:
                K(b0 + 1.5 * BEAT, .3)
            S(b0 + BEAT, .5); S(b0 + 3 * BEAT, .55)
            if bn == 15:
                S(b0 + 3.75 * BEAT, .22)
            for s in range(16):
                v = (.26, .14, .4, .16)[s % 4]
                H(b0 + s * BEAT / 4, v, .3 if s % 2 else -.15)
        elif bn == 16:
            K(b0, .45)
            for e in range(0, 8, 2):
                H(b0 + e * BEAT / 2 + BEAT / 2, .14, .25)
        elif bn == 17:
            for e in range(0, 8, 2):
                H(b0 + e * BEAT / 2 + BEAT / 2, .12, .25)
        elif bn == 18:
            K(b0, .55); K(b0 + 2 * BEAT, .6)
            for s in range(16):
                H(b0 + s * BEAT / 4, .08 + .3 * s / 15, .3 if s % 2 else -.15)
            S(b0 + 3 * BEAT, .25); S(b0 + 3.5 * BEAT, .32)
    K(FINAL, 1.0, True)
    return k, hat, sn, kicks


def duck_env(kicks, depth, tau):
    g = np.ones(N)
    for t, v in kicks:
        i0 = int(t * SR)
        L = min(int(1.0 * SR), N - i0)
        tl = np.arange(L) / SR
        shape = np.minimum(tl / 0.006, 1) * np.exp(-tl / tau)
        g[i0:i0 + L] = np.minimum(g[i0:i0 + L], 1 - depth * min(v, 1) * shape)
    return g


# ----------------------------------------------------------------- sub
def build_sub():
    f = np.full(N, mtof(38))
    a = np.zeros(N)
    lvl = curve([(bar(3), .5), (bar(7), .7), (bar(9), .9), (bar(16), .9), (bar(16) + .8, .42),
                 (bar(18), .42), (FINAL, .65)], T)
    for t0, t1, name in PROG:
        if t0 < bar(3) - 1e-6:
            continue
        i0, i1 = int(t0 * SR), int(t1 * SR)
        f[i0:i1] = mtof(CH[name][1])
        a[i0:i1] = lvl[i0:i1]
    i0 = int(FINAL * SR)
    f[i0:] = mtof(38)
    tl = T[i0:] - FINAL
    a[i0:] = 1.0 * np.exp(-tl / 1.3)
    # glide 25 ms on note changes, smooth amplitude (fade in at bar 3, no steps)
    f = np.exp(smooth(smooth(np.log(f), 12), 12))
    i3 = int(bar(3) * SR)
    f[:i3] = mtof(35)
    a = smooth(smooth(a, 15), 15)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.tanh(1.6 * np.sin(ph)) / np.tanh(1.6) * a
    x = filt(x, "lowpass", 180)
    return np.stack([x, x])


# ----------------------------------------------------------------- fx
def riser(t0, t1, f0, f1, peak, curve_pow=2.2):
    """Decorrelated noise swept through a moving band-pass (STFT mask)."""
    L = int((t1 - t0) * SR)
    out = np.zeros((2, L))
    nfft, hop = 2048, 512
    for ch in range(2):
        n = RNG.standard_normal(L)
        fr, tt, Z = signal.stft(n, SR, nperseg=nfft, noverlap=nfft - hop)
        p = np.clip(tt / (t1 - t0), 0, 1)
        fc = f0 * (f1 / f0) ** p
        mask = np.exp(-0.5 * (np.log2((fr[:, None] + 1) / fc[None, :]) / 0.55) ** 2)
        _, y = signal.istft(Z * mask, SR, nperseg=nfft, noverlap=nfft - hop)
        out[ch] = y[:L]
    p = np.arange(L) / L
    env = p ** curve_pow
    out *= env / (np.abs(out).max() + 1e-9) * peak
    return fade_edges(out, 5, 25)


def air_impact(vel, tau=1.0, L_s=4.0):
    L = int(L_s * SR)
    t = np.arange(L) / SR
    out = np.zeros((2, L))
    for ch in range(2):
        n = filt(filt(RNG.standard_normal(L), "highpass", 2500), "lowpass", 8000)
        out[ch] = n * np.exp(-t / tau) * np.minimum(t / 0.004, 1)
    return fade_edges(vel * out / 4.0, 0, 50)


def reverb_ir(rt60=2.7, length=3.6, predelay=0.022):
    L = int(length * SR)
    t = np.arange(L) / SR
    ir = np.zeros((2, L + int(predelay * SR)))
    for ch in range(2):
        n = RNG.standard_normal(L)
        bright = filt(n, "lowpass", 8000)
        dark = filt(n, "lowpass", 1800)
        w = 1 - np.exp(-t / 0.6)
        x = ((1 - w) * bright + w * dark) * np.exp(-t * 6.91 / rt60)
        x *= np.minimum(t / 0.012, 1)
        ir[ch, int(predelay * SR):] = x
    return ir / np.sqrt((ir ** 2).sum(axis=1, keepdims=True))


def convolve_reverb(send):
    ir = reverb_ir()
    send = filt(send, "highpass", 220)
    wet = np.stack([signal.fftconvolve(send[c], ir[c])[:N] for c in range(2)])
    return wet


def glue(x, thr_db=-20.0, ratio=2.0, att=0.02, rel=0.25):
    """RMS bus compressor (stereo-linked), gain computed at 1 kHz control rate."""
    m = 0.5 * (x[0] ** 2 + x[1] ** 2)
    rms = np.sqrt(smooth(m, 30) + 1e-12)
    blk = 48
    lv = 20 * np.log10(rms[::blk] + 1e-9)
    over = np.maximum(lv - thr_db, 0)
    target = -over * (1 - 1 / ratio)
    g = np.zeros_like(target)
    aa, ar = np.exp(-1 / (att * 1000)), np.exp(-1 / (rel * 1000))
    cur = 0.0
    for i, v in enumerate(target):
        c = aa if v < cur else ar
        cur = c * cur + (1 - c) * v
        g[i] = cur
    gl = np.interp(np.arange(N), np.arange(len(g)) * blk, g)
    return x * 10 ** (gl / 20), gl


# ----------------------------------------------------------------- mix
def render_stems():
    events = []
    pad = build_pad()
    arp = build_arp(events)
    bells = build_bells(events)
    k, hat, sn, kicks = build_drums(events)
    sub = build_sub()

    # sidechain-ish pumping under the kick
    pad *= duck_env(kicks, 0.28, 0.24)
    arp *= duck_env(kicks, 0.15, 0.15)
    sub *= duck_env(kicks, 0.85, 0.16)

    arp_d = tempo_delay(arp)

    # riser into bar 19, small swell into bar 9, air on the big downbeats
    fx = stereo()
    place(fx, riser(bar(18), FINAL, 350, 6000, 0.32), bar(18))
    place(fx, riser(bar(8) + 2 * BEAT, bar(9), 600, 4000, 0.12, 2.0), bar(8) + 2 * BEAT)
    place(fx, air_impact(0.20, 0.9), bar(9))
    place(fx, air_impact(0.35, 1.1, 7.0), FINAL)
    for t in (bar(7), bar(7) + 2 * BEAT, bar(8)):
        place(fx, air_impact(0.13, 0.5, 2.0), t)
    return dict(pad=pad, arp=arp, arp_d=arp_d, bells=bells, kick=k, hat=hat, sn=sn, sub=sub, fx=fx), events


def main(out_path, cache=None):
    import os
    if cache and os.path.exists(cache):
        z = np.load(cache, allow_pickle=True)
        st = {k: z[k] for k in z.files if k != "events"}
        events = list(z["events"])
    else:
        st, events = render_stems()
        if cache:
            np.savez(cache, events=np.array(events, dtype=object), **st)
    pad, arp, arp_d, bells, k, hat, sn, sub, fx = (st[n] for n in
        ("pad", "arp", "arp_d", "bells", "kick", "hat", "sn", "sub", "fx"))
    if os.environ.get("STEM_REPORT"):
        secs = [("intro", 0, 4.8), ("build", 4.8, 14.4), ("lift", 14.4, 19.2), ("main", 19.2, 36),
                ("soft", 36.8, 40.8), ("rebuild", 40.8, 43.2), ("tail", 43.2, 48)]
        for n, x in st.items():
            row = " ".join(f"{a}:{20*np.log10(np.sqrt((x[:, int(t0*SR):int(t1*SR)]**2).mean())+1e-9):6.1f}"
                           for a, t0, t1 in secs)
            print(f"{n:6s} {row}")

    # section balance (mix automation, on top of the in-synth envelopes)
    sec_pad = curve([(0, .40), (4.7, .42), (4.8, .58), (14.3, .74), (14.4, .82), (19.2, 1.0), (36.0, 1.0), (36.8, .62),
                     (40.8, .62), (43.1, .82), (43.2, 1.0), (51, 1.0)], T)
    sec_sub = curve([(0, .6), (14.3, .75), (14.4, .8), (19.2, 1.0), (51, 1.0)], T)
    hat = filt(hat, "lowpass", 9000, 4)
    sn = filt(sn, "lowpass", 7000, 4)
    sec_drm = curve([(0, .75), (14.3, .9), (14.4, 1.0), (51, 1.0)], T)
    hat = hat * sec_drm
    sn = sn * sec_drm
    k = k * curve([(0, .85), (14.3, .9), (14.4, 1.0), (51, 1.0)], T)
    G = dict(pad=0.25, arp=0.36, arp_d=0.75, bells=0.42, kick=0.55, hat=2.0, sn=1.3, sub=0.17, fx=2.0)
    pad = pad * sec_pad
    fx = fx * curve([(0, 1.0), (40.8, 1.0), (40.81, .8), (43.2, .8), (43.21, 1.0), (51, 1.0)], T)
    bells = bells * curve([(0, .62), (4.8, .62), (4.81, 1.0), (51, 1.0)], T)
    sub = sub * sec_sub
    dry = (G["pad"] * pad + G["arp"] * arp + G["arp_d"] * arp_d + G["bells"] * bells
           + G["kick"] * k + G["hat"] * hat + G["sn"] * sn + G["sub"] * sub + G["fx"] * fx)
    send = (0.35 * G["pad"] * pad + 0.45 * G["arp"] * arp + 0.4 * G["arp_d"] * arp_d
            + 0.6 * G["bells"] * bells + 0.25 * G["sn"] * sn + 0.12 * G["hat"] * hat
            + 0.4 * G["fx"] * fx + 0.05 * G["kick"] * k)
    wet = convolve_reverb(send)
    mix = dry + 0.55 * wet
    mix = filt(mix, "highpass", 24)
    ref = np.sqrt(np.percentile(smooth(0.5 * (mix[0]**2 + mix[1]**2), 30), 97))
    mix, gr = glue(mix, thr_db=20 * np.log10(ref) - 4.0)

    # tail: guarantee silence at the very end (natural decay does the rest)
    tail0 = int(49.2 * SR)
    mix[:, tail0:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, N - tail0)))
    mix[:, :int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))

    peak = np.abs(mix).max()
    mix *= 10 ** (-3.0 / 20) / peak
    sf.write(out_path, mix.T, SR, subtype="PCM_24")
    print(f"wrote {out_path}  len={N / SR:.3f}s  max GR={gr.min():.1f} dB")
    with open(out_path.rsplit(".", 1)[0] + ".events.txt", "w") as fh:
        for kind, t in sorted(events, key=lambda e: e[1]):
            fh.write(f"{t:.4f} {kind}\n")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "reels-flow-score.wav",
         sys.argv[2] if len(sys.argv) > 2 else None)
