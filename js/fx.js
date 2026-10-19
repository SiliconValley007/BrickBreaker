import { MAX_P, MAX_SPARK, MAX_EMBER, MAX_RING } from "./const.js";

export function createFX(G) {
  var particles = new Array(MAX_P),
    pHead = 0;
  var sparks = new Array(MAX_SPARK),
    sHead = 0;
  var embers = new Array(MAX_EMBER),
    emberH = 0;
  var rings = new Array(MAX_RING),
    rHead = 0;
  var groups = new Map(),
    colors = [];
  var i;
  for (i = 0; i < MAX_P; i++)
    particles[i] = {
      a: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      l: 0,
      m: 1,
      s: 1,
      c: "#fff",
    };
  for (i = 0; i < MAX_SPARK; i++)
    sparks[i] = { a: 0, x: 0, y: 0, vx: 0, vy: 0, l: 0, m: 1 };
  for (i = 0; i < MAX_EMBER; i++)
    embers[i] = {
      a: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      l: 0,
      m: 1,
      s: 1,
      c: "#7af7ff",
    };
  for (i = 0; i < MAX_RING; i++)
    rings[i] = { a: 0, x: 0, y: 0, r: 6, l: 0.4, m: 0.4, c: "#fff" };

  function qualityScale() {
    return G.reduce
      ? 0.4
      : 0.55 + (G.quality == null ? 0.45 : G.quality * 0.45);
  }
  function burst(x, y, col, n, spd) {
    n = Math.ceil(n * qualityScale());
    for (var i = 0; i < n; i++) {
      var p = particles[pHead++ % MAX_P];
      var a = Math.random() * Math.PI * 2, // cosmetic
        sp = (spd || 200) * (0.3 + Math.random()); // cosmetic
      p.a = 1;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp - 40;
      p.l = 0.28 + Math.random() * 0.45; // cosmetic
      p.m = p.l;
      p.s = 1.4 + Math.random() * 2.6; // cosmetic
      p.c = col; // cosmetic
    }
  }
  function spark(x, y, nx, ny) {
    var n = Math.ceil((G.reduce ? 2 : 6) * qualityScale() * 1.6);
    for (var i = 0; i < n; i++) {
      var p = sparks[sHead++ % MAX_SPARK];
      p.a = 1;
      p.x = x;
      p.y = y;
      p.vx = nx * (80 + Math.random() * 160) + (Math.random() - 0.5) * 80; // cosmetic
      p.vy = ny * (80 + Math.random() * 160) + (Math.random() - 0.5) * 80; // cosmetic
      p.l = 0.12 + Math.random() * 0.18; // cosmetic
      p.m = p.l; // cosmetic
    }
  }
  function ring(x, y, col, r) {
    if (G.reduce || (G.quality != null && G.quality < 0.55)) return;
    var o = rings[rHead++ % MAX_RING];
    o.a = 1;
    o.x = x;
    o.y = y;
    o.r = r || 6;
    o.l = 0.4;
    o.m = 0.4;
    o.c = col;
  }
  function shedEmber(x, y, vx, vy, fire) {
    if (G.reduce || (G.quality != null && G.quality < 0.6)) return;
    var e = embers[emberH++ % MAX_EMBER];
    e.a = 1;
    e.x = x;
    e.y = y;
    e.vx = -vx * 0.12 + (Math.random() - 0.5) * 28; // cosmetic
    e.vy = -vy * 0.12 + (Math.random() - 0.5) * 28; // cosmetic
    e.l = 0.08 + Math.random() * 0.1; // cosmetic
    e.m = e.l;
    e.s = 0.7 + Math.random() * 1.4; // cosmetic
    e.c = fire
      ? G.cfg.cb
        ? "#e69f00"
        : "#ffb347"
      : G.cfg.cb
        ? "#56b4e9"
        : "#7af7ff";
  }
  function stepEmbers(dt) {
    for (var i = 0; i < MAX_EMBER; i++) {
      var e = embers[i];
      if (!e.a) continue;
      e.l -= dt;
      if (e.l <= 0) {
        e.a = 0;
        continue;
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vx *= 0.96;
      e.vy *= 0.96;
    }
  }
  function stepFX(t) {
    if (G.comboT > 0) {
      G.comboT -= t;
      if (G.comboT <= 0 && G.comboEl) G.comboEl.classList.remove("show");
    }
    if (G.shake > 0) G.shake = Math.max(0, G.shake - t * 2.4);
    if (G.flash > 0) G.flash = Math.max(0, G.flash - t * 3);
    if (G.psq > 0) G.psq = Math.max(0, G.psq - t * 2.2);
    if (G.introT > 0) G.introT = Math.max(0, G.introT - t);
    if (G.reduce) return;
    var i, p;
    for (i = 0; i < MAX_P; i++) {
      p = particles[i];
      if (!p.a) continue;
      p.l -= t;
      if (p.l <= 0) {
        p.a = 0;
        continue;
      }
      p.vy += 520 * t;
      p.x += p.vx * t;
      p.y += p.vy * t;
      p.vx *= 0.992;
    }
    for (i = 0; i < MAX_SPARK; i++) {
      p = sparks[i];
      if (!p.a) continue;
      p.l -= t;
      if (p.l <= 0) {
        p.a = 0;
        continue;
      }
      p.x += p.vx * t;
      p.y += p.vy * t;
    }
    for (i = 0; i < MAX_RING; i++) {
      var r = rings[i];
      if (!r.a) continue;
      r.l -= t;
      if (r.l <= 0) r.a = 0;
    }
  }
  function groupFor(color) {
    var g = groups.get(color);
    if (!g) {
      g = [new Array(12), new Array(12), new Array(12), new Array(12)];
      for (var k = 0; k < 4; k++) g[k].length = 0;
      groups.set(color, g);
      colors.push(color);
    }
    return g;
  }
  function resetGroups() {
    for (var c = 0; c < colors.length; c++) {
      var g = groups.get(colors[c]);
      for (var k = 0; k < 4; k++) g[k].length = 0;
    }
  }
  function drawGroups(ctx) {
    for (var c = 0; c < colors.length; c++) {
      var buckets = groups.get(colors[c]);
      ctx.fillStyle = colors[c];
      for (var b = 0; b < 4; b++) {
        var arr = buckets[b];
        if (!arr.length) continue;
        ctx.globalAlpha = (b + 0.5) / 4;
        for (var j = 0; j < arr.length; j++) {
          var q = arr[j];
          ctx.fillRect(q.x, q.y, q.s || 2, q.s || 2);
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }
  function drawParticles(ctx) {
    if (G.reduce) return;
    resetGroups();
    var i, p, g, bucket;
    for (i = 0; i < MAX_P; i++) {
      p = particles[i];
      if (!p.a) continue;
      g = groupFor(p.c);
      bucket = Math.min(3, Math.max(0, ((p.l / p.m) * 4) | 0));
      g[bucket].push(p);
    }
    for (i = 0; i < MAX_SPARK; i++) {
      p = sparks[i];
      if (!p.a) continue;
      g = groupFor("#ffffff");
      bucket = Math.min(3, Math.max(0, ((p.l / p.m) * 4) | 0));
      g[bucket].push(p);
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    drawGroups(ctx);
  }
  function drawRings(ctx) {
    if (G.reduce) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < MAX_RING; i++) {
      var r = rings[i];
      if (!r.a) continue;
      ctx.globalAlpha = Math.max(0, r.l / r.m) * 0.7;
      ctx.strokeStyle = r.c;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r + (1 - r.l / r.m) * 40, 0, 6.283);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }
  function drawEmbers(ctx) {
    if (G.reduce) return;
    resetGroups();
    for (var i = 0; i < MAX_EMBER; i++) {
      var e = embers[i];
      if (!e.a) continue;
      var g = groupFor(e.c);
      var bucket = Math.min(3, Math.max(0, ((e.l / e.m) * 4) | 0));
      g[bucket].push(e);
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    drawGroups(ctx);
  }
  return {
    particles: particles,
    sparks: sparks,
    rings: rings,
    embers: embers,
    burst: burst,
    spark: spark,
    ring: ring,
    shedEmber: shedEmber,
    stepEmbers: stepEmbers,
    stepFX: stepFX,
    drawParticles: drawParticles,
    drawRings: drawRings,
    drawEmbers: drawEmbers,
  };
}
