const store = Object.create(null);
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
    key: (i) => Object.keys(store)[i] || null,
    get length() {
      return Object.keys(store).length;
    },
  },
});
import {
  readFileSync,
  readdirSync,
  existsSync,
  statSync,
  mkdtempSync,
  writeFileSync,
} from "fs";
import { spawnSync } from "child_process";
import { join, relative, sep } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";

const {
  clamp,
  sweepCircleAABB,
  collideBallBrick,
  reflectNormal,
  paddleBounce,
  mulberry32,
} = await import("../js/physics.js");
const { PATTERNS, DIFF, dateSeed, runSeedFor, rng } =
  await import("../js/levels.js");
const { validateSave, importJSON, lsGet, lsSet } =
  await import("../js/storage.js");
const { PALETTES } = await import("../js/const.js");
const { spawnBoss, damageBoss } = await import("../js/boss.js");
const { createEntities } = await import("../js/entities.js");
const { createBricks } = await import("../js/bricks.js");
const { dailyInfo } = await import("../js/daily.js");
const { resolveSiteUrl, normalizeSiteUrl } =
  await import("../scripts/build.mjs");

let fails = 0;
const ok = (c, m) => {
  if (!c) {
    fails++;
    console.error("FAIL " + m);
  }
};
const root = fileURLToPath(new URL("../", import.meta.url));
const dist = join(root, "dist");

ok(clamp(5, 0, 3) === 3 && clamp(-1, 0, 3) === 0, "clamp");
ok(
  PATTERNS.length >= 20 && DIFF.classic.lives === 3 && DIFF.insane.spd > 1,
  "levels/diff",
);
const a = mulberry32(12345),
  b = mulberry32(12345),
  c = mulberry32(54321);
const s1 = [a(), a(), a()],
  s2 = [b(), b(), b()],
  s3 = [c(), c(), c()];
ok(s1.join() === s2.join() && s1.join() !== s3.join(), "RNG deterministic");
ok(
  dateSeed(new Date("2026-10-17T03:00:00Z")) ===
    dateSeed(new Date("2026-10-17T23:59:59Z")),
  "UTC day seed",
);
ok(runSeedFor(20261017, 3, 2) === runSeedFor(20261017, 3, 2), "run seed");
ok(
  JSON.stringify(dailyInfo(new Date("2026-10-17T00:00:00Z"))) ===
    JSON.stringify(dailyInfo(new Date("2026-10-17T22:00:00Z"))),
  "daily stable",
);
const rr = rng(42);
ok(rr() !== rr(), "rng advances");

const ball = { x: 10, y: 10, vx: 100, vy: 0, r: 7, canHitBrick: true };
const hit = collideBallBrick(
  ball,
  0.5,
  10,
  10,
  [{ alive: 1, x: 40, y: 5, w: 20, h: 14 }],
  null,
);
ok(hit && hit.b, "collision");
reflectNormal(ball, -1, 0, 40, 5, 20, 14);
ok(ball.vx <= 0, "reflect");
const t = sweepCircleAABB(0, 0, 200, 0, 6, 80, -10, 20, 20, 1);
ok(t != null && t >= 0 && t <= 1, "sweep");
const fast = { x: 0, y: 40, vx: 12000, vy: 0, r: 7, canHitBrick: true };
ok(
  collideBallBrick(
    fast,
    0.05,
    0,
    40,
    [{ alive: 1, x: 100, y: 20, w: 30, h: 40 }],
    null,
  ).t < 1,
  "CCD high speed",
);
const edge = { x: 10, y: 100, vx: 10, vy: 300, r: 7 };
paddleBounce(edge, 0, 110, 100, 14, 400);
ok(edge.vy < 0 && edge.vx < 0, "paddle edge");

function brickG(seed) {
  return {
    W: 400,
    H: 600,
    level: 7,
    levelSeed: seed,
    runSeed: seed,
    rng: mulberry32(seed),
    PAL: PALETTES.default,
    bricks: [],
    moving: [],
    bCount: 0,
    boss: null,
    spawnBoss() {},
    rows: 6,
    cols: 9,
    gridX: 10,
    gridY: 50,
    bw: 30,
    bh: 14,
    gap: 4,
    playL: 10,
    playR: 10,
    py: 540,
    BR: 7,
    addBrick() {},
  };
}
const sig = (g) => g.bricks.map((x) => x.type + x.x + x.y + x.hp).join("|");
const ga = brickG(20261017),
  gb = brickG(20261017),
  gc = brickG(20261018);
