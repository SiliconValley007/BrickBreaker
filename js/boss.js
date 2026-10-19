import { clamp } from "./physics.js";

export function spawnBoss(G) {
  var w = Math.min(G.W * 0.5, 320),
    h = Math.max(26, Math.min(56, G.H * 0.07));
  var x = G.W * 0.5 - w * 0.5,
    y = clamp(G.brickBottom + 12, G.gridY + 8, G.py - h - G.BR * 10);
  G.boss = {
    x: x,
    y: y,
    w: w,
    h: h,
    hp: 26 + G.level * 6,
    max: 26 + G.level * 6,
    vx: 70 + G.level * 4,
    fire: 1.4,
    hurt: 0,
    c0: "#ff2bd6",
  };
}

export function damageBoss(G, d) {
  var boss = G.boss;
  if (!boss) return;
  boss.hp -= d;
  boss.hurt = 0.15;
  G.burst(
    boss.x + Math.random() * boss.w,
    boss.y + boss.h * 0.5,
    "#ff2bd6",
    8,
    180,
  ); // cosmetic
  if (boss.hp <= 0) {
    G.score += 1500 + G.level * 250;
    G.stats.bosses++;
    G.saveStats();
    G.unlock("boss");
    G.burst(boss.x + boss.w * 0.5, boss.y + boss.h * 0.5, "#ff2bd6", 60, 360);
    G.ring(boss.x + boss.w * 0.5, boss.y + boss.h * 0.5, "#ff2bd6", 20);
    G.shake = 0.5;
    G.flash = 0.3;
    G.sfx(4);
    G.boss = null;
    G.updateHUD();
    if (G.clearedBoard()) G.levelClear();
  } else G.sfx(1);
}

export function drawBoss(ctx, G) {
  var boss = G.boss;
  if (!boss) return;
  var rr = Math.min(12, boss.w * 0.5, boss.h * 0.5);
  ctx.beginPath();
  ctx.moveTo(boss.x + rr, boss.y);
  ctx.arcTo(boss.x + boss.w, boss.y, boss.x + boss.w, boss.y + boss.h, rr);
  ctx.arcTo(boss.x + boss.w, boss.y + boss.h, boss.x, boss.y + boss.h, rr);
  ctx.arcTo(boss.x, boss.y + boss.h, boss.x, boss.y, rr);
  ctx.arcTo(boss.x, boss.y, boss.x + boss.w, boss.y, rr);
  ctx.closePath();
  ctx.fillStyle = boss.hurt > 0 ? "#fff" : boss.c0;
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.fillRect(boss.x + 10, boss.y + boss.h - 8, boss.w - 20, 5);
  ctx.fillStyle = "#fff";
  ctx.fillRect(
    boss.x + 10,
    boss.y + boss.h - 8,
    (boss.w - 20) * (boss.hp / boss.max),
    5,
  );
  ctx.fillStyle = "#05060f";
  ctx.beginPath();
  ctx.arc(
    boss.x + boss.w * 0.32,
    boss.y + boss.h * 0.4,
    boss.h * 0.14,
    0,
    6.283,
  );
  ctx.arc(
    boss.x + boss.w * 0.68,
    boss.y + boss.h * 0.4,
    boss.h * 0.14,
    0,
    6.283,
  );
  ctx.fill();
}
