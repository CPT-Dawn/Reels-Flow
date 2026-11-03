import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { atmosphere, browser, FINISH, page, RAW, SVG, type Frame } from './kit';

const HERE = fileURLToPath(new URL('.', import.meta.url));
/** Store-ready images; the @2x masters stay in .raw/. */
const OUT = fileURLToPath(new URL('../../store assets/', import.meta.url));
const MASTERS = HERE + '.raw/masters/';
mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2);

const LOGO = `<img src="../../store assets/Icon.svg">`;
const SS = 'screenshot';

type Shot = { name: string; w: number; h: number; html: string };
const shots: Shot[] = [];

for (const frame of ['chrome', 'firefox'] as Frame[]) {
  const key = frame === 'chrome' ? '' : '';
  // 1 — The promise.
  shots.push({ name: `${frame}/${SS}-1`, w: 1280, h: 800, html: page(1280, 800, `
    ${atmosphere([{ x: 1010, y: 300, r: 380, c: '#ff3b6b', o: .38, blur: 120 }, { x: 1180, y: 720, r: 300, c: '#ffb938', o: .26, blur: 120 }, { x: 120, y: 820, r: 260, c: '#ff6a3d', o: .16, blur: 110 }])}
    <div class="grid"></div>
    <div style="position:absolute;left:80px;top:160px;width:372px;display:flex;flex-direction:column;gap:24px;--hs:58px">
      <span class="eyebrow">${LOGO} Reels Flow</span>
      <h1>Instagram Reels, <em>hands&#8209;free.</em></h1>
      <p class="lede">When a Reel ends, the next one starts on its own. Cook, stretch or sit back while the feed keeps flowing.</p>
      <div class="chips" style="margin-top:6px">
        <span class="chip">${SVG.shield} Collects no data</span><span class="chip">${SVG.spark} Free</span><span class="chip">${SVG.code} Open source</span>
      </div>
    </div>
    ${browser({ frame, x: 488, y: 70, w: 752, h: 700, shot: 'feed-auto-on', scale: 0.64, crop: [446, 0], extOn: true })}
    <div class="popup" style="left:${frame === 'chrome' ? 896 : 880}px;top:150px;width:318px"><img src="${RAW}popup-main.png"></div>
    ${FINISH}`) });
}


const TEXT = (top: number, eyebrow: string, h1: string, lede: string, extra = '', width = 400) => `
  <div style="position:absolute;left:80px;top:${top}px;width:${width}px;display:flex;flex-direction:column;gap:22px;--hs:56px">
    <span class="eyebrow">${eyebrow}</span><h1>${h1}</h1><p class="lede">${lede}</p>${extra}</div>`;
const NUM = (n: number, label: string) => `<span class="num">${n}</span> ${label}`;

