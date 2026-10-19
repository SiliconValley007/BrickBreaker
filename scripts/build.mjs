import { createHash } from "crypto";
import {
  cpSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  rmSync,
  statSync,
} from "fs";
import { join, dirname, relative, sep } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const STATIC = [
  "index.html",
  "style.css",
  "sw.js",
  "manifest.webmanifest",
  "icon.svg",
  "favicon.ico",
  "og.png",
];

export function normalizeSiteUrl(raw) {
  var value = String(raw || "").trim();
  if (!value) return "";
  if (!/^https?:\/\//i.test(value)) value = "https://" + value;
  var url;
  try {
    url = new URL(value);
  } catch (e) {
    throw new Error("invalid SITE_URL: " + raw);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new Error("SITE_URL must be http(s)");
  return url.origin + url.pathname.replace(/\/+/g, "/").replace(/\/+$/, "");
}

export function resolveSiteUrl(rootDir, env) {
  var cname = join(rootDir, "CNAME");
  if (existsSync(cname)) {
    var host = readFileSync(cname, "utf8").split(/\r?\n/)[0].trim();
    if (host) return normalizeSiteUrl(host);
  }
  return normalizeSiteUrl((env && env.SITE_URL) || "");
}

function audit(html, robots, sitemap, site, manifest) {
  var tags = [
    ["canonical", /<link rel="canonical" href="([^"]*)"/],
    ["og:url", /<meta property="og:url" content="([^"]*)"/],
    ["og:image", /<meta property="og:image" content="([^"]*)"/],
    ["twitter:image", /<meta name="twitter:image" content="([^"]*)"/],
  ];
  var rootAbsolute =
    /(?:href|src)="\//.test(html) ||
    /content="\//.test(html) ||
    /url\(\//.test(html) ||
    /"(?:start_url|scope|id|src)":\s*"\//.test(manifest);
  if (rootAbsolute) throw new Error("absolute root path found in dist");
  for (var i = 0; i < tags.length; i++) {
    var match = tags[i][1].exec(html);
    if (site) {
      if (!match)
        throw new Error("SITE_URL set but " + tags[i][0] + " is missing");
      if (!/^https?:\/\//.test(match[1]))
        throw new Error(tags[i][0] + " is relative with SITE_URL set");
    } else if (match) throw new Error(tags[i][0] + " emitted without SITE_URL");
  }
  if (site) {
    if (!sitemap) throw new Error("SITE_URL set but sitemap.xml is missing");
    var loc = /<loc>([^<]+)<\/loc>/.exec(sitemap);
    if (!loc || !/^https?:\/\//.test(loc[1]) || !loc[1].endsWith("/"))
      throw new Error("sitemap loc must be absolute with trailing slash");
    if (!new RegExp("^Sitemap: https?://", "m").test(robots))
      throw new Error("robots.txt Sitemap line is not absolute");
  } else {
    if (sitemap || robots)
      throw new Error("SEO files emitted without SITE_URL");
  }
}

export function build(opts) {
  var env = (opts && opts.env) || process.env;
  var site = resolveSiteUrl(root, env);
  if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });
  mkdirSync(join(dist, "js"), { recursive: true });
  STATIC.forEach(function (f) {
    cpSync(join(root, f), join(dist, f));
  });
  cpSync(join(root, "icons"), join(dist, "icons"), { recursive: true });
  readdirSync(join(root, "js"))
    .filter(function (f) {
      return f.endsWith(".js");
    })
    .forEach(function (f) {
      cpSync(join(root, "js", f), join(dist, "js", f));
    });

  var htmlPath = join(dist, "index.html");
  var html = readFileSync(htmlPath, "utf8");
  if (!html.includes("<!--seo-->"))
    throw new Error("index.html SEO marker missing");
  var tags = site
    ? [
        '<link rel="canonical" href="' + site + '/" />',
        '<meta property="og:url" content="' + site + '/" />',
        '<meta property="og:image" content="' + site + '/og.png" />',
        '<meta name="twitter:image" content="' + site + '/og.png" />',
      ].join("\n    ")
    : "";
  html = html.replace("<!--seo-->", tags);
  writeFileSync(htmlPath, html);

  var robots = "";
  var sitemap = "";
  if (site) {
    robots = "User-agent: *\nAllow: /\nSitemap: " + site + "/sitemap.xml\n";
    sitemap =
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>' +
      site +
      "/</loc>\n  </url>\n</urlset>\n";
    writeFileSync(join(dist, "sitemap.xml"), sitemap);
    writeFileSync(join(dist, "robots.txt"), robots);
  }

  var manifestPath = join(dist, "manifest.webmanifest");
  var manifest = readFileSync(manifestPath, "utf8");
  audit(html, robots, sitemap, site, manifest);

  function walk(dir) {
    var out = [];
    readdirSync(dir).forEach(function (name) {
      var p = join(dir, name);
      if (statSync(p).isDirectory()) out = out.concat(walk(p));
      else out.push(relative(dist, p).split(sep).join("/"));
    });
    return out;
  }
  var files = walk(dist).sort();
  var precache = ["./"].concat(
    files
      .filter(function (f) {
        return f !== "sw.js";
      })
      .map(function (f) {
        return "./" + f;
      }),
  );
  var hasher = createHash("sha256");
  hasher.update(precache.join("\n"));
  files.forEach(function (f) {
    if (f === "sw.js") return;
    hasher.update(f);
    hasher.update(readFileSync(join(dist, f)));
  });
  var ver = "nb-" + hasher.digest("hex").slice(0, 12);

  var swPath = join(dist, "sw.js");
  var sw = readFileSync(swPath, "utf8");
  if (!sw.includes("__BUILD__") || !sw.includes("__PRECACHE__"))
    throw new Error("sw.js placeholders missing");
  sw = sw
    .replace(
      "const CORE = /*__PRECACHE__*/[];",
      "const CORE = " + JSON.stringify(precache) + ";",
    )
    .replace(/__BUILD__/g, ver);
  writeFileSync(swPath, sw);

  var constPath = join(dist, "js", "const.js");
  writeFileSync(
    constPath,
    readFileSync(constPath, "utf8").replace(
      /export var APP_VER = "[^"]+"/,
      'export var APP_VER = "' + ver + '"',
    ),
  );
  writeFileSync(
    htmlPath,
    readFileSync(htmlPath, "utf8").replace(
      /id="appVer">[^<]*/,
      'id="appVer">' + ver,
    ),
  );

  console.log(
    "built dist VER=" +
      ver +
      " precache=" +
      precache.length +
      (site ? " site=" + site : " site=relative"),
  );
  return { ver: ver, site: site, files: files };
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  try {
    build();
  } catch (e) {
    console.error("build failed: " + (e && e.message ? e.message : e));
    process.exit(1);
  }
}
