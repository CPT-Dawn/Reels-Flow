// Renders the store video's picture, frame by frame, from the real built extension.
//
// A render-only copy of .output/chrome-mv3 serves video/compose.html, which holds the real Reels Feed
// fixture (with Reels Flow's content script in it) and the real Popup in iframes. For every frame the
// timeline in web/compose.js is drawn, the feed and the Popup are put in their state for that moment,
// every CSS animation in them is seeked to the same clock, and Chromium's compositor output is piped to
// ffmpeg. Nothing depends on how long a frame takes to render, so a run always gives the same film.
//
//   bun scripts/store-video/render.ts --jobs 5 --out picture.mov      # 4K60 ProRes, all of it
//   bun scripts/store-video/render.ts --stills 1.5,8,23 --scale 1     # review stills in .raw/stills/
//   bun scripts/store-video/render.ts --from 19 --to 31.2 --scale 1 --fps 30 --out draft.mov
import { chromium, type Frame, type Page } from 'playwright';
import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const REPO = fileURLToPath(new URL('../../', import.meta.url));
const RAW = `${HERE}.raw/`;
const EXT = `${RAW}ext/`;
const PHOTOS = `${REPO}scripts/store-assets/photos/`;
const CUTS = [0, 14.4, 26.4, 36.0, 43.2, 51.0];

const { values: args } = parseArgs({
  options: {
    from: { type: 'string', default: '0' }, to: { type: 'string' }, fps: { type: 'string', default: '60' },
    scale: { type: 'string', default: '2' }, out: { type: 'string' }, jobs: { type: 'string', default: '1' },
    stills: { type: 'string' }, rebuild: { type: 'boolean', default: false }, child: { type: 'boolean', default: false },
  },
});
const fps = Number(args.fps), scale = Number(args.scale);

/** The extension as built, plus the video's page, with the content script allowed into iframes. */
function buildExtension() {
  if (args.child && existsSync(EXT)) return;
  rmSync(EXT, { recursive: true, force: true });
  cpSync(`${REPO}.output/chrome-mv3`, EXT, { recursive: true });
  const manifest = JSON.parse(readFileSync(`${EXT}manifest.json`, 'utf8'));
  for (const cs of manifest.content_scripts) cs.all_frames = true;
  writeFileSync(`${EXT}manifest.json`, JSON.stringify(manifest));
  const popup = readFileSync(`${EXT}popup.html`, 'utf8');
  writeFileSync(`${EXT}popup.html`, popup.replace('<script type="module"', '<script src="/video/hook.js"></script>\n    <script type="module"'));
  cpSync(`${HERE}web`, `${EXT}video`, { recursive: true });
  mkdirSync(`${EXT}video/assets`, { recursive: true });
  cpSync(`${REPO}store assets/Icon.svg`, `${EXT}video/assets/Icon.svg`);
  cpSync(`${REPO}public/icon/128.png`, `${EXT}video/assets/icon-128.png`);
  cpSync(`${REPO}scripts/store-assets/assets/manrope-latin.woff2`, `${EXT}video/assets/manrope-latin.woff2`);
  cpSync(PHOTOS, `${EXT}video/photos`, { recursive: true });
}

const REELS = ['292.jpg', '1025.jpg', '1060.jpg', '1011.jpg', '1069.jpg', '237.jpg', '1080.jpg', '177.jpg', '431.jpg', '219.jpg', '225.jpg'];
const HANDLES = ['nonna.at.noon', 'pug.diaries', 'slowbrew.club', 'northbound.paddles', 'deepblue.notes', 'littlepaws.daily', 'berry.season', 'trailtales', 'morning.ritual', 'wild.frames', 'quiet.cups', 'studio.oak', 'citylight.co', 'fieldnotes', 'saltandsun', 'oddly.calm'];
const CAPTIONS = [
  'Sunday sauce, start to finish. Fresh basil, slow heat, zero shortcuts 🍅',
  'He has decided today is a blanket day. We respect it.',
  'The 4-minute pour-over that changed my mornings ☕',
  'Glass-still water at 6am. Worth the alarm.',
  'Jellyfish don’t have brains and still look this good.',
  'First day home 🐾',
];

