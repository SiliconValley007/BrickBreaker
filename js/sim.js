import { STATE, PU } from "./const.js";
import {
  clamp,
  contactNormal,
  collideBallBrick,
  reflectNormal,
} from "./physics.js";

export function stepWorld(G, h) {
  G.physT += h;
  if (G.puTimer.s > 0) G.speed0 = Math.min(G.speed0, 430);
  else
    G.speed0 = Math.min(
      760,
      Math.max(G.speed0, (400 + G.level * 22) * G.diff.spd),
    );

  for (var bi = 0; bi < G.balls.length; bi++) {
    var b = G.balls[bi];
    b.px = b.x;
    b.py = b.y;
    if (b.stuck) {
      b.x = G.px + G.pw * 0.5;
      b.y = G.py - b.r - 1;
      b.px = b.x;
      b.py = b.y;
      if (b.trail) {
        b.trail.n = 0;
        b.trail.i = 0;
      }
      continue;
    }
    var sp =
      G.puTimer.s > 0 ? Math.min(380, G.speed0) : clamp(G.speed0, 260, 760);
    var mag = Math.hypot(b.vx, b.vy) || 1;
    b.vx = (b.vx / mag) * sp;
    b.vy = (b.vy / mag) * sp;
    var rem = h,
      guard = 0;
    while (rem > 1e-7 && guard++ < 5) {
      var hit = b.canHitBrick
        ? collideBallBrick(b, rem, b.x, b.y, G.bricks, G.boss)
        : null;
      if (!hit) {
        var rx = b.x,
          ry = b.y;
        b.x += b.vx * rem;
        b.y += b.vy * rem;
        G.trailAlong(b, rx, ry, b.x, b.y);
        break;
      }
      var t = clamp(hit.t, 0, 1);
      var hx = b.x + b.vx * rem * t;
      var hy = b.y + b.vy * rem * t;
      G.trailAlong(b, b.x, b.y, hx, hy);
      b.x = hx;
      b.y = hy;
      if (hit.boss && G.boss) {
        var bn = contactNormal(
          b.x,
          b.y,
          b.r,
          G.boss.x,
          G.boss.y,
          G.boss.w,
          G.boss.h,
        );
        reflectNormal(b, bn.nx, bn.ny, G.boss.x, G.boss.y, G.boss.w, G.boss.h);
        G.damageBoss(G.puTimer.f > 0 ? 3 : 1);
        b.canHitBrick = true;
        b.bounceHits = 0;
        b.sq = 0.28;
        b.spinVel = (b.spinVel || 0) + 10;
      } else if (hit.b) {
        var br = hit.b;
        var cn = contactNormal(b.x, b.y, b.r, br.x, br.y, br.w, br.h);
        if (br.type !== "u") b.bounceHits = (b.bounceHits || 0) + 1;
        G.popBrick(br);
        b.sq = 0.32;
        b.spinVel = (b.spinVel || 0) + 10;
        if (br.type === "u") {
          reflectNormal(b, cn.nx, cn.ny, br.x, br.y, br.w, br.h);
          G.hitStop(0.02);
          b.canHitBrick = true;
          b.bounceHits = 0;
        } else if (!(G.puTimer.f > 0)) {
          reflectNormal(b, cn.nx, cn.ny, br.x, br.y, br.w, br.h);
          G.hitStop(0.02);
          b.canHitBrick = false;
        } else {
          var fm = Math.hypot(b.vx, b.vy) || 1;
          b.x += (b.vx / fm) * 1.2;
          b.y += (b.vy / fm) * 1.2;
          G.hitStop(0.012);
          b.canHitBrick = false;
        }
      }
      rem *= Math.max(0, 1 - t);
    }
    if (G.state !== STATE.PLAY) return;
    if (b.x < b.r + G.playL) {
      b.x = b.r + G.playL;
      b.vx = Math.abs(b.vx);
      b.canHitBrick = true;
      b.bounceHits = 0;
      G.spark(b.x, b.y, 1, 0);
      G.sfx(6);
    } else if (b.x > G.W - G.playR - b.r) {
      b.x = G.W - G.playR - b.r;
      b.vx = -Math.abs(b.vx);
      b.canHitBrick = true;
      b.bounceHits = 0;
      G.spark(b.x, b.y, -1, 0);
      G.sfx(6);
    }
    if (b.y < b.r + G.playT) {
      b.y = b.r + G.playT;
      b.vy = Math.abs(b.vy);
      b.canHitBrick = true;
      b.bounceHits = 0;
      G.spark(b.x, b.y, 0, 1);
      G.sfx(6);
    }
    if (b.y - b.r > G.H) {
      if (G.balls.length > 1) {
        G.freeTrail(b.trail);
        G.balls.splice(bi, 1);
        bi--;
        continue;
      }
      G.loseLife();
      return;
    }
    if (
      b.vy > 0 &&
      b.x + b.r > G.px - 1 &&
      b.x - b.r < G.px + G.pw + 1 &&
      b.y + b.r > G.py &&
      b.y - b.r < G.py + G.ph + 8
    ) {
      G.hitPaddle(b);
      b.canHitBrick = true;
      b.bounceHits = 0;
    }
    if (b.sq > 0) b.sq = Math.max(0, b.sq - h * 8);
    if (Math.abs(b.vy) < sp * 0.18) b.stall = (b.stall || 0) + h;
    else b.stall = 0;
    if (b.stall > 1) {
      var s2 = b.vy <= 0 ? -1 : 1;
      b.vy = s2 * sp * 0.45;
      var m2 = Math.hypot(b.vx, b.vy) || 1;
      b.vx = (b.vx / m2) * sp;
      b.vy = (b.vy / m2) * sp;
      b.stall = 0;
    }
  }

  if (G.state !== STATE.PLAY) return;

  for (var mi = 0; mi < G.moving.length; mi++) {
    var mb = G.moving[mi];
    if (!mb.alive) continue;
    mb.x += mb.vx * h;
    if (mb.x < G.playL || mb.x + mb.w > G.W - G.playR) {
      mb.vx *= -1;
      mb.x = clamp(mb.x, G.playL, G.W - G.playR - mb.w);
    }
    mb.hx = mb.x + mb.w * 0.5;
    mb.hy = mb.y + mb.h * 0.5;
  }
  for (var ri = 0; ri < G.bricks.length; ri++) {
    var rb = G.bricks[ri];
    if (!rb.alive && rb.type === "r") {
      rb.regen -= h;
      if (rb.regen <= 0) {
        rb.alive = 1;
        rb.hp = rb.max;
        rb.regen = 6;
        G.bCount++;
        G.ring(rb.hx, rb.hy, rb.c0, 4);
      }
    }
  }
  if (G.boss) {
    G.boss.x += G.boss.vx * h;
    if (G.boss.x < G.playL || G.boss.x + G.boss.w > G.W - G.playR) {
      G.boss.vx *= -1;
      G.boss.x = clamp(G.boss.x, G.playL, G.W - G.playR - G.boss.w);
    }
    if (G.boss.hurt > 0) G.boss.hurt -= h;
    G.boss.fire -= h;
    if (G.boss.fire <= 0) {
      G.boss.fire = Math.max(0.5, 1.6 - G.level * 0.05);
      G.addEnemy(G.boss.x + G.boss.w * 0.5, G.boss.y + G.boss.h);
    }
  }
  for (var si = 0; si < G.shots.length; si++) {
    var sh = G.shots[si];
    if (!sh.a) continue;
    sh.y += sh.vy * h;
    if (sh.vy < 0 && sh.y < G.playT) {
      sh.a = 0;
      continue;
    }
    if (sh.vy > 0 && sh.y > G.H) {
      sh.a = 0;
      continue;
    }
    shotHit(G, sh);
    if (G.state !== STATE.PLAY) return;
  }
  for (var di = 0; di < G.drops.length; di++) {
    var d = G.drops[di];
    if (!d.a) continue;
    d.y += d.vy * h;
    if (d.y > G.H + 20) {
      d.a = 0;
      continue;
    }
    if (
      d.y + 10 > G.py &&
      d.y - 10 < G.py + G.ph &&
      d.x > G.px &&
      d.x < G.px + G.pw
    ) {
      d.a = 0;
      G.applyPU(PU[d.i].k);
      if (G.state !== STATE.PLAY) return;
    }
  }
}

function shotHit(G, sh) {
  if (sh.en) {
    if (
      sh.x > G.px &&
      sh.x < G.px + G.pw &&
      sh.y > G.py &&
      sh.y < G.py + G.ph
    ) {
      sh.a = 0;
      G.shake = 0.2;
      G.flash = 0.12;
      G.sfx(2);
      G.vibrate(30);
    }
    return;
  }
  for (var i = 0; i < G.bricks.length; i++) {
    var b = G.bricks[i];
    if (!b.alive || b.type === "u") continue;
    if (sh.x > b.x && sh.x < b.x + b.w && sh.y > b.y && sh.y < b.y + b.h) {
      sh.a = 0;
      G.popBrick(b);
      return;
    }
  }
  if (
    G.boss &&
    sh.x > G.boss.x &&
    sh.x < G.boss.x + G.boss.w &&
    sh.y > G.boss.y &&
    sh.y < G.boss.y + G.boss.h
  ) {
    sh.a = 0;
    G.damageBoss(1);
  }
}
