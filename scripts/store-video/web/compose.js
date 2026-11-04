// The store video's whole timeline. `render(t)` draws the frame at `t` seconds, with nothing left to
// chance: no CSS animations run here, and render.ts seeks the feed's and the Popup's own animations to
// the same clock. Music is 100 BPM: one beat is 0.6 s, one bar 2.4 s, and the cuts land on them.
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
const E = {
  lin: (x) => x,
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  outCubic: (x) => 1 - Math.pow(1 - x, 3),
  outQuint: (x) => 1 - Math.pow(1 - x, 5),
  inCubic: (x) => x * x * x,
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  inOutQuint: (x) => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2),
  smooth: (x) => x * x * (3 - 2 * x),
};
const ramp = (t, a, b, e = E.outExpo) => e(clamp((t - a) / (b - a)));
/** 0 before `a`, 1 between `b` and `c`, back to 0 at `d`. */
const env = (t, a, b, c, d, ei = E.outCubic, eo = E.inCubic) => Math.min(ramp(t, a, b, ei), 1 - ramp(t, c, d, eo));

// ——— Shared timing (render.ts reads these) ————————————————————————————————————————————
const OPEN_POPUP = 20.25;
const EVENTS = [
  { t: 18.0, name: 'autoOff' },     // hidden: the Popup will open with Auto-Scroll off
  { t: 21.0, name: 'autoOn' },      // the cursor flips it on
  { t: 23.6, name: 'count' },       // Reels watched 26 → 27
  { t: 27.3, name: 'speedOn' },     // the cursor switches Speed on
  { t: 29.4, name: 'speedCommit' }, // the slider is let go at 2×
  { t: 32.9, name: 'nudgeArm' },    // hidden: Session Limit of 30, at 29
  { t: 33.0, name: 'nudgePlay' },   // hidden: the canoe Reel plays and counts
  { t: 34.0, name: 'nudgeWait' },   // hidden: wait for the Break Nudge
];
const SLIDE = { a: 28.1, b: 29.3, from: 1.5, to: 2 };
const sliderAt = (t) => lerp(SLIDE.from, SLIDE.to, ramp(t, SLIDE.a, SLIDE.b, E.inOut));
const quant = (v) => Math.round(v / 0.25) * 0.25;
/** What the Reels Feed shows at `t`: scroll position in Reels, each Reel's slow push, the Break Nudge. */
function feedAt(t) {
  let pos = 0;
  if (t < 32.95) pos = ramp(t, 7.2, 7.95, E.inOut) + ramp(t, 12.0, 12.75, E.inOut);
  else pos = 3;
  const kb = [
    1 + 0.07 * ramp(t, 3.8, 8.4, E.lin),
    1 + 0.07 * ramp(t, 6.8, 13.2, E.lin),
    1 + 0.05 * ramp(t, 11.6, 31.0, E.lin),
    1 + 0.06 * ramp(t, 35.6, 41.0, E.lin),
  ];
  return { pos, kb, nudge: ramp(t, 37.1, 37.75, E.outCubic), speed: quant(sliderAt(t)) };
}
window.TIMELINE = { EVENTS, OPEN_POPUP, SLIDE, duration: 51 };
window.feedAt = feedAt;

// ——— Captions ———————————————————————————————————————————————————————————————————————
function cap(el, t, tin, tout) {
  const base = el.classList.contains('left') || el.classList.contains('right') ? 'translateY(-50%) ' : '';
  if (t < tin - 0.05 || t > tout + 0.6) { el.style.opacity = 0; return; }
  const out = ramp(t, tout, tout + 0.5, E.inCubic);
  el.style.opacity = 1 - out;
  el.style.transform = `${base}translateY(${-out * 26}px)`;
  el.style.filter = out > 0.001 ? `blur(${out * 10}px)` : '';
  const k = $('.kicker', el);
  if (k) fadeUp(k, ramp(t, tin, tin + 0.8, E.outCubic), 14);
  $$('.ln > span', el).forEach((s, i) => {
    const p = ramp(t, tin + 0.1 + i * 0.09, tin + 1.15 + i * 0.09, E.outExpo);
    s.style.transform = `translateY(${(1 - p) * 108}%)`;
  });
  $$('[data-lede]', el).forEach((s, j) => fadeUp(s, ramp(t, tin + 0.5 + j * 0.16, tin + 1.4 + j * 0.16, E.outCubic), 18));
}
function fadeUp(el, p, dy = 16, blur = 8) {
  el.style.opacity = p;
  el.style.transform = `translateY(${(1 - p) * dy}px)`;
  el.style.filter = p < 0.999 ? `blur(${(1 - p) * blur}px)` : '';
}
const show = (el, o) => { el.style.opacity = o; el.style.visibility = o <= 0.001 ? 'hidden' : 'visible'; };
// The window holds live iframes: Chrome stops painting hidden ones, so it only ever fades.
const fade = (el, o) => { el.style.opacity = o; };