/** Dresses the scrubbed fixture like the store images: photos for Reels, plausible names, no Instagram logo. */
function dressFeed({ reels, HANDLES, CAPTIONS }: { reels: string[]; HANDLES: string[]; CAPTIONS: string[] }) {
  const style = document.createElement('style');
  style.textContent = `
    video { opacity: 0 !important; }
    [data-rf-photo] { background-position: center !important; background-repeat: no-repeat !important; background-color: #111 !important; }
    [data-rf-hide] { visibility: hidden !important; }
    * { scroll-behavior: auto !important; scroll-snap-type: none !important; }
    ::-webkit-scrollbar { display: none; }
  `;
  document.head.append(style);
  document.querySelectorAll('video').forEach((v, i) => {
    const box = v.parentElement!;
    box.dataset.rfPhoto = '';
    box.style.backgroundImage = `url(/__photo/${reels[i % reels.length]})`;
    box.style.backgroundSize = 'auto 100%';
  });
  const logo = document.querySelector('a[href="/"]'); if (logo) (logo as HTMLElement).dataset.rfHide = '';
  const reelsNav = document.querySelector('a[href="/reels/"]');
  if (reelsNav) ((reelsNav.closest('div[class]')?.parentElement as HTMLElement) ?? reelsNav).style.display = 'none';
  const faces = ['64-sq.jpg', '1027-sq.jpg', '177.jpg', '225.jpg', '1080.jpg', '431.jpg'];
  document.querySelectorAll('img').forEach((img, i) => {
    if (img.src.startsWith('data:')) { img.src = `/__photo/${faces[i % faces.length]}`; img.style.objectFit = 'cover'; }
  });
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n: Node | null; let cap = 0;
  while ((n = walker.nextNode())) {
    const t = n.nodeValue!;
    if (/creator(\d+)/.test(t)) n.nodeValue = t.replace(/creator(\d+)/g, (_: string, d: string) => HANDLES[(+d - 2 + HANDLES.length) % HANDLES.length]!);
    else if (/lorem/.test(t)) {
      const audio = (n.parentElement?.closest('a') as HTMLAnchorElement | null)?.href.includes('/reels/audio/');
      n.nodeValue = audio ? 'Original audio' : CAPTIONS[cap++ % CAPTIONS.length]!;
    }
  }
  let scroller: HTMLElement | null = null;
  for (const el of document.querySelectorAll<HTMLElement>('*')) {
    const s = getComputedStyle(el);
    if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 10) { scroller = el; break; }
  }
  (window as any).__scroller = scroller;
}

/** Seeks every animation in the document (shadow roots included) to the video's clock. */
function clockHelpers() {
  const w = window as any;
  w.__mark = (birth: number) => { for (const a of document.getAnimations() as any[]) if (a.__b === undefined) a.__b = birth; };
  w.__seek = (vt: number) => {
    for (const a of document.getAnimations() as any[]) {
      if (a.__b === undefined) a.__b = vt;
      a.pause();
      a.currentTime = Math.max(0, (vt - a.__b) * 1000);
    }
  };
  // Hidden cross-origin frames get no animation frames, so never wait long for one.
  w.__frame = () => new Promise((r) => { const done = setTimeout(r, 40); requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(done); r(undefined); })); });
}

type FeedState = { pos: number; kb: number[]; nudge: number; speed: number };
function applyFeed([s, t]: [FeedState, number]) {
  const w = window as any;
  const sc = w.__scroller as HTMLElement;
  sc.scrollTop = 32 + 964 * s.pos;
  const boxes = document.querySelectorAll<HTMLElement>('[data-rf-photo]');
  s.kb.forEach((k, i) => { if (boxes[i]) boxes[i].style.backgroundSize = `auto ${k * 100}%`; });
  for (const host of document.querySelectorAll('*')) {
    const root = (host as any).shadowRoot as ShadowRoot | null;
    const dialog = root?.querySelector('dialog');
    if (!root || !dialog) continue;
    let st = root.querySelector('style[data-video]');
    if (!st) { st = document.createElement('style'); st.setAttribute('data-video', ''); root.append(st); }
    st.textContent = `dialog { opacity: ${s.nudge}; transform: scale(${0.96 + 0.04 * s.nudge}); } dialog::backdrop { opacity: ${s.nudge}; }`;
  }
  w.__seek(t);
  // The Auto button of the Reel in view: Reel Control's shadow host holding a button.
  let best: DOMRect | null = null;
  for (const host of document.querySelectorAll<HTMLElement>('[data-place]')) {
    if (!host.shadowRoot?.querySelector('button')) continue;
    const r = host.getBoundingClientRect();
    if (r.width && r.top > 0 && r.bottom < innerHeight && (!best || Math.abs(r.top - 700) < Math.abs(best.top - 700))) best = r;
  }
  return w.__frame().then(() => (best ? { x: best.left, y: best.top, w: best.width, h: best.height } : null));
}

