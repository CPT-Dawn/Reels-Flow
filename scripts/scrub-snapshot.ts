// Turns a SingleFile snapshot of the Reels Feed into a committed test fixture:
// strips Instagram's scripts and everything personal, and points every Reel's
// video at a short clip in tests/fixtures/clips/. See tests/fixtures/README.md.
//
//   node scripts/scrub-snapshot.ts <snapshot.html> <fixture-name> \
//     [--width 1920] [--height 964] [--description "..."]

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { load, type CheerioAPI } from 'cheerio';
import type { AnyNode, Element } from 'domhandler';

const CLIPS = ['clip-a.webm', 'clip-b.webm', 'clip-c.webm'].map(
  (clip) => `/tests/fixtures/clips/${clip}`,
);

// A plain grey square stands in for every avatar, thumbnail and poster.
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect width='150' height='150' fill='%23888'/%3E%3C/svg%3E";

// Instagram's own interface text. Every other piece of text on the page was
// written by someone (captions, comments, names, song titles) and is replaced.
const INSTAGRAM_TEXT: RegExp[] = [
  /^(Instagram|Home|Reels|Messages|Search|Explore|Notifications|New post|Create|Profile|Settings|More|Also from Meta|Threads)$/,
  /^(Follow|Following|Like|Unlike|Likes|Comment|Comments|Repost|Share|Save|Remove|Close|Reply|Emoji|Post|Verified|Tagged users|Location|Explicit|Original audio|Audio image|Audio is playing|Audio is muted|Video player|Adjust volume|Toggle audio|See translation|Loading\.\.\.|Reels navigation controls|Navigate to (previous|next) Reel|Direct messaging.*)$/,
  /^(… more|more|less|•|·|\.|· Edited|• AI content|Sponsored|Paid partnership|Add a comment…)$/,
  /^[\d.,]+[KMB]?$/, // counts
  /^\d+[smhdw]$/, // ages
  /^(\d+ (likes?|people|replies)|View all \d+ repl(y|ies)|View replies \(\d+\)|Hide replies)$/,
  /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/, // dates
];

// First path segments on instagram.com that are pages, not usernames.
const INSTAGRAM_PATHS = new Set([
  'reels', 'reel', 'p', 'explore', 'direct', 'accounts', 'stories', 'about',
  'legal', 'developer', 'web', 'emails', 'challenge', 'tv', 'privacy',
]);

// How Instagram names a person in a label: "<name>'s profile picture", "<name> reels".
const NAMED_LABEL = /^(.+?)('s profile picture| reels)$/;

const LOREM =
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    width: { type: 'string', default: '1920' },
    height: { type: 'string', default: '964' },
    description: { type: 'string', default: '' },
  },
});
const [snapshotPath, name] = positionals;
if (!snapshotPath || !name || !/^[a-z0-9-]+$/.test(name)) {
  console.error(
    'Usage: node scripts/scrub-snapshot.ts <snapshot.html> <fixture-name> [--width N] [--height N] [--description "..."]',
  );
  process.exit(1);
}

const html = readFileSync(snapshotPath, 'utf8');
const capturedUrl = html.match(/url: (https:\/\/www\.instagram\.com\/\S*)/)?.[1];
const $ = load(html);

/** Hands out stable stand-ins: the same real value always gets the same one. */
function aliases(make: (n: number) => string) {
  const seen = new Map<string, string>();
  const alias = (real: string) => {
    if (!seen.has(real)) seen.set(real, make(seen.size + 1));
    return seen.get(real)!;
  };
  alias.originals = () => [...seen.keys()];
  return alias;
}
const username = aliases((n) => `creator${n}`);
const shortcode = aliases((n) => `FIXTURE${String(n).padStart(4, '0')}`);
const numericId = aliases((n) => String(1000000 + n));

const isInstagramText = (text: string) =>
  INSTAGRAM_TEXT.some((pattern) => pattern.test(text));