createBricks(ga).makeBricks();
createBricks(gb).makeBricks();
createBricks(gc).makeBricks();
ok(sig(ga) === sig(gb) && sig(ga) !== sig(gc), "seeded bricks");
function drops(seed) {
  const g = {
    balls: [],
    puTimer: {},
    boss: null,
    level: 3,
    diff: { drop: 1 },
    rng: mulberry32(seed),
    px: 10,
    py: 500,
    sfx() {},
  };
  const e = createEntities(g),
    out = [];
  for (let i = 0; i < 12; i++) {
    e.dropPU(10, 10);
    out.push(
      e.drops
        .filter((d) => d.a)
        .map((d) => d.i)
        .join(),
    );
    e.drops.forEach((d) => {
      d.a = 0;
    });
  }
  return out.join("|");
}
ok(drops(999) === drops(999) && drops(999) !== drops(1000), "seeded drops");

lsSet("nb_vol", "70");
ok(lsGet("nb_vol") === "70", "storage");
ok(
  validateSave({ v: 1, data: { nb_vol: "9", evil: "x" } }).nb_vol === "9",
  "save filter",
);
ok(!validateSave({ v: 2, data: {} }) && !validateSave(null), "save reject");
const dumped = JSON.stringify({ v: 1, data: { nb_vol: "70" } });
ok(
  importJSON(dumped) && lsGet("nb_vol") === "70" && !importJSON("{junk"),
  "save import",
);

let cleared = 0,
  unlocked = "";
const G = {
  W: 400,
  H: 600,
  brickBottom: 120,
  gridY: 40,
  py: 520,
  BR: 7,
  level: 5,
  reduce: false,
  cfg: { cb: false },
  quality: 1,
  combo: 0,
  shake: 0,
  flash: 0,
  balls: [],
  boss: null,
  score: 0,
  stats: { bosses: 0 },
  burst() {},
  ring() {},
  sfx() {},
  updateHUD() {},
  saveStats() {},
  clearedBoard: () => true,
  levelClear() {
    cleared++;
  },
  unlock(id) {
    unlocked = id;
  },
};
spawnBoss(G);
const hp = G.boss.hp;
damageBoss(G, 1);
ok(G.boss.hp === hp - 1, "boss damage");
damageBoss(G, G.boss.hp);
ok(!G.boss && cleared === 1 && unlocked === "boss", "boss clear");

const jsDir = join(root, "js");
for (const f of readdirSync(jsDir).filter((x) => x.endsWith(".js"))) {
  const src = readFileSync(join(jsDir, f), "utf8");
  ok(src.split("\n").length < 400, f + " <400 lines");
  ok(!src.includes("shadowBlur"), f + " no shadowBlur");
  src.split("\n").forEach((line) => {
    if (line.includes("Math.random"))
      ok(line.includes("// cosmetic"), f + " random cosmetic");
  });
}
ok(!existsSync(join(jsDir, "game.js")), "legacy game.js gone");
ok(
  readFileSync(join(jsDir, "bricks.js"), "utf8").includes("G.rng()"),
  "bricks seeded",
);
ok(
  readFileSync(join(jsDir, "entities.js"), "utf8").includes("G.rng()"),
  "drops seeded",
);
ok(
  readFileSync(join(root, "tests/e2e.mjs"), "utf8").includes(
    "process.env.E2E_BASE",
  ),
  "e2e base env",
);
const html = readFileSync(join(root, "index.html"), "utf8");
ok(
  html.includes("<!--seo-->") && html.includes('src="js/boot.js"'),
  "html marker/entry",
);
ok(
  !/(?:href|src)="\//.test(html) &&
    !/content="\//.test(html) &&
    !/url\(\//.test(readFileSync(join(root, "style.css"), "utf8")),
  "relative paths",
);
const manifest = readFileSync(join(root, "manifest.webmanifest"), "utf8");
ok(
  /"start_url":\s*"\.\/"/.test(manifest) && !/"screenshots"/.test(manifest),
  "manifest relative/no screenshots",
);
ok(!/(?:href|src)="\//.test(manifest), "manifest no root paths");

const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
ok(
  lock.lockfileVersion === 3 &&
    lock.packages["node_modules/playwright"].version === "1.55.0",
  "lockfile",
);
ok(
  pkg.engines.node === ">=20" &&
    pkg.scripts.check === "npm test && npm run build && npm run e2e",
  "package scripts",
);

const tmp = mkdtempSync(join(tmpdir(), "nb-cname-"));
writeFileSync(join(tmp, "CNAME"), "neon.example.com\n");
ok(
  resolveSiteUrl(tmp, { SITE_URL: "https://env.example/x" }) ===
    "https://neon.example.com",
  "CNAME wins",
);
ok(
  resolveSiteUrl(mkdtempSync(join(tmpdir(), "nb-e-")), {
    SITE_URL: "https://env.example/x/",
  }) === "https://env.example/x",
  "env site",
);
ok(
  resolveSiteUrl(mkdtempSync(join(tmpdir(), "nb-n-")), {}) === "",
  "empty site",
);
ok(
  normalizeSiteUrl("https://a.example//x///") === "https://a.example/x",
  "site normalize",
);

function runBuild(site) {
  return spawnSync(process.execPath, ["scripts/build.mjs"], {
    cwd: root,
    encoding: "utf8",
    timeout: 120000,
    env: Object.assign({}, process.env, { SITE_URL: site }),
  });
}
function distHtml() {
  return readFileSync(join(dist, "index.html"), "utf8");
}
function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory()
      ? walk(p)
      : [relative(dist, p).split(sep).join("/")];
  });
}
function core(sw) {
  return JSON.parse(sw.match(/const CORE = (\[[\s\S]*?\]);/)[1]);
}

