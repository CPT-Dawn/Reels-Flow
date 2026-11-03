// Captures every raw scene from the real built extension, at 2x.
import { launch, openReels, RAW, REELS, setStorage } from './stage';
const from = (photo: string) => { const i = REELS.indexOf(photo); return [...REELS.slice(i), ...REELS.slice(0, i)]; };
import { mkdirSync } from 'node:fs';
mkdirSync(RAW, { recursive: true });
const only = process.argv[2];
const SIZE = { width: 1440, height: 964 };
const now = Date.now();

async function feed(name: string, sync: Record<string, unknown>, local: Record<string, unknown> = {}, act?: (p: any) => Promise<void>, reels = REELS) {
  if (only && only !== name) return;
  const { ctx, sw } = await launch(SIZE, 2);
  await setStorage(sw, sync, local);
  const page = await openReels(ctx, { reels });
  if (act) await act(page);
  await page.screenshot({ path: `${RAW}${name}.png` });
  await ctx.close();
  console.log('captured', name);
}

async function popup(name: string, sync: Record<string, unknown>, local: Record<string, unknown> = {}, act?: (p: any) => Promise<void>, scheme: 'dark' | 'light' = 'dark', parts: string[] = []) {
  if (only && only !== name) return;
  const { ctx, id, sw } = await launch({ width: 340, height: 1000 }, 3);
  await setStorage(sw, sync, local);
  const page = await ctx.newPage();
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
  await page.goto(`chrome-extension://${id}/popup.html`);
  await page.waitForTimeout(1000);
  // The popup is its own tab here; on the Reels Feed the Open Reels card never shows.
  await page.evaluate(() => document.querySelector('.rf-open-reels')?.remove());
  if (act) await act(page);
  await page.waitForTimeout(300);
  await page.locator('.rf-popup').screenshot({ path: `${RAW}${name}.png`, omitBackground: false });
  for (const sel of parts) await page.locator(sel).first().screenshot({ path: `${RAW}${name}${sel.replace(/[^a-z]+/g, '-')}.png` });
  await ctx.close();
  console.log('captured', name);
}

const base = { autoScroll: true, speedOn: false, preferredSpeed: 1.5, reelControlShown: true, sessionLimit: { kind: 'off' } };
const session = (reels: number, min: number) => ({ session: { reelsWatched: reels, playingMs: min * 60_000, lastSeenAt: now } });
const seen = { whatsNewUnread: false, firstRunTipDismissed: true };

await feed('feed-auto-on', base, session(24, 14));
await feed('feed-pug', base, session(24, 14), undefined, from('1025.jpg'));
await feed('feed-coffee', { ...base, speedOn: true, preferredSpeed: 1.75 }, session(24, 14), undefined, from('1060.jpg'));
await feed('feed-nudge', { ...base, sessionLimit: { kind: 'reels', value: 30 } },
  { session: { reelsWatched: 29, playingMs: 18 * 60_000, lastSeenAt: now } }, async (page) => {
    await page.evaluate(() => { const v = document.querySelector('video')!; v.muted = true; v.preload = 'auto'; void v.play(); });
    await page.waitForSelector('dialog', { state: 'attached', timeout: 1 }).catch(() => {});
    await page.waitForTimeout(3500);
    await page.evaluate(() => { for (const h of document.querySelectorAll('*')) (h as any).shadowRoot?.activeElement?.blur(); });
    await page.mouse.move(5, 5);
  }, from('1011.jpg'));
await popup('popup-main', { ...base, speedOn: true }, { ...session(24, 14), ...seen });
await popup('popup-speed', { ...base, speedOn: true, preferredSpeed: 1.75 }, { ...session(24, 14), ...seen }, undefined, 'dark', ['.rf-speed', '.rf-hero']);
await popup('popup-limit', { ...base, sessionLimit: { kind: 'reels', value: 30 } }, { ...session(24, 14), ...seen }, undefined, 'dark', ['.rf-limit']);
await popup('popup-shortcuts', base, { ...session(24, 14), ...seen }, async (page) => {
  await page.click('#rf-shortcuts-toggle'); await page.waitForTimeout(700); await page.mouse.click(2, 2);
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
}, 'dark', ['.rf-shortcuts-card']);