for (const frame of ['chrome', 'firefox'] as Frame[]) {
  // 2 — The Auto button on the Reel.
  const lens = { x: 560, y: 40, w: 620, h: 720 };
  const zoom = 0.96; const cx = 470, cy: number = 150; // capture px at the lens' top-left
  const ax = (1024 - cx) * zoom, ay = (828 - cy) * zoom; // the Auto button, in lens px
  shots.push({ name: `${frame}/${SS}-2`, w: 1280, h: 800, html: page(1280, 800, `
    ${atmosphere([{ x: 980, y: 520, r: 360, c: '#ff3b6b', o: .32, blur: 120 }, { x: 1180, y: 160, r: 260, c: '#ffb938', o: .22, blur: 110 }])}
    <div class="grid"></div>
    ${TEXT(196, NUM(1, 'One tap'), 'The Auto button, <em>right on the Reel.</em>', 'It sits with Instagram’s own buttons. Tap it to switch Auto-Scroll on or off, or just press <kbd>A</kbd>.')}
    <div class="win" style="left:${lens.x}px;top:${lens.y}px;width:${lens.w}px;height:${lens.h}px;border-radius:28px;
      background:url(${RAW}feed-pug.png) ${-cx * zoom}px ${-cy * zoom}px / ${1440 * zoom}px ${964 * zoom}px no-repeat"></div>
    <div style="position:absolute;left:${lens.x + ax - 36}px;top:${lens.y + ay - 38}px;width:72px;height:76px;border-radius:22px;
      box-shadow:0 0 0 2px #ff7a52, 0 0 0 7px rgba(255,106,61,.25), 0 0 44px 6px rgba(255,80,80,.55);"></div>
    <div style="position:absolute;left:${lens.x + ax - 300}px;top:${lens.y + ay - 30}px;display:flex;align-items:center;gap:0">
      <div class="chip" style="background:rgba(20,16,24,.82);border-color:rgba(255,140,100,.45);font-size:15px;padding:10px 16px;box-shadow:0 12px 30px -8px rgba(0,0,0,.7)">
        <span style="width:9px;height:9px;border-radius:50%;background:var(--glow);box-shadow:0 0 10px #ff6a3d"></span> Auto-Scroll is on</div>
      <div style="width:64px;height:2px;background:linear-gradient(90deg,rgba(255,140,100,.7),rgba(255,140,100,0))"></div></div>
    ${FINISH}`) });

  // 3 — Speed.
  shots.push({ name: `${frame}/${SS}-3`, w: 1280, h: 800, html: page(1280, 800, `
    ${atmosphere([{ x: 900, y: 600, r: 380, c: '#ff6a3d', o: .3, blur: 130 }, { x: 1150, y: 200, r: 260, c: '#ff3b6b', o: .24, blur: 110 }])}
    <div class="grid"></div>
    ${TEXT(206, NUM(2, 'Speed'), 'Watch at <em>your own pace.</em>', 'Play every Reel anywhere from <b>0.5×</b> to <b>3×</b>. Flip Speed on in the popup, or press <kbd>S</kbd>.')}
    ${browser({ frame, x: 540, y: 70, w: 560, h: 700, shot: 'feed-coffee', scale: 0.64, crop: [446, 0] })}
    <div class="card" style="left:820px;top:388px;width:420px"><img src="${RAW}popup-speed-rf-speed.png"></div>
    <div style="position:absolute;left:590px;top:190px;padding:10px 22px;border-radius:999px;font:800 44px/1 Manrope;letter-spacing:-.03em;color:#fff;background:rgba(18,14,22,.55);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.18);box-shadow:0 16px 40px -10px rgba(0,0,0,.7)"><span style="background:var(--glow);-webkit-background-clip:text;color:transparent">1.75×</span></div>
    ${FINISH}`) });

  // 4 — Session Limit and the Break Nudge.
  shots.push({ name: `${frame}/${SS}-4`, w: 1280, h: 800, html: page(1280, 800, `
    ${atmosphere([{ x: 960, y: 260, r: 360, c: '#ff3b6b', o: .28, blur: 130 }, { x: 760, y: 760, r: 300, c: '#ffb938', o: .2, blur: 120 }])}
    <div class="grid"></div>
    ${TEXT(196, NUM(3, 'Wellbeing'), 'Breaks, <em>when you want them.</em>', 'Set a limit in Reels or minutes. Reels Flow pauses with a gentle nudge: keep watching, or call it a day.')}
    ${browser({ frame, x: 540, y: 70, w: 700, h: 700, shot: 'feed-nudge', scale: 0.86, crop: [430, 170] })}
    <div class="card" style="left:810px;top:540px;width:420px"><img src="${RAW}popup-limit-rf-limit.png"></div>
    ${FINISH}`) });

  // 5 — Privacy and Shortcuts.
  const row = (icon: string, title: string, text: string) => `<div style="display:flex;gap:14px;align-items:flex-start;padding:16px 0;border-top:1px solid var(--line)">
      <span style="flex:none;display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:rgba(255,106,61,.12);border:1px solid rgba(255,140,100,.3);color:#ff9a6e">${icon.replace('<svg', '<svg width="19" height="19"')}</span>
      <span><b style="display:block;font-size:17px;font-weight:700;color:var(--text)">${title}</b><span style="font-size:14.5px;color:var(--muted);line-height:1.45">${text}</span></span></div>`;
  shots.push({ name: `${frame}/${SS}-5`, w: 1280, h: 800, html: page(1280, 800, `
    ${atmosphere([{ x: 1000, y: 400, r: 400, c: '#ff3b6b', o: .22, blur: 140 }, { x: 300, y: 820, r: 280, c: '#ff6a3d', o: .16, blur: 120 }])}
    <div class="grid"></div>
    ${TEXT(206, NUM(4, 'Private by design'), 'Nothing to sign up for. <em>Nothing collected.</em>', 'No account, no analytics, no tracking. Reels Flow asks for one permission and one site, and the code is open for anyone to read.', '', 410)}
    <div class="card" style="left:560px;top:150px;width:330px;padding:22px 24px 8px;background:linear-gradient(#1d1b22,#17151c)">
      <div style="display:flex;align-items:center;gap:10px;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);margin-bottom:8px">${'<img src="../../store assets/Icon.svg" style="width:22px">'} Reels Flow</div>
      ${row(SVG.shield, 'Collects no data', 'No analytics, telemetry or ads. Nothing is sent anywhere.')}
      ${row(SVG.check, 'Only instagram.com', 'One site and the storage permission. Nothing else.')}
      ${row(SVG.code, 'Open source', 'MIT licensed, built in the open on GitHub.')}
    </div>
    <div class="card" style="left:910px;top:330px;width:330px"><img src="${RAW}popup-shortcuts-rf-shortcuts-card.png"></div>
    <div style="position:absolute;left:924px;top:230px;display:flex;gap:12px;font-size:34px">
      <kbd style="width:64px;height:64px;border-radius:16px;font-size:26px">A</kbd><kbd style="width:64px;height:64px;border-radius:16px;font-size:26px">S</kbd></div>
    ${FINISH}`) });
}