// ——— Atmosphere: auras that drift and re-colour per scene —————————————————————————————————
const AURA_KEYS = [
  // t, [x, y, opacity] for coral, amber, violet
  [0, [960, 640, 0.0], [1300, 900, 0.0], [600, 300, 0.0]],
  [1.6, [960, 560, 0.34], [1400, 880, 0.18], [520, 260, 0.1]],
  [5.0, [1380, 300, 0.32], [1700, 900, 0.2], [180, 860, 0.1]],
  [14.4, [960, 220, 0.26], [1600, 1000, 0.2], [300, 980, 0.12]],
  [19.4, [560, 320, 0.3], [1500, 820, 0.18], [200, 900, 0.1]],
  [31.2, [960, 380, 0.3], [1400, 980, 0.18], [500, 980, 0.12]],
  [36.2, [1380, 320, 0.22], [1700, 900, 0.14], [200, 860, 0.14]],
  [40.8, [960, 420, 0.28], [1500, 900, 0.18], [420, 920, 0.12]],
  [43.2, [960, 300, 0.38], [1350, 760, 0.22], [560, 820, 0.12]],
  [51, [960, 320, 0.3], [1350, 760, 0.18], [560, 820, 0.1]],
];
function auras(t) {
  let i = 0;
  while (i < AURA_KEYS.length - 2 && t >= AURA_KEYS[i + 1][0]) i++;
  const [ta, ...A] = AURA_KEYS[i], [tb, ...B] = AURA_KEYS[i + 1];
  const p = E.inOut(clamp((t - ta) / Math.min(tb - ta, 1.8)));
  ['#a1', '#a2', '#a3'].forEach((id, k) => {
    const el = $(id), w = el.offsetWidth;
    const x = lerp(A[k][0], B[k][0], p) + 40 * Math.sin(t * 0.23 + k * 2.1);
    const y = lerp(A[k][1], B[k][1], p) + 30 * Math.cos(t * 0.19 + k * 1.3);
    el.style.transform = `translate(${x - w / 2}px, ${y - w / 2}px)`;
    el.style.opacity = lerp(A[k][2], B[k][2], p);
  });
  $('#grid').style.transform = `translate(${(t * 6) % 80}px, ${(t * 3) % 80}px)`;
  $('#grid').style.opacity = 0.55 * ramp(t, 0.2, 2.0, E.outCubic);
}

