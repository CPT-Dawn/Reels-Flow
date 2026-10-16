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
          // 140 is the first Firefox desktop release that understands
          // data_collection_permissions. Zero telemetry: see ADR 0003.
          strict_min_version: '140.0',
          data_collection_permissions: {
            required: ['none'],
          },
        },
        // Android is not a target, but without this the linter assumes the
        // desktop minimum applies there too, where the declaration came in 142.
        gecko_android: {
          strict_min_version: '142.0',
        },
      },
    }),
  }),
});