function placeholder(text: string) {
  const length = [...text].length;
  const prefix = /^[#@]/.test(text) ? text[0]! : '';
  const rest = Math.max(length - prefix.length, 1);
  return prefix + LOREM.repeat(Math.ceil(rest / LOREM.length) + 1)
    .slice(0, rest)
    .trimEnd()
    .padEnd(rest, 'x');
}

// --- 1. Learn every username on the page, so it can be swapped everywhere.

$('a[href]').each((_, a) => {
  const match = a.attribs.href!.match(/^https:\/\/www\.instagram\.com\/([^/?#]+)\/?/);
  if (match && !INSTAGRAM_PATHS.has(match[1]!)) username(match[1]!);
});
$('[alt], [aria-label]').each((_, el) => {
  for (const value of [el.attribs.alt, el.attribs['aria-label']]) {
    const match = value?.match(NAMED_LABEL);
    if (match) username(match[1]!);
  }
});

function scrubUsernames(text: string) {
  return text
    .replace(NAMED_LABEL, (_, user, rest) => username(user) + rest)
    .replace(/^(@?)([\w.]+)$/, (whole, at, user) =>
      username.originals().includes(user) ? at + username(user) : whole,
    );
}

// --- 2. Remove Instagram's scripts and anything that identifies the capture.

$('script, noscript, iframe, object, embed, base, link').remove();
$('meta').each((_, meta) => {
  const { charset, name: metaName } = meta.attribs;
  if (charset === undefined && metaName !== 'viewport' && metaName !== 'color-scheme') {
    $(meta).remove();
  }
});
removeComments($, $.root().toArray());

const DROPPED_ATTRIBUTES = /^(on.*|nonce|integrity|data-btmanifest|data-bootloader-hash|data-async-css|data-p|data-c|data-instancekey|data-js-focus-visible|srcset|poster)$/;
$<Element, string>('*').each((_, el) => {
  for (const attribute of Object.keys(el.attribs)) {
    if (DROPPED_ATTRIBUTES.test(attribute)) $(el).removeAttr(attribute);
  }
});

// --- 3. Replace every picture.

$('img').attr('src', PLACEHOLDER_IMAGE);
$('[style*="url("]').each((_, el) => {
  el.attribs.style = el.attribs.style!.replace(/url\([^)]*\)/g, `url("${PLACEHOLDER_IMAGE}")`);
});
$('style').each((_, style) => {
  $(style).text(
    $(style).text().replace(/url\(\s*["']?(data:image\/(?!svg)|https?:)[^)]*\)/g, 'none'),
  );
});

// --- 4. Replace names, links and everything people wrote.

$('a[href]').each((_, a) => {
  a.attribs.href = scrubHref(a.attribs.href!);
});

for (const attribute of ['alt', 'aria-label', 'title']) {
  $<Element, string>(`[${attribute}]`).each((_, el) => {
    const value = el.attribs[attribute]!;
    if (value === '' || isInstagramText(value)) return;
    const scrubbed = scrubUsernames(value);
    el.attribs[attribute] = scrubbed !== value ? scrubbed : placeholder(value);
  });
}

$('body *')
  .not('style')
  .contents()
  .each((_, node) => {
    if (node.type !== 'text') return;
    const text = node.data.trim();
    if (text === '' || isInstagramText(text)) return;
    const scrubbed = scrubUsernames(text);
    node.data = node.data.replace(text, scrubbed !== text ? scrubbed : placeholder(text));
  });

// --- 5. Give every Reel a real clip; leave Instagram's attributes as captured.

const videos = $('video').toArray();
videos.forEach((video, i) => {
  $(video).attr('src', CLIPS[i % CLIPS.length]!);
});

// --- 6. Check nothing slipped through, then write the fixture.

const output = $.html();
const leaks = [
  ...username.originals().filter((user) => new RegExp(`(^|[^\\w.])${escapeRegExp(user)}($|[^\\w.])`).test(output)),
  ...['fbcdn.net', 'cdninstagram', 'data:image/jpeg', 'data:image/png', 'data:image/webp', '<script', 'SingleFile']
    .filter((needle) => output.includes(needle)),
  ...(output.match(/https?:\/\/(?!www\.w3\.org\/)[^\s"'<>)]+/g) ?? []),
];
if (leaks.length > 0) {
  console.error(`Not written: the scrubbed page still contains:\n  ${[...new Set(leaks)].join('\n  ')}`);
  process.exit(1);
}

const dir = new URL(`../tests/fixtures/${name}/`, import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(new URL('page.html', dir), output);
writeFileSync(
  new URL('fixture.json', dir),
  JSON.stringify(
    {
      description: values.description,
      path: capturedUrl ? scrubHref(capturedUrl) : '/reels/',
      viewport: { width: Number(values.width), height: Number(values.height) },
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Wrote tests/fixtures/${name}/ (${videos.length} Reels, ${username.originals().length} usernames replaced, ${Math.round(output.length / 1024)} KB)`,
);

function scrubHref(href: string) {
  const url = URL.canParse(href) ? new URL(href) : null;
  if (!url || url.hostname !== 'www.instagram.com') return '#';
  const segments = url.pathname.split('/').map((segment, i, all) => {
    if (segment === '') return segment;
    if (i === 1 && !INSTAGRAM_PATHS.has(segment)) return username(segment);
    if (/^\d{5,}$/.test(segment)) return numericId(segment);
    if (['reels', 'reel', 'p'].includes(all[i - 1] ?? '') && segment !== 'audio') {
      return shortcode(segment);
    }
    if (all[i - 1] === 'tags') return 'tag';
    return segment;
  });
  return segments.join('/');
}

function removeComments($: CheerioAPI, nodes: AnyNode[]) {
  for (const node of nodes) {
    if (node.type === 'comment') $(node).remove();
    else if ('children' in node) removeComments($, (node as Element).children);
  }
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
