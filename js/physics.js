export { mulberry32, mixSeed } from "./const.js";

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

export function sweepCircleAABB(px0, py0, vx, vy, r, x, y, w, h, dt) {
  var dx = vx * dt,
    dy = vy * dt;
  var ex0 = x - r,
    ey0 = y - r,
    ex1 = x + w + r,
    ey1 = y + h + r;
  var tEnter = 0,
    tExit = 1;
  if (Math.abs(dx) < 1e-10) {
    if (px0 < ex0 || px0 > ex1) return null;
  } else {
    var tx0 = (ex0 - px0) / dx,
      tx1 = (ex1 - px0) / dx;
    if (tx0 > tx1) {
      var tmp = tx0;
      tx0 = tx1;
      tx1 = tmp;
    }
    tEnter = Math.max(tEnter, tx0);
    tExit = Math.min(tExit, tx1);
  }
  if (Math.abs(dy) < 1e-10) {
    if (py0 < ey0 || py0 > ey1) return null;
  } else {
    var ty0 = (ey0 - py0) / dy,
      ty1 = (ey1 - py0) / dy;
    if (ty0 > ty1) {
      var tmpy = ty0;
      ty0 = ty1;
      ty1 = tmpy;
    }
    tEnter = Math.max(tEnter, ty0);
    tExit = Math.min(tExit, ty1);
  }
  if (tEnter > tExit || tExit < 0 || tEnter > 1) return null;
  var t = tEnter < 0 ? 0 : tEnter;
  var cx = px0 + dx * t,
    cy = py0 + dy * t;
  var qx = clamp(cx, x, x + w),
    qy = clamp(cy, y, y + h);
  var ox = cx - qx,
    oy = cy - qy;
  var d2 = ox * ox + oy * oy;
  if (t === 0) {
    if (d2 > r * r + 1e-4) return null;
  } else if (d2 > r * r + 2e-2) {
    return null;
  }
  return t;
}

export function contactNormal(cx, cy, r, x, y, w, h) {
  var qx = clamp(cx, x, x + w),
    qy = clamp(cy, y, y + h);
  var ox = cx - qx,
    oy = cy - qy;
  var d2 = ox * ox + oy * oy;
  if (d2 > 1e-8) {
    var inv = 1 / Math.sqrt(d2);
    return { nx: ox * inv, ny: oy * inv };
  }
  var left = cx - x,
    right = x + w - cx,
    top = cy - y,
    bot = y + h - cy;
  var m = Math.min(left, right, top, bot);
  if (m === left) return { nx: -1, ny: 0 };
  if (m === right) return { nx: 1, ny: 0 };
  if (m === top) return { nx: 0, ny: -1 };
  return { nx: 0, ny: 1 };
}

export function collideBallBrick(b, dt, ox, oy, bricks, boss) {
  var best = null,
    bestT = 2,
    bestBoss = false;
  var len = bricks.length;
  for (var i = 0; i < len; i++) {
    var br = bricks[i];
    if (!br.alive) continue;
    var t = sweepCircleAABB(
      ox,
      oy,
      b.vx,
      b.vy,
      b.r,
      br.x,
      br.y,
      br.w,
      br.h,
      dt,
    );
    if (t == null) continue;
    if (t < bestT - 1e-6) {
      bestT = t;
      best = br;
      bestBoss = false;
    } else if (Math.abs(t - bestT) <= 1e-6 && best) {
      var hx = ox + b.vx * dt * t,
        hy = oy + b.vy * dt * t;
      var dNew = (hx - br.hx) * (hx - br.hx) + (hy - br.hy) * (hy - br.hy);
      var dOld =
        (hx - best.hx) * (hx - best.hx) + (hy - best.hy) * (hy - best.hy);
      if (dNew < dOld) best = br;
    }
  }
  if (boss) {
    var tb = sweepCircleAABB(
      ox,
      oy,
      b.vx,
      b.vy,
      b.r,
      boss.x,
      boss.y,
      boss.w,
      boss.h,
      dt,
    );
    if (tb != null && tb < bestT - 1e-6) {
      bestT = tb;
      best = null;
      bestBoss = true;
    }
  }
  if (bestBoss) return { t: bestT, boss: true };
  return best ? { t: bestT, b: best } : null;
}

export function reflectNormal(b, nx, ny, x, y, w, h) {
  var OVER = 0.6;
  var nlen = Math.hypot(nx, ny) || 1;
  nx /= nlen;
  ny /= nlen;
  var dot = b.vx * nx + b.vy * ny;
  if (dot < 0) {
    b.vx -= 2 * dot * nx;
    b.vy -= 2 * dot * ny;
  }
  var qx = clamp(b.x, x, x + w),
    qy = clamp(b.y, y, y + h);
  var ox = b.x - qx,
    oy = b.y - qy;
  var d = Math.hypot(ox, oy);
  if (d < 1e-6) {
    b.x += nx * (b.r + OVER);
    b.y += ny * (b.r + OVER);
  } else if (d < b.r + OVER) {
    var s = (b.r + OVER) / d;
    b.x = qx + ox * s;
    b.y = qy + oy * s;
  }
}

export function paddleBounce(b, px, py, pw, ph, speed) {
  var cx = px + pw * 0.5;
  var n = contactNormal(b.x, b.y, b.r, px, py, pw, ph);
  if (Math.abs(n.nx) > 0.62 && n.ny > -0.5) {
    b.vx = Math.abs(b.vy || speed * 0.45) * (n.nx >= 0 ? 1 : -1);
    b.vy = -Math.abs(b.vy || speed * 0.45) * 0.72;
    b.x = n.nx >= 0 ? px + pw + b.r + 0.5 : px - b.r - 0.5;
    return true;
  }
  var k = clamp((b.x - cx) / (pw * 0.5), -1, 1);
  if (Math.abs(k) > 0.92) k = k > 0 ? 0.92 : -0.92;
  var ang = k * 1.15;
  b.vx = Math.sin(ang) * speed;
  b.vy = -Math.abs(Math.cos(ang) * speed);
  b.y = py - b.r - 0.5;
  return false;
}
