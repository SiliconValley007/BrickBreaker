import { STATE, FIXED } from "./const.js";
import { clamp } from "./physics.js";
import { stepWorld } from "./sim.js";

export function createLoop(G, render) {
  var last = 0,
    acc = 0,
    fpsBudget = 0,
    lastShot = 0,
    avg = 16.7;

  function frame(ts) {
    if (!G.running) return;
    if (!last) last = ts;
    var real = Math.min(0.05, (ts - last) * 0.001);
    last = ts;
    if (G.needResize) {
      G.layoutPlay();
      G.needResize = 0;
    }
    var frameDt = real;
    if (G.hitstop > 0) {
      G.hitstop -= real;
      frameDt *= 0.25;
    }
    G.time += real;
    avg = avg * 0.92 + real * 1000 * 0.08;
    fpsBudget += real;
    if (fpsBudget > 0.5) {
      fpsBudget = 0;
      G.stats.time = G.time;
      if (G.saveStats) G.saveStats();
      if (avg > 20) G.quality = Math.max(0.45, G.quality - 0.08);
      else if (avg < 14) G.quality = Math.min(1, G.quality + 0.04);
    }
    G.input.pollGamepad();
    if (G.state === STATE.PLAY) {
      var accel = 1400 + G.W * 0.4;
      if (G.input.keys.l) G.ptx -= accel * frameDt;
      if (G.input.keys.r) G.ptx += accel * frameDt;
      var pad = G.input.padL;
      if (pad) G.ptx += pad * accel * 0.9 * frameDt;
      G.ptx = clamp(G.ptx, G.playL, G.W - G.playR - G.pw);
      G.px += (G.ptx - G.px) * Math.min(1, frameDt * 22);

      G.audio.syncMusic(G.level, G.boss, G.combo);
      G.audio.setCombo(G.combo);
      acc += frameDt;
      var guard = 0;
      while (acc >= FIXED && guard < 8) {
        stepWorld(G, FIXED);
        acc -= FIXED;
        guard++;
        if (G.state !== STATE.PLAY) break;
      }
      if (guard >= 8) acc = 0;
      if (G.puTimer.l > 0 && ts - lastShot > 380) {
        lastShot = ts;
        G.fireLaser();
      }
      G.updatePwr();
      for (var k in G.puTimer) {
        if (G.puTimer[k] > 0) {
          G.puTimer[k] -= frameDt;
          if (G.puTimer[k] < 0) {
            G.puTimer[k] = 0;
            if (k === "w") G.layoutPlay();
            if (k === "f")
              for (var q = 0; q < G.balls.length; q++) G.balls[q].fire = false;
          }
        }
      }
      G.stepFX(frameDt);
    } else {
      G.stepFX(frameDt * 0.4);
      acc = 0;
    }
    render.draw(G.ctx, acc / FIXED);
    requestAnimationFrame(frame);
  }

  function start() {
    if (G.running) return;
    G.running = true;
    last = 0;
    requestAnimationFrame(frame);
  }

  function onHide() {
    if (G.state === STATE.PLAY) G.setState(STATE.PAUSE);
    G.audio.stopMusic();
  }
  function bindLifecycle() {
    window.addEventListener("resize", G.fit, { passive: true });
    window.addEventListener("pageshow", G.fit);
    window.addEventListener(
      "orientationchange",
      function () {
        setTimeout(G.fit, 120);
        setTimeout(G.fit, 400);
      },
      { passive: true },
    );
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", G.fit, {
        passive: true,
      });
      window.visualViewport.addEventListener("scroll", G.fit, {
        passive: true,
      });
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) onHide();
      else if (G.state === STATE.PLAY) G.audio.startMusic();
    });
    window.addEventListener("blur", onHide);
    window.addEventListener("focus", function () {
      if (G.state === STATE.PLAY) G.audio.startMusic();
    });
  }

  return { start: start, bindLifecycle: bindLifecycle };
}
