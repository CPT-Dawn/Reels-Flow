import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  test: {
    projects: [
      {
        // Background and settings tests against WXT's in-memory fake browser.
        plugins: [WxtVitest()],
        test: {
          name: 'lifecycle',
          include: ['tests/lifecycle/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        // Reels Feed engine tests in real headless browsers. WXT's plugin
        // cannot load here; the engine gets a test settings store instead.
        plugins: [serveFixtures()],
        resolve: {
          alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
        },
        test: {
          name: 'browser',
          include: ['tests/browser/**/*.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }, { browser: 'firefox' }],
            // Room for the widest fixture's snapshot window.
            viewport: { width: 1920, height: 1080 },
          },
        },
      },
    ],
  },
});

/**
 * Answers `<any path>?fixture=<name>` with tests/fixtures/<name>/page.html,
 * byte for byte, so a fixture opens at its own /reels/ address and without
 * the script Vite would inject into an .html file it serves.
 */
function serveFixtures(): Plugin {
  return {
    name: 'reels-flow:serve-fixtures',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const name = new URL(req.url ?? '/', 'http://test').searchParams.get('fixture');
        if (!name || !/^[a-z0-9-]+$/.test(name)) return next();
        try {
          const page = await readFile(new URL(`./tests/fixtures/${name}/page.html`, import.meta.url));
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(page);
        } catch {
          next();
        }
      });
    },
  };
}
