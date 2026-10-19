# NEON BREAK

[![pages](https://github.com/SiliconValley007/BrickBreaker/actions/workflows/pages.yml/badge.svg)](https://github.com/SiliconValley007/BrickBreaker/actions/workflows/pages.yml)

Zero-dependency neon Breakout for GitHub Pages. Canvas, ES modules, seeded dailies, bosses, adaptive audio, offline PWA, strict CSP. Live: `https://SiliconValley007.github.io/BrickBreaker/` (or your `CNAME` host).

## Controls

Move: mouse / touch drag, `A` `D`, arrows, left stick. Launch: click / tap, `Space`, gamepad South. Pause: `P`, `Esc`, gamepad Start, or the pause button.

## Dev

```
npm ci
npx playwright install --with-deps chromium
npm run check
```

`check` runs unit/build invariants, build, then browser e2e. e2e honors `E2E_BASE` (default `/neon-break/`) and skips without Playwright. Preview: `python3 -m http.server 8000 -d dist`, open `http://localhost:8000/`; `?debug=1` enables hooks.

The build copies committed assets, stamps content hashes into `sw.js`/`APP_VER`, derives precache from `dist`, and fails on root-absolute paths. With `SITE_URL` (or `CNAME`) it emits absolute canonical/OG/Twitter tags plus `sitemap.xml`/`robots.txt`; without it those are omitted.

## Files

```
index.html style.css sw.js manifest.webmanifest icon.svg favicon.ico og.png
icons/  js/*.js  scripts/build.mjs  tests/run.mjs  tests/e2e.mjs
.github/workflows/pages.yml  package.json  package-lock.json  .gitignore  LICENSE
```

`js/main.js` composes modules; `js/const.js` holds limits/palettes; `js/levels.js` holds layouts/seeded RNG. MIT, see `LICENSE`.
