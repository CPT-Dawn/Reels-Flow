import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
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
          },
        },
      },
    ],
  },
});
