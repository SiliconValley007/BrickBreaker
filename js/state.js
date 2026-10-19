import { STATE, PALETTES, mulberry32 } from "./const.js";
import { clamp, paddleBounce } from "./physics.js";
import { DIFF, loadProgress, starsFor, runSeedFor } from "./levels.js";
import { lsGet, lsSet, loadNum, loadBool } from "./storage.js";
import { $ } from "./ui.js";
import { startDaily } from "./daily.js";
import { createFX } from "./fx.js";
import { createEntities } from "./entities.js";
import { createBricks } from "./bricks.js";
import { createScore } from "./score.js";
import { createAchievements } from "./achievements.js";
import { createBallDraw } from "./ball.js";
import {
  spawnBoss as spawnBossMod,
  damageBoss as damageBossMod,
} from "./boss.js";

export function createState(cfg, audio, announce) {
  var G = {
    cfg: cfg,
    audio: audio,
    announce: announce || function () {},
    STATE: STATE,
    $: $,
    canvas: null,
    ctx: null,
    render: null,
    onState: null,
    onFinish: null,
    onLevelClear: null,
    state: STATE.TITLE,
    running: false,
    W: 0,
    H: 0,
    dpr: 1,
    needResize: 1,
    insetL: 0,
    insetR: 0,
    insetT: 0,
    insetB: 0,
    playL: 0,
    playR: 0,
    playT: 0,
    score: 0,
    lives: 3,
    level: 1,
    combo: 0,
    comboT: 0,
    introT: 0,
    levelStartLives: 3,
    runPU: {},
    progress: loadProgress(lsGet),
    diffKey: "classic",
    diff: DIFF.classic,
    dailyMode: false,
    dailyStamp: 0,
    levelSeed: 0,
    runSeed: 0,
    startLevel: 1,
    quality: 1,
    px: 0,
    py: 0,
    pw: 0,
    ph: 0,
    ptx: 0,
    psq: 0,
    balls: [],
    BR: 7,
    speed0: 430,
    bricks: [],
    bCount: 0,
    cols: 0,
    rows: 0,
    bw: 0,
    bh: 0,
    gap: 0,
    gridX: 0,
    gridY: 0,
    moving: [],
    brickBottom: 0,
    boss: null,
    shake: 0,
    flash: 0,
    hitstop: 0,
    time: 0,
    physT: 0,
    puTimer: { m: 0, w: 0, s: 0, l: 0, f: 0 },
    reduce: !!cfg.motion,
    PAL: PALETTES[cfg.cb ? "cb" : "default"],
    ach: {},
    stats: null,
    scores: [],
    best: 0,
    overInfo: null,
    clearInfo: null,
  };

  var diffKey = lsGet("nb_diff") || "classic";
  if (!DIFF[diffKey]) diffKey = "classic";
  G.diffKey = diffKey;
  G.diff = DIFF[diffKey];

  G.scoreEl = $("score");
  G.levelEl = $("level");
  G.bestEl = $("best");
  G.livesEl = $("lives");
  G.comboEl = $("combo");
  G.pwrEls = {
    m: $("piM"),
    w: $("piW"),
    s: $("piS"),
    l: $("piL"),
    f: $("piF"),
  };
  G.stats = {
    runs: loadNum("nb_runs", 0),
    bricks: loadNum("nb_bricks", 0),
    bestCombo: loadNum("nb_best_combo", 0),
    bosses: loadNum("nb_bosses", 0),
    time: loadNum("nb_time", 0),
  };

  G.fx = createFX(G);
  G.ent = createEntities(G);
  G.bricksApi = createBricks(G);
  G.scoreApi = createScore(G);
  G.achApi = createAchievements(G);
  G.ach = G.achApi.load();
  G.scores = G.scoreApi.loadScores();
  G.best = G.scores.length ? G.scores[0].s : loadNum("nb_best", 0);
  if (G.bestEl) G.bestEl.textContent = G.best;

  G.sfx = function (k) {
    audio.sfx(k);
  };
  G.burst = G.fx.burst;
  G.spark = G.fx.spark;
  G.ring = G.fx.ring;
  G.shedEmber = G.fx.shedEmber;
  G.stepEmbers = G.fx.stepEmbers;
  G.stepFX = G.fx.stepFX;
  G.popBrick = G.bricksApi.popBrick;
  G.applyPU = G.bricksApi.applyPU;
  G.addBrick = G.bricksApi.addBrick;
  G.makeBricks = G.bricksApi.makeBricks;
  G.drawBricks = G.bricksApi.drawBricks;
  G.addBall = G.ent.addBall;
  G.dropPU = G.ent.dropPU;
  G.addEnemy = G.ent.addEnemy;
  G.fireLaser = G.ent.fireLaser;
  G.freeTrail = G.ent.freeTrail;
  G.shots = G.ent.shots;
  G.drops = G.ent.drops;

  var ballApi = createBallDraw(G);
  G.ballApi = ballApi;
  G.rebuildBallGfx = ballApi.rebuildBallGfx;
  G.trailAlong = ballApi.trailAlong;
  G.drawBalls = function (ctx, alpha) {
    ballApi.drawBalls(ctx, alpha);
  };

  G.unlock = G.achApi.unlock;
  G.saveStats = G.achApi.saveStats;
  G.showCombo = G.scoreApi.showCombo;
  G.recordStars = G.scoreApi.recordStars;
  G.renderScores = G.scoreApi.renderScores;
  G.renderAch = G.achApi.renderAch;
  G.renderStats = G.achApi.renderStats;
  G.updateHUD = function () {
    if (G.hudApi) G.hudApi.updateHUD();
  };
  G.updatePwr = function () {
    if (G.hudApi) G.hudApi.updatePwr();
  };
  G.layoutPlay = function () {
    if (G.view) G.view.layoutPlay();
  };
  G.fit = function () {
    if (G.view) G.view.fit();
  };

  G.hitStop = function (sec) {
    if (!cfg.hitstop || G.reduce) return;
    G.hitstop = Math.max(G.hitstop, sec);
  };
  G.vibrate = function (ms) {
    if (cfg.haptics && navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch (e) {}
    }
  };
  G.spawnBoss = function () {
    spawnBossMod(G);
  };
  G.damageBoss = function (d) {
    if (!G.boss) return;
    G.hitStop(0.05);
    damageBossMod(G, d);
  };
  G.launched = function () {
    for (var i = 0; i < G.balls.length; i++) if (G.balls[i].stuck) return false;
    return G.balls.length > 0;
  };
  G.anyStuck = function () {
    for (var i = 0; i < G.balls.length; i++) if (G.balls[i].stuck) return true;
    return false;
  };
  G.resetBall = function () {
    for (var i = 0; i < G.balls.length; i++) G.freeTrail(G.balls[i].trail);
    G.balls.length = 0;
    G.speed0 = Math.min(760, (400 + G.level * 22) * G.diff.spd);
    G.balls.push(
      G.ent.makeBall(G.px + G.pw * 0.5, G.py - G.BR - 1, 0, 0, true),
    );
    G.combo = 0;
    G.showCombo();
  };
  G.resetLevelStats = function () {
    G.puTimer.m = G.puTimer.w = G.puTimer.s = G.puTimer.l = G.puTimer.f = 0;
    G.levelStartLives = G.lives;
    G.runPU = {};
    G.updatePwr();
  };
  G.prepareLevel = function () {
    G.rng = mulberry32(runSeedFor(G.runSeed, G.level, 2));
    G.layoutPlay();
    G.makeBricks();
    G.resetBall();
    G.resetLevelStats();
    G.introT = 1.6;
    G.updateHUD();
  };
  G.newGame = function (fromLevel, daily) {
    G.score = 0;
    G.lives = G.diff.lives;
    G.dailyMode = !!daily;
    if (G.dailyMode) {
      var d = startDaily(G);
      G.level = d.level;
    } else {
      G.level = fromLevel || G.startLevel || 1;
      G.levelSeed = 0;
    }
    G.runSeed = G.dailyMode
      ? G.dailyStamp
      : (Date.now() ^ Math.imul(G.level, 2654435761)) >>> 0;
    G.startLevel = G.level;
    G.shake = G.flash = G.hitstop = 0;
    G.bricks.length = 0;
    G.moving.length = 0;
    G.ent.clear();
    G.stats.runs++;
    G.saveStats();
    G.prepareLevel();
    G.stats.time = 0;
  };
  G.nextLevel = function () {
    if (G.dailyMode) return;
    G.level++;
    G.levelSeed = 0;
    G.prepareLevel();
    G.sfx(5);
    if (G.level >= 5) G.unlock("lvl5");
    if (G.level >= 10) G.unlock("lvl10");
  };
  G.launch = function () {
    if (G.state !== STATE.PLAY) return;
    var any = false;
    for (var i = 0; i < G.balls.length; i++) {
      var b = G.balls[i];
      if (b.stuck) {
        b.stuck = false;
        b.canHitBrick = true;
        var ang = -0.55 + G.rng() * 1.1;
        b.vx = Math.sin(ang) * G.speed0;
        b.vy = -Math.cos(ang) * G.speed0;
        any = true;
      }
    }
    if (any) G.sfx(6);
  };
  G.setState = function (s) {
    G.state = s;
    if (G.onState) G.onState(s);
  };
  G.hitPaddle = function (b) {
    var speed = Math.max(260, G.speed0);
    var side = paddleBounce(b, G.px, G.py, G.pw, G.ph, speed);
    b.canHitBrick = true;
    b.bounceHits = 0;
    G.combo = 0;
    G.showCombo();
    G.spark(b.x, b.y, 0, -1);
    G.psq = 0.42;
    b.sq = 0.28;
    b.spinVel = (b.spinVel || 0) + 14;
    G.sfx(side ? 11 : 1);
    G.vibrate(12);
  };
  G.loseLife = function () {
    if (G.state !== STATE.PLAY) return;
    G.lives--;
    G.combo = 0;
    G.showCombo();
    G.burst(clamp(G.px + G.pw * 0.5, 0, G.W), G.H - 20, "#ff2bd6", 28, 260);
    G.shake = 0.3;
    G.flash = 0.16;
    G.vibrate(60);
    G.updateHUD();
    if (G.lives <= 0) {
      G.sfx(4);
      G.finishRun();
    } else {
      G.sfx(2);
      G.resetBall();
      for (var k in G.puTimer) G.puTimer[k] = 0;
      G.updatePwr();
      for (var i = 0; i < G.balls.length; i++) G.balls[i].fire = false;
      G.layoutPlay();
    }
  };
  G.finishRun = function () {
    if (G.state === STATE.OVER) return;
    G.stats.time = G.time;
    G.saveStats();
    if (G.score > 0) {
      var initials = (lsGet("nb_init") || "AAA").slice(0, 3).toUpperCase();
      G.scores.push({ n: initials, s: G.score, l: G.level, t: Date.now() });
      G.scores.sort(function (a, b) {
        return b.s - a.s;
      });
      G.scores = G.scores.slice(0, 8);
      G.scoreApi.saveScores(G.scores);
      if (G.score > G.best) G.best = G.score;
    }
    if (G.score >= 9000) G.unlock("million");
    G.overInfo = { score: G.score, best: G.best, level: G.level };
    if (G.onFinish) G.onFinish(G.overInfo);
    G.setState(STATE.OVER);
  };
  G.levelClear = function () {
    if (G.state !== STATE.PLAY) return;
    G.saveStats();
    G.unlock("first");
    if (G.lives === G.levelStartLives) G.unlock("nohit");
    var stars = starsFor(G.lives, G.levelStartLives);
    G.recordStars(G.level, stars);
    G.clearInfo = {
      level: G.level,
      stars: stars,
      score: G.score,
      daily: G.dailyMode,
    };
    if (G.onLevelClear) G.onLevelClear(G.clearInfo);
    G.setState(STATE.CLEAR);
    G.sfx(5);
  };
  G.clearedBoard = function () {
    if (G.boss) return false;
    for (var i = 0; i < G.bricks.length; i++) {
      var br = G.bricks[i];
      if (br.type === "u") continue;
      if (br.alive) return false;
    }
    return true;
  };
  G.setup = function (canvas, ctx) {
    G.canvas = canvas;
    G.ctx = ctx;
  };
  G.STATE = STATE;
  return G;
}