// ——— Camera on the browser window —————————————————————————————————————————————————————
// A shot is a point of the window (nx, ny, in its own 1440 × 1046 px) held at a point of the screen (sx, sy)
// at scale k. Moving between shots eases every term, so zooms glide instead of swinging.
let popupH = 520;
const popupRect = (sel) => {
  const doc = $('#popup').contentDocument; const el = doc && $(sel, doc);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: 1050 + r.left, y: 78 + r.top, w: r.width, h: r.height, cx: 1050 + r.left + r.width / 2, cy: 78 + r.top + r.height / 2 };
};
function shots() {
  const speed = popupRect('.rf-speed') ?? { cx: 1220, cy: 300 };
  const WIDE = { nx: 720, ny: 523, sx: 1261, sy: 540, k: 0.78 };
  return {
    feedIn: { ...WIDE, sy: 760, k: 0.72 },
    feed: WIDE,
    feedEnd: { ...WIDE, k: 0.8 },
    feedOut: { ...WIDE, k: 0.84, sx: 1200 },
    popIn: { nx: 720, ny: 523, sx: 680, sy: 640, k: 0.8 },
    pop: { nx: 720, ny: 523, sx: 680, sy: 540, k: 0.82 },
    popZoom: { nx: 1220, ny: 78 + popupH / 2, sx: 700, sy: 540, k: 1.72 },
    speed: { nx: speed.cx, ny: speed.cy, sx: 720, sy: 560, k: 2.3 },
    speedOut: { nx: speed.cx, ny: speed.cy, sx: 720, sy: 560, k: 2.5 },
    nudgeIn: { ...WIDE, k: 0.74 },
    nudge: { ...WIDE, k: 0.785 },
    nudgeEnd: { ...WIDE, k: 0.82 },
  };
}
const mix = (a, b, p) => Object.fromEntries(Object.keys(a).map((k) => [k, lerp(a[k], b[k], p)]));
function camera(t) {
  const S = shots();
  // [shot, opacity, tilt, blur]
  let cam, op = 1, tilt = 0, blur = 0;
  if (t < 4.0 || (t >= 14.6 && t < 19.0) || (t >= 31.3 && t < 35.8) || t >= 40.9) { fade($('#world'), 0); return; }
  if (t < 14.6) {
    const pin = ramp(t, 4.1, 5.5, E.outExpo);
    cam = mix(S.feedIn, S.feed, pin);
    cam = mix(cam, S.feedEnd, ramp(t, 5.5, 13.9, E.lin));
    const pout = ramp(t, 13.9, 14.5, E.inCubic);
    cam = mix(cam, S.feedOut, pout);
    op = ramp(t, 4.1, 4.9, E.outCubic) * (1 - pout); tilt = (1 - pin) * 18; blur = pout * 14 + (1 - ramp(t, 4.1, 4.8, E.outCubic)) * 8;
  } else if (t < 31.3) {
    const pin = ramp(t, 19.0, 20.1, E.outExpo);
    cam = mix(S.popIn, S.pop, pin);
    cam = mix(cam, S.popZoom, ramp(t, 22.0, 23.3, E.inOutQuint));
    cam = mix(cam, S.speed, ramp(t, 26.2, 27.3, E.inOutQuint));
    const pout = ramp(t, 30.7, 31.25, E.inCubic);
    cam = mix(cam, S.speedOut, pout);
    op = ramp(t, 19.0, 19.7, E.outCubic) * (1 - pout); tilt = (1 - pin) * 10; blur = pout * 14 + (1 - ramp(t, 19.0, 19.6, E.outCubic)) * 8;
  } else {
    const pin = ramp(t, 35.85, 37.0, E.outExpo);
    cam = mix(S.nudgeIn, S.nudge, pin);
    cam = mix(cam, S.nudgeEnd, ramp(t, 37.0, 40.4, E.lin));
    const pout = ramp(t, 40.35, 40.85, E.inCubic);
    op = ramp(t, 35.85, 36.5, E.outCubic) * (1 - pout); blur = pout * 12 + (1 - ramp(t, 35.85, 36.4, E.outCubic)) * 8;
  }
  const x0 = cam.sx - cam.nx * cam.k, y0 = cam.sy - cam.ny * cam.k;
  const w = $('#world');
  fade(w, op);
  w.style.filter = blur > 0.05 ? `blur(${blur}px)` : '';
  $('#win').style.transform = `translate(${x0}px, ${y0}px) scale(${cam.k})`;
  w.style.transform = tilt > 0.01 ? `perspective(2200px) rotateX(${tilt}deg)` : '';
  w.style.transformOrigin = '50% 100%';

  // The Popup, opening from its toolbar button like Chrome's.
  const po = t >= OPEN_POPUP && t < 31.3 ? ramp(t, OPEN_POPUP, OPEN_POPUP + 0.32, E.outCubic) : 0;
  const pop = $('#pop');
  fade(pop, po);
  pop.style.transform = `translateY(${(1 - po) * -8}px) scale(${0.97 + 0.03 * po})`;
  $('#ext').style.background = po > 0 || (t > 20.1 && t < 31.3) ? 'rgba(255,255,255,.14)' : '';
  // Everything but the Popup steps back while the camera is on it.
  $('#dim').style.opacity = t < 31.3 && t > 19 ? 0.62 * ramp(t, 22.0, 23.3, E.inOut) : 0;
}

