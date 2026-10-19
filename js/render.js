import { MAX_STARS, PU, STATE } from "./const.js";
import { worldOf } from "./levels.js";
import { drawBoss } from "./boss.js";

export function createRender(G) {
  var stars = new Array(MAX_STARS);
  var bgKey = "",
    bgCanvas = null;
  var vignetteKey = "",
    vignetteCanvas = null;
  var paddleGrads = new Map();
  var glowSprites = new Map();
  var i;
  for (i = 0; i < MAX_STARS; i++) {
    stars[i] = {
      x: Math.random(),
      y: Math.random(),
      z: 0.25 + Math.random() * 0.75,
      s: Math.random(),
    }; // cosmetic
  }

  function invalidate() {
    bgKey = "";
    vignetteKey = "";
    paddleGrads.clear();
  }
  function makeCanvas(w, h) {
    var c = document.createElement("canvas");
    c.width = Math.max(1, w | 0);
    c.height = Math.max(1, h | 0);
    return c;
  }
  function background() {
    var world = worldOf(G.level);
    var boss = !!G.boss;
    var key =
      G.W +
      "|" +
      G.H +
      "|" +
      G.dpr +
      "|" +
      (world ? world.id : 0) +
      "|" +
      (boss ? 1 : 0);
    if (key === bgKey && bgCanvas) return bgCanvas;
    bgKey = key;
    var bg = world && world.bg ? world.bg : [5, 6, 15];
    var c = makeCanvas(G.W * G.dpr, G.H * G.dpr);
    var g = c.getContext("2d");
    g.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    g.fillStyle = "rgb(" + bg[0] + "," + bg[1] + "," + bg[2] + ")";
    g.fillRect(0, 0, G.W, G.H);
    var rg = g.createRadialGradient(
      G.W * 0.5,
      G.H * 0.18,
      20,
      G.W * 0.5,
      G.H * 0.5,
      Math.max(G.W, G.H) * 0.85,
    );
    rg.addColorStop(
      0,
      boss
        ? "rgba(140,0,90,.24)"
        : (world && world.glow) || "rgba(0,80,140,.22)",
    );
    rg.addColorStop(0.45, "rgba(90,0,90,.12)");
    rg.addColorStop(1, "rgba(" + bg[0] + "," + bg[1] + "," + bg[2] + ",1)");
    g.fillStyle = rg;
    g.fillRect(0, 0, G.W, G.H);
    bgCanvas = c;
    return c;
  }
  function vignette() {
    var key = G.W + "|" + G.H + "|" + G.dpr;
    if (key === vignetteKey && vignetteCanvas) return vignetteCanvas;
    vignetteKey = key;
    var c = makeCanvas(G.W * G.dpr, G.H * G.dpr);
    var g = c.getContext("2d");
    g.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    var vg = g.createRadialGradient(
      G.W * 0.5,
      G.H * 0.5,
      G.H * 0.2,
      G.W * 0.5,
      G.H * 0.5,
      Math.max(G.W, G.H) * 0.72,
    );
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,.38)");
    g.fillStyle = vg;
    g.fillRect(0, 0, G.W, G.H);
    vignetteCanvas = c;
    return c;
  }
  function rgb(hex) {
    if (hex.charAt(0) !== "#") return "255,255,255";
    var h = hex.slice(1);
    if (h.length === 3)
      h =
        h.charAt(0) +
        h.charAt(0) +
        h.charAt(1) +
        h.charAt(1) +
        h.charAt(2) +
        h.charAt(2);
    var n = parseInt(h, 16);
    return ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255);
  }
  function glow(color) {
    var s = glowSprites.get(color);
    if (s) return s;
    s = makeCanvas(64, 64);
    var g = s.getContext("2d");
    var rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, "rgba(" + rgb(color) + ",.75)");
    rg.addColorStop(0.35, "rgba(" + rgb(color) + ",.22)");
    rg.addColorStop(1, "rgba(" + rgb(color) + ",0)");
    g.fillStyle = rg;
    g.fillRect(0, 0, 64, 64);
    glowSprites.set(color, s);
    return s;
  }
  function drawGlow(ctx, x, y, w, h, color, alpha) {
    if (G.reduce || !G.cfg.bloom || G.quality < 0.7) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha;
    ctx.drawImage(glow(color), x - w * 0.5, y - h * 0.5, w, h);
    ctx.restore();
  }
  function drawPaddle(ctx) {
    var sq = 1 + G.psq * 0.5;
    var h = G.ph * (1 - G.psq * 0.4);
    var w = G.pw * sq;
    var x = G.px - (w - G.pw) * 0.5;
    var y = G.py + (G.ph - h) * 0.5;
    drawGlow(
      ctx,
      x + w * 0.5,
      y + h * 0.5,
      w * 1.8,
      h * 5,
      G.cfg.cb ? "#56b4e9" : "#00f0ff",
      0.5,
    );
    var key = Math.round(w) + "|" + Math.round(h);
    var pg = paddleGrads.get(key);
    if (!pg) {
      pg = ctx.createLinearGradient(0, 0, w, 0);
      pg.addColorStop(0, "#ff2bd6");
      pg.addColorStop(0.5, "#fff");
      pg.addColorStop(1, "#00f0ff");
      paddleGrads.set(key, pg);
    }
    ctx.save();
    ctx.translate(x, y);
    var rr = Math.min(h * 0.5, w * 0.5, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(rr, 0);
    ctx.arcTo(w, 0, w, h, rr);
    ctx.arcTo(w, h, 0, h, rr);
    ctx.arcTo(0, h, 0, 0, rr);
    ctx.arcTo(0, 0, w, 0, rr);
    ctx.closePath();
    ctx.fillStyle = pg;
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.35)";
    ctx.fillRect(8, 2, w - 16, 3);
    if (G.puTimer.l > 0) {
      ctx.fillStyle = "#ff2bd6";
      ctx.fillRect(6, -4, 10, 5);
      ctx.fillRect(w - 16, -4, 10, 5);
    }
    ctx.restore();
  }
  function drawShotsDrops(ctx) {
    var i, s, d, pu;
    for (i = 0; i < G.ent.shots.length; i++) {
      s = G.ent.shots[i];
      if (!s.a) continue;
      ctx.fillStyle = s.en ? "#ffd166" : "#ff2bd6";
      ctx.fillRect(s.x - 1.5, s.y, 3, s.en ? 10 : 12);
    }
    for (i = 0; i < G.ent.drops.length; i++) {
      d = G.ent.drops[i];
      if (!d.a) continue;
      pu = PU[d.i];
      var rr = 6,
        x = d.x - 13,
        y = d.y - 10,
        w = 26,
        h = 20;
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
      ctx.fillStyle = pu.c;
      ctx.fill();
      ctx.fillStyle = "#041018";
      ctx.font = "800 9px ui-sans-serif,system-ui,sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pu.t, d.x, d.y + 3);
    }
  }
  function draw(ctx, alpha) {
    ctx.fillStyle = "#05060f";
    ctx.fillRect(0, 0, G.W, G.H);
    ctx.drawImage(background(), 0, 0, G.W, G.H);

    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#9ff";
    for (i = 0; i < MAX_STARS; i++) {
      var s = stars[i];
      s.y += s.z * 0.00018 * (G.state === STATE.PLAY ? 1 : 0.35);
      if (s.y > 1) s.y -= 1;
      if (s.s > 0.6) ctx.fillRect(s.x * G.W, s.y * G.H, s.z * 1.6, s.z * 1.6);
    }
    ctx.fillStyle = "#68a";
    for (i = 0; i < MAX_STARS; i++) {
      var q = stars[i];
      if (q.s > 0.6) continue;
      ctx.fillRect(q.x * G.W, q.y * G.H, q.z * 1.6, q.z * 1.6);
    }
    ctx.restore();

    var sh = G.cfg.shake && !G.reduce ? G.shake : 0;
    var ox = sh ? (Math.random() - 0.5) * 12 * sh : 0; // cosmetic
    var oy = sh ? (Math.random() - 0.5) * 12 * sh : 0; // cosmetic
    ctx.save();
    ctx.translate(ox, oy);

    if (G.state !== STATE.TITLE) {
      G.drawBricks(ctx);
      if (G.boss) {
        drawGlow(
          ctx,
          G.boss.x + G.boss.w * 0.5,
          G.boss.y + G.boss.h * 0.5,
          G.boss.w * 1.5,
          G.boss.h * 6,
          G.boss.c0,
          0.55,
        );
      }
      drawBoss(ctx, G);
      drawPaddle(ctx);
      G.drawBalls(ctx, alpha);
      drawShotsDrops(ctx);
    }
    ctx.restore();

    G.fx.drawParticles(ctx);
    G.fx.drawRings(ctx);
    if (G.flash > 0) {
      ctx.fillStyle = "rgba(255,43,214," + G.flash * 0.22 + ")";
      ctx.fillRect(0, 0, G.W, G.H);
    }
    drawBloom(ctx);
    ctx.drawImage(vignette(), 0, 0, G.W, G.H);
    if (G.state === STATE.PLAY && !G.launched()) {
      ctx.fillStyle = "rgba(244,247,255,.72)";
      ctx.font = "600 13px ui-sans-serif,system-ui,sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        G.touchMode ? "TAP TO LAUNCH" : "CLICK / TAP / SPACE TO LAUNCH",
        G.W * 0.5,
        G.py - 30,
      );
    }
    if (G.introT > 0 && G.state === STATE.PLAY) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, G.introT);
      ctx.fillStyle = "rgba(0,240,255,.9)";
      ctx.font = "800 22px ui-sans-serif,system-ui,sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        G.boss
          ? "BOSS WAVE"
          : ((worldOf(G.level) && worldOf(G.level).n) || "LEVEL") +
              " " +
              G.level,
        G.W * 0.5,
        G.gridY - 8,
      );
      ctx.restore();
    }
  }
  function drawBloom(ctx) {
    if (!G.cfg.bloom || G.reduce || G.quality < 0.7) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.08 * G.quality;
    ctx.fillStyle = G.boss ? "#ff2bd6" : "#00f0ff";
    ctx.fillRect(0, 0, G.W, G.H * 0.08);
    ctx.restore();
    if (G.cfg.chroma && G.quality > 0.8) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.04;
      ctx.fillStyle = "#ff2bd6";
      ctx.fillRect(1, 0, G.W, G.H);
      ctx.fillStyle = "#00f0ff";
      ctx.fillRect(-1, 0, G.W, G.H);
      ctx.restore();
    }
  }
  return { draw: draw, invalidate: invalidate };
}
