// Regenerate js/data.js — the static snapshot of posts baked into the
// GitHub Pages site — from data/posts.json.
//
//   npm run build:static
//
// Run this after editing data/posts.json (or after creating posts via the
// Express admin) so the static site reflects the latest content, then commit.

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'data', 'posts.json');
const OUT = path.join(__dirname, '..', 'js', 'data.js');

const data = JSON.parse(fs.readFileSync(SRC, 'utf8'));

const banner =
  '// Auto-generated from data/posts.json by scripts/build-static.js.\n' +
  '// Do not edit by hand — run `npm run build:static` to regenerate.\n';

fs.writeFileSync(OUT, banner + 'window.REIDCODEX_DATA = ' + JSON.stringify(data, null, 2) + ';\n');

console.log(
  `Wrote ${path.relative(process.cwd(), OUT)}: ` +
    `${data.posts.length} posts, ${data.categories.length} categories.`
);