// ——— The Auto button's ring on the Reel ———————————————————————————————————————————————————
function ring(t, auto) {
  const el = $('#ring');
  const p = Math.max(env(t, 6.5, 6.9, 7.25, 7.7), env(t, 11.3, 11.7, 12.05, 12.5));
  if (!auto || p <= 0.001 || t > 14) { show(el, 0); return; }
  show(el, p);
  const w = Math.max(auto.w, auto.h * 0.9) + 14, h = auto.h + 14;
  el.style.width = `${w}px`; el.style.height = `${h}px`; el.style.borderRadius = `${Math.min(w, h) * 0.3}px`;
  el.style.left = `${auto.x + auto.w / 2 - w / 2}px`;
  el.style.top = `${82 + auto.y + auto.h / 2 - h / 2}px`;
  el.style.transform = `scale(${0.9 + 0.1 * p})`;
}

// ——— Cursor ————————————————————————————————————————————————————————————————————————
function screenOf(sel) {
  const f = $('#popup'), doc = f.contentDocument, el = doc && $(sel, doc);
  if (!el) return null;
  const fr = f.getBoundingClientRect(), s = fr.width / 340, r = el.getBoundingClientRect();
  return { x: fr.left + (r.left + r.width / 2) * s, y: fr.top + (r.top + r.height / 2) * s, r, s, fr };
}
function thumbX(v) {
  const sl = screenOf('.rf-slider');
  if (!sl) return 0;
  const R = 10, share = (v - 0.5) / 2.5;
  return sl.fr.left + (sl.r.left + R + share * (sl.r.width - 2 * R)) * sl.s;
}
function cursor(t) {
  const c = $('#cursor');
  let x, y, o = 0, press = 0;
  const ext = $('#ext').getBoundingClientRect();
  const extP = { x: ext.left + ext.width / 2 + 2, y: ext.top + ext.height / 2 + 2 };
  if (t >= 19.4 && t < 21.9) {
    const auto = screenOf('.rf-hero input') ?? extP;
    const start = { x: 1010, y: 820 };
    const a = ramp(t, 19.4, 20.1, E.inOut), b = ramp(t, 20.45, 20.95, E.inOut);
    x = lerp(lerp(start.x, extP.x, a), auto.x + 6, b); y = lerp(lerp(start.y, extP.y, a), auto.y + 4, b);
    o = env(t, 19.4, 19.7, 21.45, 21.85);
    x += ramp(t, 21.4, 21.85, E.inCubic) * 40; y += ramp(t, 21.4, 21.85, E.inCubic) * 30;
    press = Math.max(env(t, 20.12, 20.17, 20.25, 20.35, E.lin, E.lin), env(t, 20.97, 21.02, 21.1, 21.2, E.lin, E.lin));
  } else if (t >= 26.9 && t < 30.3) {
    const sw = screenOf('.rf-speed input[type=checkbox]') ?? { x: 900, y: 500 };
    const sl = screenOf('.rf-slider') ?? { y: 600 };
    const start = { x: 980, y: 860 };
    const a = ramp(t, 26.9, 27.28, E.inOut), b = ramp(t, 27.5, 28.0, E.inOut), d = ramp(t, SLIDE.a, SLIDE.b, E.inOut);
    const tx = lerp(thumbX(SLIDE.from), thumbX(SLIDE.to), d);
    x = lerp(lerp(start.x, sw.x + 4, a), tx + 4, b); y = lerp(lerp(start.y, sw.y + 4, a), sl.y + 6, b);
    o = env(t, 26.9, 27.1, 29.8, 30.2);
    x += ramp(t, 29.7, 30.2, E.inCubic) * 40; y += ramp(t, 29.7, 30.2, E.inCubic) * 30;
    press = Math.max(env(t, 27.27, 27.32, 27.4, 27.5, E.lin, E.lin), env(t, 28.0, 28.06, 29.35, 29.45, E.lin, E.lin));
  }
  if (!o) { show(c, 0); return; }
  show(c, o);
  c.style.transform = `translate(${x - 6}px, ${y - 4}px) scale(${1 - 0.16 * press})`;
}

