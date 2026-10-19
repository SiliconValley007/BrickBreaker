import { MAX_SHOT, MAX_PU, PU, TRAIL_CAP } from "./const.js";

export function createEntities(G) {
  var shots = new Array(MAX_SHOT),
    sH = 0;
  var drops = new Array(MAX_PU),
    dH = 0;
  var trailPool = [];
  var i;
  for (i = 0; i < MAX_SHOT; i++) shots[i] = { a: 0, x: 0, y: 0, vy: 0, en: 0 };
  for (i = 0; i < MAX_PU; i++)
    drops[i] = { a: 0, x: 0, y: 0, vy: 0, k: 0, i: 0 };
  for (i = 0; i < 12; i++)
    trailPool.push({
      xy: new Float32Array(TRAIL_CAP * 2),
      ts: new Float32Array(TRAIL_CAP),
      n: 0,
      i: 0,
    });

  function allocTrail() {
    var t = trailPool.pop();
    if (!t)
      t = {
        xy: new Float32Array(TRAIL_CAP * 2),
        ts: new Float32Array(TRAIL_CAP),
        n: 0,
        i: 0,
      };
    t.n = 0;
    t.i = 0;
    return t;
  }
  function freeTrail(t) {
    if (t && trailPool.length < 24) trailPool.push(t);
  }
  function makeBall(x, y, vx, vy, stuck) {
    return {
      x: x,
      y: y,
      px: x,
      py: y,
      vx: vx,
      vy: vy,
      r: G.BR,
      color: "#e8ffff",
      fire: G.puTimer.f > 0,
      stuck: !!stuck,
      canHitBrick: true,
      stall: 0,
      sq: 0,
      bounceHits: 0,
      trail: allocTrail(),
      spin: 0,
      spinVel: 0,
    };
  }
  function addBall(x, y, ang, sp) {
    if (G.balls.length >= 12) return;
    G.balls.push(
      makeBall(x, y, Math.sin(ang) * sp, -Math.cos(ang) * sp, false),
    );
  }
  function rand() {
    return G.rng();
  }
  function dropPU(x, y) {
    if (G.boss) return;
    if (rand() > G.diff.drop) return;
    var roll = rand(),
      idx;
    if (roll < 0.22) idx = 0;
    else if (roll < 0.4) idx = 1;
    else if (roll < 0.56) idx = 2;
    else if (roll < 0.7) idx = 3;
    else if (roll < 0.86) idx = 4;
    else idx = 5;
    var d = drops[dH++ % MAX_PU];
    d.a = 1;
    d.x = x;
    d.y = y;
    d.vy = 110;
    d.i = idx;
    d.k = PU[idx].k;
  }
  function addEnemy(x, y) {
    var sh = shots[sH++ % MAX_SHOT];
    sh.a = 1;
    sh.x = x;
    sh.y = y;
    sh.vy = 180 + G.level * 6;
    sh.en = 1;
  }
  function fireLaser() {
    if (G.puTimer.l <= 0) return;
    for (var i = 0; i < shots.length; i++) {
      var sh = shots[i];
      if (sh.a) continue;
      sh.a = 1;
      sh.en = 0;
      sh.x = G.px + 8;
      sh.y = G.py;
      sh.vy = -680;
      break;
    }
    G.sfx(10);
  }
  function clear() {
    for (var i = 0; i < MAX_SHOT; i++) shots[i].a = 0;
    for (i = 0; i < MAX_PU; i++) drops[i].a = 0;
  }
  return {
    shots: shots,
    drops: drops,
    trailPool: trailPool,
    allocTrail: allocTrail,
    freeTrail: freeTrail,
    makeBall: makeBall,
    addBall: addBall,
    dropPU: dropPU,
    addEnemy: addEnemy,
    fireLaser: fireLaser,
    clear: clear,
  };
}