const rel = runBuild("");
ok(rel.status === 0, "build without SITE_URL");
ok(
  !/rel="canonical"|property="og:url"|property="og:image"|name="twitter:image"/.test(
    distHtml(),
  ),
  "no SEO tags without site",
);
ok(
  !existsSync(join(dist, "sitemap.xml")) &&
    !existsSync(join(dist, "robots.txt")),
  "no robots/sitemap without site",
);
ok(
  !/(?:href|src)="\//.test(distHtml()) && !/content="\//.test(distHtml()),
  "dist relative",
);
const swRel = readFileSync(join(dist, "sw.js"), "utf8");
ok(
  !swRel.includes("__BUILD__") && !swRel.includes("__PRECACHE__"),
  "SW stamped",
);
const ver = swRel.match(/const VER = "(nb-[0-9a-f]+)"/)[1];
ok(
  distHtml().includes('id="appVer">' + ver) &&
    readFileSync(join(dist, "js/const.js"), "utf8").includes(ver),
  "hash stamped",
);
ok(
  core(swRel).length === walk(dist).filter((f) => f !== "sw.js").length + 1,
  "precache==dist",
);

const site = "https://u.github.io/r";
const abs = runBuild(site);
ok(abs.status === 0, "build with SITE_URL");
const ah = distHtml();
ok(
  ah.includes('rel="canonical" href="' + site + '/"') &&
    ah.includes('property="og:url" content="' + site + '/"'),
  "canonical/og:url absolute",
);
ok(
  ah.includes('property="og:image" content="' + site + '/og.png"') &&
    ah.includes('name="twitter:image" content="' + site + '/og.png"'),
  "og/twitter absolute",
);
const sm = readFileSync(join(dist, "sitemap.xml"), "utf8");
ok(
  /<loc>https:\/\/u\.github\.io\/r\/<\/loc>/.test(sm) &&
    /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/.test(
      sm,
    ),
  "sitemap valid",
);
ok(
  /^Sitemap: https:\/\/u\.github\.io\/r\/sitemap\.xml$/m.test(
    readFileSync(join(dist, "robots.txt"), "utf8"),
  ),
  "robots sitemap",
);
ok(
  !/(?:href|src)="\//.test(ah) && !/content="\//.test(ah),
  "site build no root paths",
);
ok(
  core(readFileSync(join(dist, "sw.js"), "utf8")).includes("./sitemap.xml"),
  "precache includes sitemap",
);
ok(runBuild("not a url").status !== 0, "invalid site fails");

if (fails) {
  console.error(fails + " failed");
  process.exit(1);
}
console.log("tests ok");