// ——— Scenes ————————————————————————————————————————————————————————————————————————
function intro(t) {
  const s = $('#s1');
  if (t > 4.6) { show(s, 0); return; }
  show(s, 1);
  const out = ramp(t, 3.7, 4.25, E.inCubic);
  const icon = $('#s1-icon'), glow = $('#s1-glow');
  const pin = ramp(t, 0.15, 1.15, E.outExpo);
  const up = ramp(t, 0.75, 1.75, E.inOutQuint);
  const y = lerp(480, 238, up) - out * 30;
  icon.style.opacity = pin * (1 - out);
  icon.style.top = `${y}px`;
  icon.style.transform = `scale(${0.82 + 0.18 * pin})`;
  icon.style.filter = `drop-shadow(0 18px 40px rgba(255,70,70,.45))` + (pin < 0.999 ? ` blur(${(1 - pin) * 14}px)` : '');
  glow.style.opacity = 0.9 * ramp(t, 0.1, 1.2, E.outCubic) * (1 - out) * (1 - 0.35 * up);
  glow.style.top = `${y + 60 - 320}px`;
  const text = $('#s1-text');
  text.style.opacity = 1 - out;
  text.style.transform = `translateY(${-out * 30}px)`;
  text.style.filter = out > 0.001 ? `blur(${out * 10}px)` : '';
  $$('.ln > span', text).forEach((sp, i) => {
    const p = ramp(t, 1.0 + i * 0.16, 2.1 + i * 0.16, E.outExpo);
    sp.style.transform = `translateY(${(1 - p) * 108}%)`;
  });
  fadeUp($('[data-lede]', text), ramp(t, 1.9, 2.8, E.outCubic), 18);
}

function counter(t) {
  const step = ramp(t, 7.6, 8.1, E.outExpo) + ramp(t, 12.4, 12.9, E.outExpo);
  $('#roll').style.transform = `translateY(${-34 * step}px)`;
}

function handsBusy(t) {
  const s = $('#s3');
  if (t < 14.3 || t > 19.4) { show(s, 0); return; }
  const out = ramp(t, 18.85, 19.3, E.inCubic);
  show(s, 1 - out);
  s.style.filter = out > 0.001 ? `blur(${out * 12}px)` : '';
  s.style.transform = `scale(${1 - 0.03 * out})`;
  $$('.reel-card', s).forEach((card, i) => {
    const a = 14.4 + i * 1.2;
    const p = ramp(t, a, a + 0.9, E.outExpo);
    card.style.opacity = ramp(t, a, a + 0.35, E.outCubic);
    card.style.transform = `translateY(${(1 - p) * 70}px) scale(${0.94 + 0.06 * p})`;
    card.style.filter = p < 0.999 ? `blur(${(1 - p) * 10}px)` : '';
    $('.ph', card).style.backgroundSize = `auto ${(1.12 - 0.1 * ramp(t, a, a + 5.2, E.outCubic)) * 100}%`;
    fadeUp($('figcaption', card), ramp(t, a + 0.15, a + 0.9, E.outCubic), 20);
  });
  fadeUp($('#s3-line'), ramp(t, 17.4, 18.2, E.outCubic), 16);
}

function shortcuts(t) {
  const s = $('#s6');
  if (t < 31.1 || t > 36.1) { show(s, 0); return; }
  const out = ramp(t, 35.5, 36.0, E.inCubic);
  show(s, 1 - out);
  s.style.filter = out > 0.001 ? `blur(${out * 10}px)` : '';
  cap($('#cap6'), t, 31.25, 99);
  [['#kA', 31.5, 32.4], ['#kS', 31.65, 33.6]].forEach(([id, a, hit]) => {
    const w = $(id), p = ramp(t, a, a + 1.0, E.outExpo);
    w.style.opacity = ramp(t, a, a + 0.4, E.outCubic);
    w.style.transform = `translateY(${(1 - p) * 60}px)`;
    w.style.filter = p < 0.999 ? `blur(${(1 - p) * 10}px)` : '';
    const down = env(t, hit - 0.06, hit, hit + 0.08, hit + 0.3, E.outCubic, E.outCubic);
    const key = $('.key', w);
    key.style.transform = `translateY(${down * 10}px)`;
    key.style.boxShadow = `0 ${14 - down * 10}px 0 #0f0d13, 0 ${16 - down * 10}px 0 rgba(255,255,255,.04), 0 40px 70px -10px rgba(0,0,0,.8), inset 0 2px 0 rgba(255,255,255,.1)`;
    key.style.setProperty('--lit', String(ramp(t, hit, hit + 0.35, E.outCubic)));
    const on = ramp(t, hit + 0.05, hit + 0.5, E.outCubic);
    $('.k0', w).style.opacity = 1 - on;
    $('.k0', w).style.transform = `translateY(${-on * 12}px)`;
    $('.k1', w).style.opacity = on;
    $('.k1', w).style.transform = `translateY(${(1 - on) * 12}px)`;
  });
  fadeUp($('#s6-lede'), ramp(t, 32.0, 32.9, E.outCubic), 16);
}

