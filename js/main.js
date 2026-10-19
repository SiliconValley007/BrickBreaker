import { FIXED } from "./const.js";
import { createConfig, createScreens } from "./screens.js";
import { createAudio } from "./audio.js";
import { createState } from "./state.js";
import { createView } from "./view.js";
import { createRender } from "./render.js";
import { createInput } from "./input.js";
import { createLoop } from "./loop.js";
import { createHud } from "./hud.js";
import { stepWorld } from "./sim.js";

(function () {
  var cvs = document.getElementById("c");
  var ctx =
    cvs.getContext("2d", { alpha: false, desynchronized: true }) ||
    cvs.getContext("2d");
  if (!ctx) {
    document.body.textContent = "Canvas is required to play NEON BREAK.";
    return;
  }
  var cfg = createConfig();
  var audio = createAudio(cfg);
  var G = createState(cfg, audio, function (t) {
    var el = document.getElementById("live");
    if (el) el.textContent = t;
  });
  G.setup(cvs, ctx);

  var view = createView(G);
  G.view = view;
  view.fit();

  G.hudApi = createHud(G);

  var render = createRender(G);
  G.render = render;
  var input = createInput(G, cvs);
  G.input = input;
  view.fit();

  var loop = createLoop(G, render);
  loop.bindLifecycle();
  var screens = createScreens(G);
  screens.boot();
  loop.start();

  if (location.search.indexOf("debug=1") >= 0) {
    window.NB = {
      state: function () {
        return G.state;
      },
      newGame: G.newGame,
      action: function () {
        G.action();
      },
      launch: G.launch,
      setState: G.setState,
      setPanel: G.setPanel,
      tick: function (n) {
        for (var i = 0; i < (n || 1); i++) stepWorld(G, FIXED);
      },
      info: function () {
        return {
          score: G.score,
          lives: G.lives,
          level: G.level,
          balls: G.balls.length,
          bricks: G.bCount,
          boss: !!G.boss,
          state: G.state,
          combo: G.combo,
          pw: G.pw,
          seed: G.runSeed,
          daily: G.dailyMode,
          quality: G.quality,
          bossHp: G.boss ? G.boss.hp : 0,
        };
      },
      addBrick: G.addBrick,
      makeBricks: G.makeBricks,
      layout: G.layoutPlay,
      balls: function () {
        return G.balls;
      },
      bricks: function () {
        return G.bricks;
      },
      clearBricks: function () {
        G.bCount = 0;
        for (var i = 0; i < G.bricks.length; i++) G.bricks[i].alive = 0;
        if (G.clearedBoard()) G.levelClear();
      },
      applyPU: G.applyPU,
      loseLife: G.loseLife,
      nextLevel: G.nextLevel,
      collect: G.addBall,
      pu: G.puTimer,
      cfg: G.cfg,
      popBrick: G.popBrick,
      FIXED: FIXED,
      G: G,
    };
  }
})();
