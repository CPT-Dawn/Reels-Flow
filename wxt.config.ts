import { defineConfig } from 'wxt';

// See ADR 0004: one codebase builds the Chrome, Edge and Firefox packages.
export default defineConfig({
  srcDir: 'src',
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: '__MSG_extensionName__',
    short_name: '__MSG_extensionShortName__',
    description: '__MSG_extensionDescription__',
    default_locale: 'en',
    permissions: ['storage'],
    host_permissions: ['https://www.instagram.com/*'],
    action: {
      default_title: '__MSG_extensionShortName__',
    },
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: {
          id: 'reels-flow@cptdawn.dev',
          // data_collection_permissions arrived in Firefox desktop 140 but
          // Android 142, and `web-ext lint` checks the desktop minimum against
          // both. 142 keeps the lint clean without a `gecko_android` key, which
          // would make AMO list Reels Flow for Android (out of scope).
          // Zero telemetry: see ADR 0003.
          strict_min_version: '142.0',
          data_collection_permissions: {
            required: ['none'],
          },
        },
      },
    }),
  }),
});
