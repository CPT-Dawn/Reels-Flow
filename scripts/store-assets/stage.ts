// Store images, step 1 of 2. Shared: launch Chromium with the real built extension and serve a dressed-up
import { fileURLToPath } from 'node:url';
// Instagram Reels fixture at its real address.
import { chromium, type BrowserContext, type Page } from 'playwright';
import { readFileSync } from 'node:fs';
export const REPO = fileURLToPath(new URL('../../', import.meta.url));
export const EXT = `${REPO}/.output/chrome-mv3`;
export const PHOTOS = fileURLToPath(new URL('./photos/', import.meta.url));
/** Raw captures, gitignored: rebuilt from the extension on every run. */
export const RAW = fileURLToPath(new URL('./.raw/', import.meta.url));

export async function launch(viewport = { width: 1440, height: 900 }, scale = 2) {
  const ctx = await chromium.launchPersistentContext('', {
    channel: 'chromium', headless: true, viewport, deviceScaleFactor: scale, colorScheme: 'dark',
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
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
      return route.fulfill({ body: readFileSync(`${REPO}/tests/fixtures/${process.env.FIXTURE ?? 'reels-dark'}/page.html`), contentType: 'text/html' });
    return route.fulfill({ status: 404, body: '' });
  });
  await new Promise((r) => setTimeout(r, 800));
  for (const p of ctx.pages()) if (!p.url().startsWith('about:')) await p.close();
  return { ctx, id, sw };
}

export async function setStorage(sw: any, sync: Record<string, unknown>, local: Record<string, unknown> = {}) {
  await sw.evaluate(async ([s, l]: any) => {
    // Runs in the extension's service worker, where `chrome` exists.
    const { storage } = (globalThis as any).chrome;
    await storage.sync.set(s);
    await storage.local.set(l);
  }, [sync, local]);
}

export const REELS = ['292.jpg', '1025.jpg', '1060.jpg', '1011.jpg', '1069.jpg', '237.jpg', '1080.jpg', '177.jpg', '431.jpg', '219.jpg', '225.jpg'];
const HANDLES = ['nonna.at.noon', 'pug.diaries', 'slowbrew.club', 'northbound.paddles', 'deepblue.notes', 'littlepaws.daily', 'berry.season', 'trailtales', 'morning.ritual', 'wild.frames', 'quiet.cups', 'studio.oak', 'citylight.co', 'fieldnotes', 'saltandsun', 'oddly.calm'];
const CAPTIONS = [
  'Sunday sauce, start to finish. Fresh basil, slow heat, zero shortcuts 🍅',
  'He has decided today is a blanket day. We respect it.',
  'The 4-minute pour-over that changed my mornings ☕',
  'Glass-still water at 6am. Worth the alarm.',
  'Jellyfish don’t have brains and still look this good.',
  'First day home 🐾',
];

export async function openReels(ctx: BrowserContext, { reels = REELS } = {}): Promise<Page> {
  const page = await ctx.newPage();
  await page.goto('https://www.instagram.com/reels/FIXTURE0001/');
  await page.waitForTimeout(1200);
  await page.evaluate(({ reels, HANDLES, CAPTIONS }) => {
    const style = document.createElement('style');
    style.textContent = `
      video { opacity: 0 !important; }
      [data-rf-photo] { background-size: cover !important; background-position: center !important; }
      [data-rf-hide] { visibility: hidden !important; }
    `;
    document.head.append(style);
    document.querySelectorAll('video').forEach((v, i) => {
      const box = v.parentElement!;
      box.dataset.rfPhoto = '';
      box.style.backgroundImage = `url(/__photo/${reels[i % reels.length]})`;
    });
    // No Instagram logo or Reels glyph in store images.
    const logo = document.querySelector('a[href="/"]'); if (logo) (logo as HTMLElement).dataset.rfHide = '';
    const reelsNav = document.querySelector('a[href="/reels/"]'); if (reelsNav) (reelsNav.closest('div[class]')?.parentElement as HTMLElement ?? reelsNav).style.display = 'none';
    // Avatars and audio thumbnails: photo crops instead of grey squares.
    const faces = ['64-sq.jpg', '1027-sq.jpg', '177.jpg', '225.jpg', '1080.jpg', '431.jpg'];
    document.querySelectorAll('img').forEach((img, i) => {
      if (img.src.startsWith('data:')) { img.src = `/__photo/${faces[i % faces.length]}`; img.style.objectFit = 'cover'; }
    });
    // Names and captions: plausible text instead of creatorN and lorem ipsum.
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
  }, { reels, HANDLES, CAPTIONS });
  await page.waitForTimeout(600);
  return page;
}
