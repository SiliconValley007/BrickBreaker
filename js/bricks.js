import { PATTERNS } from "./levels.js";
import { PU, mixSeed, mulberry32 } from "./const.js";
import { clamp } from "./physics.js";

export function createBricks(G) {
  var fillGroups = new Map(),
    fillColors = [];
  function groupFor(color) {
    var a = fillGroups.get(color);
    if (!a) {
      a = [];
      fillGroups.set(color, a);
      fillColors.push(color);
    }
    return a;
  }
  function rectPath(ctx, x, y, w, h, r) {
    var rr = Math.min(r, w * 0.5, h * 0.5);
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
  function addBrick(c, r, x, y, w, h, hp, type, pal) {
    pal = pal || G.PAL[(r + c) % G.PAL.length];
    var roll = G.rng();
    var b = {
      c: c,
      r: r,
      x: x,
      y: y,
      w: w,
      h: h,
      hx: x + w * 0.5,
      hy: y + h * 0.5,
      hp: hp,
      max: hp,
      t0: hp,
      alive: 1,
      type: type,
      regen: type === "r" ? 6 : 0,
      vx: type === "m" ? (roll < 0.5 ? -1 : 1) * 46 : 0,
      c0:
        type === "u"
          ? "#5a6485"
          : type === "e"
            ? "#ff6b4a"
            : type === "r"
              ? "#5ef0d0"
              : type === "m"
                ? "#c77dff"
                : pal[0],
      c1:
        type === "u"
          ? "#2a3045"
          : type === "e"
            ? "#8a2814"
            : type === "r"
              ? "#1a7a68"
              : type === "m"
                ? "#5a2a88"
                : pal[1],
    };
    G.bricks.push(b);
    if (type !== "u") G.bCount++;
    if (type === "m") G.moving.push(b);
    return b;
  }
  function makeBricks() {
    var bricks = G.bricks,
      moving = G.moving;
    bricks.length = 0;
    moving.length = 0;
    G.boss = null;
    G.bCount = 0;
    var level = G.level;
    var pat =
      !G.levelSeed && level <= PATTERNS.length ? PATTERNS[level - 1] : null;
    var isBoss = level % 5 === 0;
    var hpBase = 1 + (level > 5 ? 1 : 0) + (level > 9 ? 1 : 0);
    if (level > PATTERNS.length) {
      var extra = Math.floor((level - PATTERNS.length) / 2);
      hpBase += Math.min(2, extra);
    }
    var startY = G.gridY;
    G.brickBottom = G.gridY;
    var W = G.W,
      playL = G.playL,
      playR = G.playR,
      py = G.py,
      BR = G.BR,
      gap = G.gap,
      bw = G.bw,
      bh = G.bh;
    var PAL = G.PAL;
    if (pat) {
      var pr = pat.length,
        pc = pat[0].length;
      var cellW = (W - playL - playR) / Math.max(pc, 1);
      var cellH = Math.min(
        bh + gap,
        (py - BR * 4 - G.gridY) / Math.max(pr + (isBoss ? 2 : 0), 1),
      );
      bw = Math.max(4, cellW - gap);
      bh = Math.max(5, cellH - gap);
      G.bw = bw;
      G.bh = bh;
      var left = playL + (W - playL - playR - pc * cellW) / 2;
      for (var r = 0; r < pr; r++) {
        for (var c = 0; c < pc; c++) {
          var ch = pat[r].charAt(c);
          if (ch === ".") continue;
          var type = "b",
            hp = hpBase;
          if (ch === "X") hp = hpBase + 1;
          if (ch === "U") type = "u";
          if (ch === "E") {
            if (level < 4) {
              type = "b";
              hp = hpBase;
            } else {
              type = "e";
              hp = 1;
            }
          }
          if (ch === "M") {
            type = "m";
            hp = 2;
          }
          if (ch === "R") {
            type = "r";
            hp = 2;
          }
          addBrick(
            c,
            r,
            left + c * cellW,
            startY + r * cellH,
            bw,
            bh,
            hp,
            type,
          );
        }
      }
      G.brickBottom = startY + pr * cellH;
    } else {
      var seed = G.levelSeed || mixSeed(G.runSeed || 0, level, 1);
      var rnd = mulberry32(seed);
      var pr2 = Math.min(G.rows, isBoss ? 4 : G.rows);
      var pc2 = G.cols;
      for (var rr = 0; rr < pr2; rr++) {
        var pal = PAL[rr % PAL.length];
        for (var cc = 0; cc < pc2; cc++) {
          if (rnd() < 0.12) continue;
          var type2 = "b",
            h = hpBase;
          var roll = rnd();
          if (roll > 0.94) type2 = "u";
          else if (level >= 4 && roll > 0.9) {
            type2 = "e";
            h = 1;
          } else if (roll > 0.82) {
            type2 = "m";
            h = 2;
          } else if (roll > 0.74) {
            type2 = "r";
            h = 2;
          } else if (roll > 0.52) h = hpBase + 1;
          addBrick(
            cc,
            rr,
            G.gridX + cc * (G.bw + G.gap),
            G.gridY + rr * (G.bh + G.gap),
            G.bw,
            G.bh,
            h,
            type2,
            pal,
          );
        }
      }
      G.brickBottom = G.gridY + pr2 * (G.bh + G.gap);
    }
    if (isBoss) G.spawnBoss();
  }
  function removeMoving(b) {
    if (b.type !== "m") return;
    var mi = G.moving.indexOf(b);
    if (mi >= 0) G.moving.splice(mi, 1);
  }
  function popBrick(b, direct) {
    if (!b.alive || b.type === "u") return;
    b.hp--;
    if (b.hp > 0) {
      G.sfx(1);
      G.burst(b.hx, b.hy, b.c0, 5, 140);
      return;
    }
    b.alive = 0;
    if (b.type !== "u") G.bCount--;
    G.stats.bricks++;
    G.combo++;
    if (G.combo > G.stats.bestCombo) G.stats.bestCombo = G.combo;
    var mult =
      Math.pow(1.18, Math.min(14, G.combo)) * (1 + (G.level - 1) * 0.1);
    G.score += Math.floor((55 + G.level * 10) * mult);
    G.burst(b.hx, b.hy, b.c0, 16, 220);
    G.ring(b.hx, b.hy, b.c0, G.bh);
    G.shake = Math.max(G.shake, 0.09);
    G.showCombo();
    G.sfx(3);
    G.updateHUD();
    if (G.combo >= 10) G.unlock("combo10");
    if (G.combo >= 4) G.hitStop(0.018);
    var cx = clamp(b.hx, 0, G.W);
    if (b.type === "e") explode(cx, b.hy);
    G.dropPU(cx, b.hy);
    G.speed0 = Math.min(760, G.speed0 + 2.2);
    removeMoving(b);
    if (G.clearedBoard()) G.levelClear();
  }
  function explode(x, y) {
    G.sfx(7);
    G.vibrate(40);
    G.flash = Math.max(G.flash, 0.18);
    G.shake = Math.max(G.shake, 0.28);
    G.hitStop(0.06);
    G.burst(x, y, "#ffd166", 34, 320);
    G.ring(x, y, "#ffd166", 10);
    var R = Math.max(G.bw, G.bh) * 1.35;
    for (var i = 0; i < G.bricks.length; i++) {
      var o = G.bricks[i];
      if (!o.alive || o.type === "u" || o.type === "e") continue;
      if (Math.hypot(o.hx - x, o.hy - y) <= R) {
        o.hp--;
        if (o.hp <= 0) {
          o.alive = 0;
          if (o.type !== "u") G.bCount--;
          G.stats.bricks++;
          G.combo++;
          if (G.combo > G.stats.bestCombo) G.stats.bestCombo = G.combo;
          G.score += Math.floor(
            (30 + G.level * 6) * Math.pow(1.12, Math.min(10, G.combo)),
          );
          G.burst(o.hx, o.hy, o.c0, 10, 180);
          removeMoving(o);
        } else {
          G.burst(o.hx, o.hy, o.c0, 4, 120);
        }
      }
    }
    G.updateHUD();
    if (G.clearedBoard()) G.levelClear();
  }
  function applyPU(k) {
    G.runPU[k] = 1;
    if (k === "m") {
      if (G.balls.length < 3) {
        var base = G.balls[0];
        G.addBall(base.x, base.y, -0.5, G.speed0);
        G.addBall(base.x, base.y, 0.5, G.speed0);
      }
      G.puTimer.m = PU[0].d;
    } else if (k === "w") {
      G.puTimer.w = PU[1].d;
      G.layoutPlay();
    } else if (k === "s") {
      G.puTimer.s = PU[2].d;
    } else if (k === "l") {
      G.puTimer.l = PU[3].d;
    } else if (k === "f") {
      G.puTimer.f = PU[4].d;
      G.unlock("fire");
      for (var i = 0; i < G.balls.length; i++) G.balls[i].fire = true;
    } else if (k === "x") {
      G.lives = Math.min(9, G.lives + 1);
    }
    var n = 0;
    for (var q in G.runPU) n++;
    if (n >= 6) G.unlock("allpu");
    G.updatePwr();
    G.updateHUD();
    G.sfx(8);
    G.flash = 0.1;
    G.vibrate(20);
  }
  function drawBricks(ctx) {
    var bricks = G.bricks,
      i,
      b,
      c;
    for (c = 0; c < fillColors.length; c++)
      fillGroups.get(fillColors[c]).length = 0;
    ctx.beginPath();
    var hasU = false;
    for (i = 0; i < bricks.length; i++) {
      b = bricks[i];
      if (!b.alive) continue;
      if (b.type === "u") {
        rectPath(ctx, b.x, b.y, b.w, b.h, 5);
        hasU = true;
      }
    }
    if (hasU) {
      ctx.fillStyle = "#3a4158";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.25)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    for (i = 0; i < bricks.length; i++) {
      b = bricks[i];
      if (!b.alive || b.type === "u") continue;
      var t = b.hp / b.max;
      groupFor(t > 0.66 ? b.c0 : t > 0.33 ? b.c1 : "#3a2248").push(b);
    }
    for (c = 0; c < fillColors.length; c++) {
      var arr = fillGroups.get(fillColors[c]);
      if (!arr.length) continue;
      ctx.beginPath();
      for (var j = 0; j < arr.length; j++) {
        var q = arr[j];
        rectPath(ctx, q.x, q.y, q.w, q.h, 5);
      }
      ctx.fillStyle = fillColors[c];
      ctx.fill();
    }
    for (i = 0; i < bricks.length; i++) {
      b = bricks[i];
      if (!b.alive || b.type === "u") continue;
      var hpT = b.hp / b.max;
      ctx.fillStyle = "rgba(255,255,255,.16)";
      ctx.fillRect(b.x + 3, b.y + 2, b.w - 6, Math.max(2, b.h * 0.28));
      if (b.type === "e") {
        ctx.fillStyle = "#fff";
        ctx.font = "700 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("*", b.hx, b.hy + 4);
      } else if (b.max > 1) {
        ctx.fillStyle = "rgba(0,0,0,.28)";
        ctx.fillRect(b.x + 4, b.y + b.h - 6, b.w - 8, 3);
        ctx.fillStyle = "#fff";
        ctx.fillRect(b.x + 4, b.y + b.h - 6, (b.w - 8) * hpT, 3);
        if (hpT <= 0.66) {
          ctx.strokeStyle = "rgba(5,6,15,.55)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(b.x + 4, b.y + b.h * 0.35);
          ctx.lineTo(b.x + b.w * 0.45, b.y + b.h * 0.7);
          ctx.lineTo(b.x + b.w - 4, b.y + b.h * 0.4);
          if (hpT <= 0.33) {
            ctx.moveTo(b.x + b.w * 0.2, b.y + 3);
            ctx.lineTo(b.x + b.w * 0.7, b.y + b.h - 3);
          }
          ctx.stroke();
        }
      }
    }
  }
  return {
    addBrick: addBrick,
    makeBricks: makeBricks,
    popBrick: popBrick,
    explode: explode,
    applyPU: applyPU,
    drawBricks: drawBricks,
  };
}
