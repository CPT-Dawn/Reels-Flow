// Design kit: shared tokens, browser frames and helpers for every store image.
export const RAW = '.raw/';
export const css = String.raw;

export const BASE_CSS = css`
@font-face { font-family: Manrope; src: url(assets/manrope-latin.woff2) format('woff2'); font-weight: 200 800; }
:root {
  --ink: #0d0b11; --ink-2: #17141d; --line: rgba(255,255,255,.08);
  --text: #f6f3f8; --muted: #b3acbd; --dim: #8a8394;
  --coral: #ff3b6b; --orange: #ff6a3d; --amber: #ffb938;
  --glow: linear-gradient(135deg, #ff3b6b 0%, #ff6a3d 55%, #ffb938 100%);
}
* { box-sizing: border-box; margin: 0; }
html, body { width: var(--w); height: var(--h); overflow: hidden; }
body { background: var(--ink); color: var(--text); font-family: Manrope, Inter, sans-serif; -webkit-font-smoothing: antialiased; position: relative; }
.stage { position: absolute; inset: 0; overflow: hidden; }
/* Atmosphere: two soft auras in the icon's colours, a vignette, a whisper of grain. */
.aura { position: absolute; border-radius: 50%; filter: blur(var(--blur, 90px)); opacity: var(--o, .55); pointer-events: none; }
.grain { position: absolute; inset: 0; opacity: .07; mix-blend-mode: overlay; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
.vignette { position: absolute; inset: 0; background: radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,.55)); pointer-events: none; }
.grid { position: absolute; inset: 0; opacity: .5; pointer-events: none;
  background-image: linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px);
  background-size: 64px 64px; mask-image: radial-gradient(70% 70% at 30% 40%, #000 10%, transparent 70%); }

.eyebrow { display: inline-flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #ffb59a; }
.eyebrow img { width: 26px; height: 26px; }
.eyebrow .num { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; background: rgba(255,106,61,.14); border: 1px solid rgba(255,140,100,.35); color: #ffc7ad; font-size: 12px; letter-spacing: 0; }
h1 { font-size: var(--hs, 62px); line-height: 1.02; font-weight: 800; letter-spacing: -.04em; text-wrap: balance; }
h1 em { font-style: normal; background: var(--glow); -webkit-background-clip: text; background-clip: text; color: transparent; padding-right: .04em; }
.lede { font-size: 21px; line-height: 1.5; color: var(--muted); font-weight: 500; letter-spacing: -.005em; text-wrap: pretty; }
.lede b { color: var(--text); font-weight: 700; }
kbd { display: inline-grid; place-items: center; min-width: 1.6em; height: 1.6em; padding: 0 .4em; border-radius: 7px; font: 700 .82em Manrope; color: var(--text);
  background: linear-gradient(#2a2631, #1d1a23); border: 1px solid rgba(255,255,255,.14); box-shadow: 0 2px 0 rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.08); vertical-align: .08em; }
.chips { display: flex; flex-wrap: wrap; gap: 10px; }
.chip { display: inline-flex; align-items: center; gap: 7px; padding: 8px 12px 8px 11px; border-radius: 999px; font-size: 13.5px; font-weight: 600; color: #e9e4ee;
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); backdrop-filter: blur(8px); }
.chip svg { width: 16px; height: 16px; color: #ff9a6e; }

/* Browser windows */
.win { position: absolute; border-radius: 14px; overflow: hidden; background: #0c0c0e;
  box-shadow: 0 0 0 1px rgba(255,255,255,.09), 0 40px 90px -20px rgba(0,0,0,.85), 0 18px 40px -18px rgba(255,70,70,.25); }
.win .shot { position: absolute; left: 0; right: 0; bottom: 0; background-repeat: no-repeat; }
.tabs { height: 38px; display: flex; align-items: flex-end; padding: 0 12px; gap: 8px; }
.dots { display: flex; gap: 8px; align-self: center; margin-right: 10px; }
.dots i { width: 12px; height: 12px; border-radius: 50%; background: #ff5f57; } .dots i:nth-child(2){background:#febc2e} .dots i:nth-child(3){background:#28c840}
.tab { height: 30px; width: 220px; border-radius: 10px 10px 0 0; display: flex; align-items: center; gap: 9px; padding: 0 12px; font: 500 12.5px Inter, sans-serif; }
.tab .fav { width: 15px; height: 15px; border-radius: 50%; border: 1.6px solid #9aa0a6; position: relative; } .tab .fav::after { content: ''; position: absolute; inset: 1px 4px; border: 1.4px solid #9aa0a6; border-radius: 50%; }
.tab .x { margin-left: auto; opacity: .6; font-size: 13px; }
.bar { height: 44px; display: flex; align-items: center; gap: 12px; padding: 0 12px; }
.navi { display: flex; gap: 14px; opacity: .75; }
.navi svg { width: 17px; height: 17px; }
.url { flex: 1; height: 32px; border-radius: 16px; display: flex; align-items: center; gap: 10px; padding: 0 14px; font: 400 13.5px Inter, sans-serif; }
.url .host { color: #e8eaed; } .url .path { color: #9aa0a6; }
.url svg { width: 14px; height: 14px; opacity: .8; }
.tools { display: flex; align-items: center; gap: 12px; }
.tools .ext { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; }
.tools .ext.on { background: rgba(255,255,255,.12); }
.tools .ext img { width: 18px; height: 18px; }
.tools svg { width: 17px; height: 17px; opacity: .8; }
.tools .me { width: 22px; height: 22px; border-radius: 50%; background: url(photos/64-sq.jpg) center/cover; }
/* Chrome, dark */
.chrome .tabs { background: #1f1f23; } .chrome .tab { background: #35363a; color: #e8eaed; }
.chrome .bar { background: #35363a; color: #e8eaed; } .chrome .url { background: #202124; }
/* Firefox, dark */
.firefox .tabs { background: #1c1b22; } .firefox .tab { background: #42414d; color: #fbfbfe; border-radius: 6px; height: 30px; margin-bottom: 4px; }
.firefox .bar { background: #2b2a33; color: #fbfbfe; } .firefox .url { background: #1c1b22; border-radius: 6px; }

.popup { position: absolute; border-radius: 14px; overflow: hidden; background: #131117;
  box-shadow: 0 0 0 1px rgba(255,255,255,.1), 0 30px 70px -10px rgba(0,0,0,.8), 0 10px 24px -8px rgba(0,0,0,.6); }
.popup img, .card img { display: block; width: 100%; }
.card { position: absolute; border-radius: 22px; overflow: hidden; background: #1d1b22;
  box-shadow: 0 0 0 1px rgba(255,255,255,.1), 0 30px 70px -14px rgba(0,0,0,.85); }
`;

