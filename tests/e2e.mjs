import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { extname, join, normalize } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const root = join(fileURLToPath(import.meta.url), "../..");
const dist = join(root, "dist");
if (!existsSync(join(dist, "index.html"))) {
  const r = spawnSync(process.execPath, ["scripts/build.mjs"], {
    cwd: root,
    encoding: "utf8",
  });
  if (r.status !== 0) throw new Error("build failed: " + r.stderr);
}
let pw;
try {
  pw = await import("playwright");
} catch (e) {
  console.log("e2e skip (no playwright)");
  process.exit(0);
}

const base =
  "/" + (process.env.E2E_BASE || "/neon-break/").replace(/^\/+|\/+$/g, "");
const rootPath = base === "/" ? "/" : base + "/";
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".xml": "application/xml",
};
let notFound = 0,
  swOverride = null;

const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  if (rootPath !== "/" && url === base) {
    res.writeHead(302, { location: rootPath });
    res.end();
    return;
  }
  if (!url.startsWith(rootPath)) {
    notFound++;
    res.writeHead(404);
    res.end();
    return;
  }
  let rel = url.slice(rootPath.length);
  if (!rel || rel.endsWith("/")) rel += "index.html";
  if (swOverride && rel === "sw.js") {
    res.writeHead(200, { "content-type": "text/javascript" });
    res.end(swOverride);
    return;
  }
  const p = normalize(join(dist, rel));
  if (!p.startsWith(dist) || !existsSync(p)) {
    notFound++;
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, {
    "content-type": mime[extname(p)] || "application/octet-stream",
    "cache-control": "no-cache",
  });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = "http://127.0.0.1:" + server.address().port;
const browser = await pw.chromium.launch();
const context = await browser.newContext({
  viewport: { width: 900, height: 700 },
});
await context.addInitScript(() => {
  window.__audioResume = 0;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC || !AC.prototype) return;
  let proto = AC.prototype;
  while (proto && !Object.getOwnPropertyDescriptor(proto, "state"))
    proto = Object.getPrototypeOf(proto);
  if (proto)
    try {
      Object.defineProperty(proto, "state", {
        configurable: true,
        get: () => "suspended",
      });
    } catch (e) {}
  const orig = AC.prototype.resume;
  if (orig)
    AC.prototype.resume = function () {
      window.__audioResume++;
      return orig.apply(this, arguments);
    };
});
const page = await context.newPage();
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));

async function open() {
  await page.goto(origin + rootPath + "?debug=1", { waitUntil: "load" });
  await page.waitForFunction(() => !!window.NB, null, { timeout: 15000 });
}
async function start() {
  if (await page.locator("#btnTutGo").isVisible())
    await page.click("#btnTutGo");
  if (await page.locator("#action").isVisible()) await page.click("#action");
}
const info = () => page.evaluate(() => window.NB.info());

await open();
const title = await page.title();
if (!title.includes("NEON BREAK")) throw new Error("title");
await start();
await page.waitForTimeout(150);
let i = await info();
if (!i || i.lives < 1 || i.state !== 1) throw new Error("play did not start");
if ((await page.evaluate(() => window.__audioResume || 0)) < 1)
  throw new Error("audio not unlocked");

await page.setViewportSize({ width: 640, height: 480 });
await page.waitForTimeout(100);
await page.setViewportSize({ width: 900, height: 700 });
await page.waitForTimeout(100);
if ((await info()).state !== 1) throw new Error("resize dropped play");
await page.evaluate(() => window.dispatchEvent(new Event("blur")));
await page.waitForTimeout(50);
if ((await info()).state !== 2) throw new Error("blur did not pause");
await page.evaluate(() => window.NB.setState(1));

const played = await page.evaluate(() => {
  const G = window.NB.G;
  window.NB.newGame(1, false);
  G.runSeed = 1;
  G.level = 1;
  G.prepareLevel();
  window.NB.setState(1);
  window.NB.launch();
  for (let n = 0; n < 50000; n++) {
    if (G.state === 3) return { cleared: true, left: G.bCount };
    if (G.state !== 1) return { cleared: false, state: G.state };
    const ball = G.balls[0];
    if (ball) {
      const off = Math.sin(n * 0.004) * G.pw * 0.42;
      G.px = Math.max(
        G.playL,
        Math.min(G.W - G.playR - G.pw, ball.x - G.pw * 0.5 + off),
      );
      G.ptx = G.px;
      if (ball.stuck) window.NB.launch();
    }
    window.NB.tick(1);
  }
  return { cleared: false, state: G.state };
});
if (!played.cleared || played.left !== 0)
  throw new Error("level not cleared: " + JSON.stringify(played));
const lvl = (await info()).level;
await page.click("#btnNext");
await page.waitForTimeout(80);
i = await info();
if (i.state !== 1 || i.level !== lvl + 1) throw new Error("next level");

await page.evaluate(() => window.NB.newGame(5, false));
i = await info();
if (!i.boss || i.bossHp <= 0) throw new Error("boss missing");

async function daily() {
  return page.evaluate(() => {
    window.NB.newGame(1, true);
    const bricks = window.NB.bricks()
      .map(
        (b) =>
          b.type + ":" + b.x.toFixed(2) + ":" + b.y.toFixed(2) + ":" + b.hp,
      )
      .join("|");
    const v = window.NB.info();
    return { seed: v.seed, bricks };
  });
}
const d1 = await daily();
await open();
const d2 = await daily();
if (JSON.stringify(d1) !== JSON.stringify(d2))
  throw new Error("daily not deterministic");

await page.evaluate(() => navigator.serviceWorker.ready);
try {
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, {
    timeout: 15000,
  });
} catch (e) {
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, {
    timeout: 15000,
  });
}
await context.setOffline(true);
await page.reload({ waitUntil: "load" });
await page.waitForFunction(() => !!window.NB, null, { timeout: 15000 });
await context.setOffline(false);

const oldCaches = await page.evaluate(() => caches.keys());
const newVer = "nb-e2e-" + Date.now();
swOverride =
  'const VER = "' +
  newVer +
  '";' +
  'self.addEventListener("install",(e)=>e.waitUntil(caches.open(VER).then((c)=>c.addAll(["./"])).then(()=>self.skipWaiting())));' +
  'self.addEventListener("activate",(e)=>e.waitUntil(caches.keys().then((ks)=>Promise.all(ks.map((k)=>k===VER?null:caches.delete(k)))).then(()=>self.clients.claim())));';
await page.evaluate(async () => {
  (await navigator.serviceWorker.ready).update();
});
await page.waitForFunction(
  async (a) => {
    const ks = await caches.keys();
    return ks.includes(a.v) && a.old.every((k) => ks.includes(k) === false);
  },
  { v: newVer, old: oldCaches },
  { timeout: 20000 },
);

if (notFound) throw new Error("404 responses: " + notFound);
if (errors.length) throw new Error("console errors: " + errors.join(" | "));
await browser.close();
server.close();
console.log("e2e ok");