function privacy(t) {
  const s = $('#s8');
  if (t < 40.7 || t > 43.3) { show(s, 0); return; }
  const out = ramp(t, 42.8, 43.18, E.inCubic);
  show(s, 1 - out);
  s.style.filter = out > 0.001 ? `blur(${out * 10}px)` : '';
  s.style.transform = `scale(${1 + 0.02 * out})`;
  cap($('#cap8'), t, 40.8, 99);
  $$('.chips.big .chip', s).forEach((c, i) => {
    const a = 41.2 + i * 0.3, p = ramp(t, a, a + 0.8, E.outExpo);
    c.style.opacity = ramp(t, a, a + 0.3, E.outCubic);
    c.style.transform = `translateY(${(1 - p) * 40}px) scale(${0.92 + 0.08 * p})`;
    c.style.filter = p < 0.999 ? `blur(${(1 - p) * 8}px)` : '';
  });
  fadeUp($('#s8-lede'), ramp(t, 41.9, 42.6, E.outCubic), 14);
}

function endCard(t) {
  const s = $('#s9');
  if (t < 43.15) { show(s, 0); return; }
  show(s, 1);
  const p = ramp(t, 43.2, 44.3, E.outExpo);
  const icon = $('#s9-icon');
  icon.style.opacity = ramp(t, 43.2, 43.55, E.outCubic);
  icon.style.transform = `scale(${0.8 + 0.2 * p + 0.015 * ramp(t, 44.3, 51, E.lin)})`;
  icon.style.filter = `drop-shadow(0 22px 50px rgba(255,70,70,.5))` + (p < 0.999 ? ` blur(${(1 - p) * 14}px)` : '');
  const g = $('#s9-glow');
  g.style.opacity = 0.95 * ramp(t, 43.2, 43.7, E.outCubic) - 0.35 * ramp(t, 43.7, 45.5, E.inOut);
  g.style.transform = `scale(${0.85 + 0.25 * p})`;
  fadeUp($('#s9-name'), ramp(t, 43.45, 44.4, E.outExpo), 30, 12);
  fadeUp($('#s9-tag'), ramp(t, 43.8, 44.7, E.outCubic), 20);
  $$('#s9-pills .chip').forEach((c, i) => fadeUp(c, ramp(t, 44.4 + i * 0.12, 45.1 + i * 0.12, E.outCubic), 16));
  fadeUp($('#s9-url'), ramp(t, 44.9, 45.6, E.outCubic), 14);
  fadeUp($('#s9-legal'), ramp(t, 45.4, 46.2, E.outCubic), 8, 4);
  // A last, slow breath on everything.
  s.style.transform = `scale(${1 + 0.012 * ramp(t, 44.0, 51, E.lin)})`;
}

/** Draws the frame at `t`. `auto` is the Auto button's box in the feed (render.ts measures it there). */
window.render = function render(t, auto) {
  // Focus inside the feed (the Break Nudge's dialog) can scroll the page around it; pin it back.
  for (const el of [document.documentElement, document.body, $('#stage'), $('#world'), $('#win'), $('.viewport')]) { el.scrollTop = 0; el.scrollLeft = 0; }
  auras(t);
  intro(t);
  camera(t);
  ring(t, auto);
  counter(t);
  cap($('#cap2'), t, 5.0, 13.75);
  handsBusy(t);
  cap($('#cap4'), t, 19.9, 25.9);
  cap($('#cap5'), t, 26.5, 30.55);
  shortcuts(t);
  cap($('#cap7'), t, 36.45, 40.3);
  privacy(t);
  endCard(t);
  cursor(t);
};

window.sizePopup = function sizePopup() {
  const doc = $('#popup').contentDocument;
  const el = doc && $('.rf-popup', doc);
  if (!el) return 0;
  popupH = Math.ceil(Math.max(...[...doc.body.children].map((c) => c.getBoundingClientRect().bottom)) + 4);
  $('#popup').style.height = `${popupH}px`;
  return popupH;
};