async function main() {
  buildExtension();
  if (Number(args.jobs) > 1 && !args.stills) return parallel();

  const from = Number(args.from), to = Number(args.to ?? CUTS.at(-1));
  const ctx = await chromium.launchPersistentContext('', {
    channel: 'chromium', headless: true, viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale, colorScheme: 'dark',
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars'],
  });
  const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
  const id = sw.url().split('/')[2];
  await ctx.route('https://www.instagram.com/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/tests/fixtures/clips/'))
      return route.fulfill({ body: readFileSync(REPO + url.pathname), contentType: 'video/webm' });
    if (url.pathname.startsWith('/__photo/'))
      return route.fulfill({ body: readFileSync(PHOTOS + url.pathname.slice(9)), contentType: 'image/jpeg' });
    if (url.pathname.startsWith('/reels/'))
      return route.fulfill({ body: readFileSync(`${REPO}tests/fixtures/reels-dark/page.html`), contentType: 'text/html' });
    return route.fulfill({ status: 404, body: '' });
  });
  const store = (sync: object, local: object = {}) =>
    sw.evaluate(async ([s, l]: any) => { const { storage } = (globalThis as any).chrome; await storage.sync.set(s); await storage.local.set(l); }, [sync, local]);
  await store(
    { autoScroll: true, speedOn: false, preferredSpeed: 1.5, reelControlShown: true, sessionLimit: { kind: 'off' } },
    { session: { reelsWatched: 26, playingMs: 14 * 60_000, lastSeenAt: Date.now() }, whatsNewUnread: false, firstRunTipDismissed: true },
  );
  await new Promise((r) => setTimeout(r, 500));
  for (const p of ctx.pages()) if (!p.url().startsWith('about:')) await p.close();

  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('[compose]', e.message));
  await page.goto(`chrome-extension://${id}/video/compose.html`);
  await page.waitForTimeout(2500);
  const feed = page.frames().find((f) => f.url().includes('instagram.com/reels'))!;
  const popup = page.frames().find((f) => f.url().endsWith('/popup.html'))!;
  if (!feed || !popup) throw new Error('feed or popup frame missing');
  await feed.evaluate(dressFeed, { reels: REELS, HANDLES, CAPTIONS });
  for (const f of [feed, popup]) await f.evaluate(clockHelpers);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  const H = await page.evaluate(() => (window as any).sizePopup());
  const TL = await page.evaluate(() => (window as any).TIMELINE);
  await popup.evaluate((b) => (window as any).__mark(b), TL.OPEN_POPUP);
  await feed.evaluate(() => (window as any).__mark(-10));
  console.error(`ready: popup ${H}px tall; rendering ${from}–${to}s at ${fps} fps, ${1920 * scale}×${1080 * scale}`);

  const settle = (ms = 450) => new Promise((r) => setTimeout(r, ms));
  const mark = async (t: number) => { for (const f of [feed, popup]) await f.evaluate((b) => (window as any).__mark(b), t); };
  const events: { t: number; name: string }[] = TL.EVENTS;
  const actions: Record<string, (t: number) => Promise<void>> = {
    autoOff: async (t) => { await store({ autoScroll: false }); await settle(); await mark(t); },
    autoOn: async (t) => { await popup.evaluate(() => (document.querySelector('.rf-hero input') as HTMLInputElement).click()); await settle(); await mark(t); },
    count: async (t) => {
      await popup.evaluate(() => ((window as any).__passLocal = true));
      await store({}, { session: { reelsWatched: 27, playingMs: 15 * 60_000, lastSeenAt: Date.now() } });
      await settle(); await mark(t);
      await popup.evaluate(() => ((window as any).__passLocal = false));
    },
    speedOn: async (t) => { await popup.evaluate(() => (document.querySelector('.rf-speed input[type=checkbox]') as HTMLInputElement).click()); await settle(); await mark(t); },
    speedCommit: async (t) => {
      await popup.evaluate((v) => {
        const s = document.querySelector('.rf-slider') as HTMLInputElement;
        s.value = String(v); s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true }));
      }, TL.SLIDE.to);
      await settle(); await mark(t);
    },
    nudgeArm: async (t) => {
      await store({ sessionLimit: { kind: 'reels', value: 30 } }, { session: { reelsWatched: 29, playingMs: 18 * 60_000, lastSeenAt: Date.now() } });
      await settle(); await mark(t);
    },
    nudgePlay: async (t) => {
      await feed.evaluate(() => {
        (window as any).__scroller.scrollTop = 32 + 964 * 3;
        const v = document.querySelectorAll('video')[3] as HTMLVideoElement;
        v.muted = true; v.loop = true; v.preload = 'auto'; void v.play();
      });
      await settle(200); await mark(t);
    },
    nudgeWait: async (t) => {
      const found = await feed.evaluate(async () => {
        for (let i = 0; i < 100; i++) {
          for (const h of document.querySelectorAll('*')) if ((h as any).shadowRoot?.querySelector('dialog[open]')) {
            (h as any).shadowRoot.activeElement?.blur();
            return true;
          }
          await new Promise((r) => setTimeout(r, 100));
        }
        return false;
      });
      if (!found) console.error('WARNING: the Break Nudge did not appear');
      await settle(200); await mark(t);
    },
  };
  let next = 0;
  const catchUp = async (t: number) => {
    while (next < events.length && events[next]!.t <= t + 1e-6) { const e = events[next++]!; await actions[e.name]!(e.t); }
  };
  let lastSpeed = TL.SLIDE.from;
  const frameAt = async (t: number) => {
    await catchUp(t);
    const state: FeedState = await page.evaluate((t) => (window as any).feedAt(t), t);
    if (t >= TL.SLIDE.a - 0.05 && t <= TL.SLIDE.b + 0.05 && state.speed !== lastSpeed) {
      lastSpeed = state.speed;
      await popup.evaluate((v) => {
        const s = document.querySelector('.rf-slider') as HTMLInputElement;
        s.value = String(v); s.dispatchEvent(new Event('input', { bubbles: true }));
      }, state.speed);
      await settle(60); await mark(t);
    }
    const auto = await feed.evaluate(applyFeed, [state, t] as [FeedState, number]);
    await popup.evaluate((t) => { (window as any).__seek(t); return (window as any).__frame(); }, t);
    await page.evaluate(([t, auto]) => { (window as any).render(t, auto); return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); }, [t, auto] as const);
  };
  const cdp = await ctx.newCDPSession(page);
  const shoot = async () => Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, clip: { x: 0, y: 0, width: 1920, height: 1080, scale } })).data, 'base64');

  if (args.stills) {
    const dir = `${RAW}stills/`; mkdirSync(dir, { recursive: true });
    for (const t of args.stills.split(',').map(Number).sort((a, b) => a - b)) {
      await frameAt(t);
      writeFileSync(`${dir}${t.toFixed(2)}.png`, await shoot());
      console.error('still', t);
    }
  } else {
    const out = args.out ?? `${RAW}picture.mov`;
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
      '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv422p10le',
      '-c:v', 'prores_ks', '-profile:v', '3', '-vendor', 'apl0', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise<void>((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));
    const f0 = Math.round(from * fps), f1 = Math.round(to * fps);
    const started = Date.now();
    for (let f = f0; f < f1; f++) {
      await frameAt(f / fps);
      const png = await shoot();
      if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
      if ((f - f0) % 60 === 0) console.error(`${(f / fps).toFixed(2)}s  ${(((Date.now() - started) / (f - f0 + 1)) | 0)} ms/frame`);
    }
    ff.stdin.end();
    await done;
    console.error('wrote', out);
  }
  await ctx.close();
}