const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  fwd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
  reload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 10V8a6 6 0 0 1 12 0v2"/><rect x="4" y="10" width="16" height="11" rx="2.5"/></svg>',
  puzzle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M10 3.5a2 2 0 0 1 4 0V5h4v4h-1.5a2 2 0 0 0 0 4H18v6h-6v-1.5a2 2 0 0 0-4 0V19H4v-6h1.5a2 2 0 0 0 0-4H4V5h6Z"/></svg>',
  burger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>',
};
export const SVG = {
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6Z"/><path d="m9 12 2 2 4-4"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.2 6.3 6.3 2.2-6.3 2.2L12 19.5l-2.2-6.3L3.5 11l6.3-2.2Z"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 7-5 5 5 5M16 7l5 5-5 5"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="2.5" y="6" width="19" height="12" rx="3"/><path d="M6.5 10h1M10.5 10h1M14.5 10h1M7.5 14h9"/></svg>',
};

export type Frame = 'chrome' | 'firefox';
/** A browser window showing a feed capture. `crop` is in capture CSS px: [x, y] of the top-left shown. */
export function browser(o: { frame: Frame; x: number; y: number; w: number; h: number; shot: string; scale: number; crop: [number, number]; extOn?: boolean }) {
  const chromeH = 82;
  const tabTitle = o.frame === 'chrome' ? 'Reels • Instagram' : 'Reels • Instagram';
  return `<div class="win ${o.frame}" style="left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h}px">
    <div class="tabs">${o.frame === 'chrome' ? '<div class="dots"><i></i><i></i><i></i></div>' : '<div class="dots"><i></i><i></i><i></i></div>'}
      <div class="tab"><span class="fav"></span>${tabTitle}<span class="x">✕</span></div></div>
    <div class="bar"><div class="navi">${ICON.back}${ICON.fwd}${ICON.reload}</div>
      <div class="url">${ICON.lock}<span><span class="host">instagram.com</span><span class="path">/reels/</span></span></div>
      <div class="tools">${o.frame === 'chrome' ? ICON.puzzle : ''}<span class="ext ${o.extOn ? 'on' : ''}"><img src="../../public/icon/128.png"></span>${o.frame === 'firefox' ? ICON.puzzle : ''}<span class="me"></span>${o.frame === 'firefox' ? ICON.burger : ICON.menu}</div></div>
    <div class="shot" style="top:${chromeH}px;background-image:url(${RAW}${o.shot}.png);background-size:${1440 * o.scale}px ${964 * o.scale}px;background-position:${-o.crop[0] * o.scale}px ${-o.crop[1] * o.scale}px"></div>
  </div>`;
}

export function page(w: number, h: number, body: string, extraCss = '') {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}${extraCss}</style></head>
  <body style="--w:${w}px;--h:${h}px"><div class="stage">${body}</div></body></html>`;
}

export function atmosphere(a: { x: number; y: number; r: number; c: string; o?: number; blur?: number }[]) {
  return a.map((p) => `<div class="aura" style="left:${p.x - p.r}px;top:${p.y - p.r}px;width:${p.r * 2}px;height:${p.r * 2}px;background:${p.c};--o:${p.o ?? .5};--blur:${p.blur ?? 90}px"></div>`).join('');
}
export const FINISH = '<div class="vignette"></div><div class="grain"></div>';