// Small promo tile, 440×280: readable at a glance, brand first.
const thumb = (photo: string, x: number, y: number, r: number, s = 1, o = 1) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${96 * s}px;height:${170 * s}px;border-radius:${14 * s}px;
  background:url(photos/${photo}) center/cover;transform:rotate(${r}deg);opacity:${o};box-shadow:0 0 0 1px rgba(255,255,255,.14),0 18px 36px -10px rgba(0,0,0,.8)"></div>`;
shots.push({ name: 'chrome/promo-small-440x280', w: 440, h: 280, html: page(440, 280, `
  ${atmosphere([{ x: 360, y: 120, r: 170, c: '#ff3b6b', o: .5, blur: 60 }, { x: 420, y: 280, r: 120, c: '#ffb938', o: .4, blur: 60 }])}
  ${thumb('292.jpg', 314, -129, 0, 1.0, .45)}${thumb('1069.jpg', 314, 55, 0, 1.0)}${thumb('1011.jpg', 314, 239, 0, 1.0, .45)}
  <div style="position:absolute;left:388px;top:190px;width:34px;height:34px;border-radius:50%;background:var(--glow);display:grid;place-items:center;box-shadow:0 6px 16px rgba(255,60,80,.6),0 0 0 2px rgba(255,255,255,.9)">
    <svg width="18" height="18" viewBox="0 0 128 128"><g fill="#fff" stroke="#fff" stroke-width="12" stroke-linejoin="round"><path d="M30 22H98L64 58Z"/><path d="M30 70H98L64 106Z"/></g></svg></div>
  <div style="position:absolute;left:28px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:12px;width:270px">
    <img src="../../store assets/Icon.svg" style="width:56px;height:56px;filter:drop-shadow(0 8px 18px rgba(255,70,70,.45))">
    <div style="font:800 38px/1 Manrope;letter-spacing:-.04em">Reels Flow</div>
    <div style="font:600 17px/1.3 Manrope;color:#d9d2df;letter-spacing:-.01em">Instagram Reels, <span style="background:var(--glow);-webkit-background-clip:text;color:transparent">hands-free.</span></div>
  </div>
  ${FINISH}`) });

// Marquee, 1400×560.
for (const frame of ['chrome'] as Frame[]) shots.push({ name: `${frame}/marquee-1400x560`, w: 1400, h: 560, html: page(1400, 560, `
  ${atmosphere([{ x: 1080, y: 200, r: 420, c: '#ff3b6b', o: .36, blur: 130 }, { x: 1320, y: 560, r: 300, c: '#ffb938', o: .26, blur: 120 }])}
  <div class="grid"></div>
  <div style="position:absolute;left:96px;top:0;bottom:0;width:520px;display:flex;flex-direction:column;justify-content:center;gap:22px;--hs:64px">
    <span class="eyebrow"><img src="../../store assets/Icon.svg"> Reels Flow</span>
    <h1>Instagram Reels, <em>hands&#8209;free.</em></h1>
    <p class="lede" style="max-width:470px">The next Reel starts the moment one ends. Speed, gentle breaks and shortcuts, with zero data collected.</p>
  </div>
  ${browser({ frame, x: 700, y: 64, w: 760, h: 560, shot: 'feed-auto-on', scale: 0.62, crop: [446, 0], extOn: true })}
  <div class="popup" style="left:1066px;top:140px;width:318px"><img src="${RAW}popup-main.png"></div>
  ${FINISH}`) });

const browserCtx = await chromium.launch({ channel: 'chromium' });
for (const s of shots) {
  if (only.length && !only.some((o) => s.name.includes(o))) continue;
  const file = `${HERE}.page-${s.name.replace('/', '_')}.html`;
  writeFileSync(file, s.html);
  const p = await browserCtx.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 2 });
  await p.goto('file://' + file);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(150);
  const big = `${MASTERS}${s.name}@2x.png`;
  mkdirSync(`${OUT}${s.name}`.replace(/\/[^/]+$/, ''), { recursive: true });
  mkdirSync(big.replace(/\/[^/]+$/, ''), { recursive: true });
  await p.screenshot({ path: big });
  // Supersampled: rendered at 2x, then down to the exact store size.
  execFileSync('magick', [big, '-filter', 'Lanczos', '-resize', `${s.w}x${s.h}!`, '-background', '#0d0b11', '-alpha', 'remove', '-alpha', 'off', '-strip', '-define', 'png:compression-level=9', `PNG24:${OUT}${s.name}.png`]);
  await p.close();
  console.log('rendered', s.name);
}
await browserCtx.close();