/** Renders the cuts in parallel processes, then joins them losslessly. */
async function parallel() {
  const fromT = Number(args.from), toT = Number(args.to ?? CUTS.at(-1));
  const bounds = [fromT, ...CUTS.filter((c) => c > fromT && c < toT), toT];
  const parts = bounds.slice(0, -1).map((a, i) => ({ a, b: bounds[i + 1]!, out: `${RAW}part-${i}.mov` }));
  await Promise.all(parts.map((p) => new Promise<void>((res, rej) => {
    const c = spawn('bun', [fileURLToPath(import.meta.url), '--child', '--from', String(p.a), '--to', String(p.b), '--fps', String(fps), '--scale', String(scale), '--out', p.out], { stdio: 'inherit' });
    c.on('close', (code) => (code === 0 ? res() : rej(new Error(`part ${p.a}–${p.b} failed`))));
  })));
  const list = `${RAW}parts.txt`;
  writeFileSync(list, parts.map((p) => `file '${p.out}'`).join('\n'));
  const out = args.out ?? `${RAW}picture.mov`;
  await new Promise<void>((res, rej) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out], { stdio: 'inherit' })
    .on('close', (c) => (c === 0 ? res() : rej(new Error('concat failed')))));
  console.error('wrote', out);
}

await main();
