import { TRAIL_CAP, TRAIL_LIFE, FIXED } from "./const.js";
import { clamp } from "./physics.js";
import { paintSphere, paintHalo } from "./ballpaint.js";

export function createBallDraw(G) {
  var ballGfx = {
    key: "",
    ice: null,
    fire: null,
    haloIce: null,
    haloFire: null,
    sz: 0,
    hz: 0,
    r: 7,
  };
  var visLast = 0;
  function makeOffscreen(px) {
    var c = document.createElement("canvas");
    c.width = px;
    c.height = px;
    return c;
  }
  function rebuildBallGfx() {
    var r = Math.max(5, G.BR || 7);
    var dpr = G.dpr;
    var key =
      dpr.toFixed(2) + "|" + r.toFixed(1) + "|" + (G.cfg.cb ? "1" : "0");
    if (ballGfx.key === key && ballGfx.ice) return;
    var bodyPx = Math.max(24, Math.ceil(r * 2.6 * dpr) * 2);
    var haloPx = Math.max(48, Math.ceil(r * 9 * dpr));
    ballGfx.ice = makeOffscreen(bodyPx);
    ballGfx.fire = makeOffscreen(bodyPx);
    ballGfx.haloIce = makeOffscreen(haloPx);
    ballGfx.haloFire = makeOffscreen(haloPx);
    paintSphere(ballGfx.ice, false, G.cfg.cb);
    paintSphere(ballGfx.fire, true, G.cfg.cb);
    paintHalo(ballGfx.haloIce, false, G.cfg.cb);
    paintHalo(ballGfx.haloFire, true, G.cfg.cb);
    ballGfx.key = key;
    ballGfx.sz = bodyPx;
    ballGfx.hz = haloPx;
    ballGfx.r = r;
  }
  function pruneTrail(tr) {
    if (!tr || !tr.n) return;
    var cut = G.physT - TRAIL_LIFE;
    while (tr.n > 0) {
      var oldest = (tr.i - tr.n + TRAIL_CAP) % TRAIL_CAP;
      if (tr.ts[oldest] >= cut) break;
      tr.n--;
    }
  }
  function sampleTrail(b, x, y) {
    var tr = b.trail;
    if (!tr) return;
    pruneTrail(tr);
    var last = tr.n ? (tr.i - 1 + TRAIL_CAP) % TRAIL_CAP : -1;
    if (last >= 0) {
      var lx = tr.xy[last * 2],
        ly = tr.xy[last * 2 + 1];
      var gap = Math.hypot(x - lx, y - ly);
      if (gap < 1.2) return;
      if (gap > b.r * 5.5) {
        tr.n = 0;
        tr.i = 0;
      }
    }
    tr.xy[tr.i * 2] = x;
    tr.xy[tr.i * 2 + 1] = y;
    tr.ts[tr.i] = G.physT;
    tr.i = (tr.i + 1) % TRAIL_CAP;
    if (tr.n < TRAIL_CAP) tr.n++;
  }
  function trailAlong(b, x0, y0, x1, y1) {
    var dx = x1 - x0,
      dy = y1 - y0;
    var dist = Math.hypot(dx, dy);
    var step = Math.max(2.4, b.r * 0.55);
    if (dist < 0.5) {
      sampleTrail(b, x1, y1);
      return;
    }
    var n = Math.min(12, Math.ceil(dist / step));
    for (var i = 1; i <= n; i++) {
      var t = i / n;
      sampleTrail(b, x0 + dx * t, y0 + dy * t);
    }
  }
  function drawTrail(ctx, b, hx, hy) {
    var tr = b.trail;
    if (!tr) return;
    pruneTrail(tr);
    if (tr.n < 2) return;
    var n = tr.n,
      cap = TRAIL_CAP,
      start = (tr.i - n + cap) % cap;
    var fire = b.fire,
      reduce = G.reduce,
      cfg = G.cfg,
      dpr = G.dpr;
    var headW = b.r * (reduce ? 0.42 : 0.85);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    var i, idx, x, y, nx, ny, ax, ay, len, t, w, first;
    ctx.beginPath();
    first = 1;
    for (i = 0; i < n; i++) {
      idx = (start + i) % cap;
      x = tr.xy[idx * 2];
      y = tr.xy[idx * 2 + 1];
      ax = i < n - 1 ? tr.xy[((start + i + 1) % cap) * 2] - x : hx - x;
      ay = i < n - 1 ? tr.xy[((start + i + 1) % cap) * 2 + 1] - y : hy - y;
      len = Math.hypot(ax, ay) || 1;
      nx = -ay / len;
      ny = ax / len;
      t = i / (n - 1);
      t = t * t;
      w = headW * t * t;
      if (first) {
        ctx.moveTo(x + nx * w, y + ny * w);
        first = 0;
      } else ctx.lineTo(x + nx * w, y + ny * w);
    }
    ctx.lineTo(hx, hy);
    for (i = n - 1; i >= 0; i--) {
      idx = (start + i) % cap;
      x = tr.xy[idx * 2];
      y = tr.xy[idx * 2 + 1];
      ax = i < n - 1 ? tr.xy[((start + i + 1) % cap) * 2] - x : hx - x;
      ay = i < n - 1 ? tr.xy[((start + i + 1) % cap) * 2 + 1] - y : hy - y;
      len = Math.hypot(ax, ay) || 1;
      nx = -ay / len;
      ny = ax / len;
      t = i / (n - 1);
      t = t * t;
      w = headW * t * t;
      ctx.lineTo(x - nx * w, y - ny * w);
    }
    ctx.closePath();
    ctx.fillStyle = fire
      ? reduce
        ? "rgba(255,180,60,.18)"
        : "rgba(255,160,40,.28)"
      : reduce
        ? "rgba(80,220,255,.14)"
        : cfg.cb
          ? "rgba(86,180,233,.26)"
          : "rgba(70,240,255,.28)";
    ctx.fill();
    if (!reduce) {
      ctx.beginPath();
      first = 1;
      var coreW = headW * 0.38;
      for (i = Math.max(0, n - 10); i < n; i++) {
        idx = (start + i) % cap;
        x = tr.xy[idx * 2];
        y = tr.xy[idx * 2 + 1];
        ax = i < n - 1 ? tr.xy[((start + i + 1) % cap) * 2] - x : hx - x;
        ay = i < n - 1 ? tr.xy[((start + i + 1) % cap) * 2 + 1] - y : hy - y;
        len = Math.hypot(ax, ay) || 1;
        nx = -ay / len;
        ny = ax / len;
        t = (i - Math.max(0, n - 10)) / Math.max(1, Math.min(9, n - 1));
        if (t < 0) t = 0;
        if (t > 1) t = 1;
        w = coreW * t * t;
        if (first) {
          ctx.moveTo(x + nx * w, y + ny * w);
          first = 0;
        } else ctx.lineTo(x + nx * w, y + ny * w);
      }
      ctx.lineTo(hx, hy);
      for (i = n - 1; i >= Math.max(0, n - 10); i--) {
        idx = (start + i) % cap;
        x = tr.xy[idx * 2];
        y = tr.xy[idx * 2 + 1];
        ax = i < n - 1 ? tr.xy[((start + i + 1) % cap) * 2] - x : hx - x;
        ay = i < n - 1 ? tr.xy[((start + i + 1) % cap) * 2 + 1] - y : hy - y;
        len = Math.hypot(ax, ay) || 1;
        nx = -ay / len;
        ny = ax / len;
        t = (i - Math.max(0, n - 10)) / Math.max(1, Math.min(9, n - 1));
        if (t < 0) t = 0;
        if (t > 1) t = 1;
        w = coreW * t * t;
        ctx.lineTo(x - nx * w, y - ny * w);
      }
      ctx.closePath();
      ctx.fillStyle = fire ? "rgba(255,240,180,.45)" : "rgba(230,255,255,.4)";
      ctx.fill();
      var ghosts = 4;
      var spr = fire ? ballGfx.fire : ballGfx.ice;
      if (spr) {
        var hw = ballGfx.sz / dpr;
        for (var gi2 = 0; gi2 < ghosts; gi2++) {
          var gi = n - 2 - gi2 * Math.max(1, (n / 8) | 0);
          if (gi < 0) break;
          idx = (start + gi) % cap;
          var ga = 0.16 * (1 - gi2 / ghosts);
          var gs = 0.72 - gi2 * 0.12;
          ctx.globalAlpha = ga;
          ctx.drawImage(
            spr,
            tr.xy[idx * 2] - hw * gs * 0.5,
            tr.xy[idx * 2 + 1] - hw * gs * 0.5,
            hw * gs,
            hw * gs,
          );
        }
      }
      ctx.globalAlpha = 1;
      if ((n & 1) === 0) {
        idx = start;
        G.shedEmber(tr.xy[idx * 2], tr.xy[idx * 2 + 1], b.vx, b.vy, fire);
      }
    }
    ctx.restore();
  }
  function drawBalls(ctx, alpha) {
    rebuildBallGfx();
    var now = G.physT;
    var dt = visLast ? Math.min(0.05, now - visLast) : FIXED;
    visLast = now;
    if (!G.reduce) G.stepEmbers(dt);
    var ice = ballGfx.ice,
      fireSpr = ballGfx.fire,
      haloI = ballGfx.haloIce,
      haloF = ballGfx.haloFire;
    var dpr = G.dpr || 1;
    var bodyW = ballGfx.sz / dpr,
      haloW = ballGfx.hz / dpr;
    var balls = G.balls,
      py = G.py,
      reduce = G.reduce;
    for (var j = 0; j < balls.length; j++) {
      var b = balls[j];
      var dx = b.px + (b.x - b.px) * (alpha || 0);
      var dy = b.py + (b.y - b.py) * (alpha || 0);
      if (b.stuck) {
        dx = b.x;
        dy = b.y;
      }
      var mag = Math.hypot(b.vx, b.vy);
      if (!b.stuck) {
        var dir = b.vx >= 0 ? 1 : -1;
        b.spinVel = (b.spinVel || 0) * Math.exp(-dt * 3.2);
        b.spin =
          (b.spin || 0) +
          dir * ((mag / Math.max(1, b.r)) * dt + (b.spinVel || 0) * dt);
      }
      if (!b.stuck) drawTrail(ctx, b, dx, dy);
      var spr = b.fire ? fireSpr : ice;
      var halo = b.fire ? haloF : haloI;
      var sq = b.sq || 0;
      var stretch = 1,
        squash = 1;
      if (!reduce && !b.stuck && mag > 40) {
        stretch = 1 + Math.min(0.18, mag / 4200);
        squash = 1 / stretch;
      }
      stretch *= 1 + sq * 0.35;
      squash *= 1 - sq * 0.28;
      var ang = !reduce && !b.stuck && mag > 8 ? Math.atan2(b.vy, b.vx) : 0;
      ctx.save();
      ctx.translate(dx, dy);
      if (!reduce && py - dy < 64 && dy < py + 8) {
        ctx.globalAlpha = clamp(1 - (py - dy) / 64, 0, 1) * 0.22;
        ctx.fillStyle = b.fire ? "rgba(255,140,40,.5)" : "rgba(0,220,255,.45)";
        ctx.beginPath();
        ctx.ellipse
          ? ctx.ellipse(0, py - dy + 4, b.r * 1.1, 3.2, 0, 0, 6.283)
          : ctx.arc(0, py - dy + 4, b.r, 0, 6.283);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      var showHalo = halo && G.cfg.bloom && G.quality >= 0.7;
      if (showHalo && !reduce) {
        var pulse =
          0.92 + Math.min(0.18, mag / 3800) + Math.sin(G.physT * 9 + j) * 0.04;
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.85 * pulse;
        ctx.drawImage(
          halo,
          -haloW * 0.5 * pulse,
          -haloW * 0.5 * pulse,
          haloW * pulse,
          haloW * pulse,
        );
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      } else if (showHalo && reduce) {
        ctx.globalAlpha = 0.35;
        ctx.drawImage(
          halo,
          -haloW * 0.28,
          -haloW * 0.28,
          haloW * 0.56,
          haloW * 0.56,
        );
        ctx.globalAlpha = 1;
      }
      ctx.rotate(ang);
      ctx.scale(stretch, squash);
      ctx.rotate(-ang);
      if (spr) ctx.drawImage(spr, -bodyW * 0.5, -bodyW * 0.5, bodyW, bodyW);
      if (!reduce) {
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = b.fire
          ? "rgba(255,220,140,.55)"
          : "rgba(180,255,255,.5)";
        ctx.lineWidth = 1.15;
        var sp = b.spin || 0;
        ctx.beginPath();
        ctx.ellipse
          ? ctx.ellipse(0, 0, b.r * 0.72, b.r * 0.28, sp, 0.2, 2.6)
          : ctx.arc(0, 0, b.r * 0.55, sp, sp + 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse
          ? ctx.ellipse(0, 0, b.r * 0.58, b.r * 0.22, sp + 2.1, 3.4, 5.6)
          : ctx.arc(0, 0, b.r * 0.4, sp + 2, sp + 4);
        ctx.stroke();
        if (b.fire) {
          ctx.globalAlpha = 0.45 + Math.sin(G.physT * 28 + j) * 0.2;
          ctx.fillStyle = "#fff3c0";
          ctx.beginPath();
          ctx.arc(-b.r * 0.08, -b.r * 0.1, b.r * 0.22, 0, 6.283);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.restore();
    }
    G.fx.drawEmbers(ctx);
  }
  return {
    rebuildBallGfx: rebuildBallGfx,
    pruneTrail: pruneTrail,
    sampleTrail: sampleTrail,
    trailAlong: trailAlong,
    drawTrail: drawTrail,
    drawBalls: drawBalls,
    ballGfx: ballGfx,
  };
}
