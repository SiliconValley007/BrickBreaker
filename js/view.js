import { clamp } from "./physics.js";

export function createView(G) {
  function readInsets() {
    var probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)";
    document.body.appendChild(probe);
    var s = getComputedStyle(probe);
    G.insetT = parseFloat(s.paddingTop) || 0;
    G.insetR = parseFloat(s.paddingRight) || 0;
    G.insetB = parseFloat(s.paddingBottom) || 0;
    G.insetL = parseFloat(s.paddingLeft) || 0;
    document.body.removeChild(probe);
  }

  function fit() {
    var cvs = G.canvas,
      ctx = G.ctx;
    var vv = window.visualViewport;
    G.W = Math.max(
      1,
      (vv && vv.width) ||
        window.innerWidth ||
        document.documentElement.clientWidth,
    );
    G.H = Math.max(
      1,
      (vv && vv.height) ||
        window.innerHeight ||
        document.documentElement.clientHeight,
    );
    var root = document.documentElement;
    if (vv) {
      var vx = vv.offsetLeft || 0,
        vy = vv.offsetTop || 0;
      cvs.style.left = vx + "px";
      cvs.style.top = vy + "px";
      root.style.setProperty("--vv-l", vx + "px");
      root.style.setProperty("--vv-t", vy + "px");
    } else {
      cvs.style.left = "0px";
      cvs.style.top = "0px";
      root.style.setProperty("--vv-l", "0px");
      root.style.setProperty("--vv-t", "0px");
    }
    G.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    cvs.width = Math.max(1, (G.W * G.dpr) | 0);
    cvs.height = Math.max(1, (G.H * G.dpr) | 0);
    cvs.style.width = G.W + "px";
    cvs.style.height = G.H + "px";
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    readInsets();
    G.needResize = 1;
    if (G.rebuildBallGfx) G.rebuildBallGfx();
    if (G.render) G.render.invalidate();
  }

  function layoutPlay() {
    var W = G.W,
      H = G.H;
    var mL = Math.max(10, G.insetL + 8, Math.min(W, H) * 0.02);
    var mR = Math.max(10, G.insetR + 8, Math.min(W, H) * 0.02);
    var mB = Math.max(12, G.insetB + 10, H * 0.02);
    G.playL = mL;
    G.playR = mR;
    G.playT = G.insetT + 4;
    var compact = H < 480;
    var hudH = G.insetT + (compact ? 46 : Math.max(56, H * 0.085));
    var fieldW = W - mL - mR;
    G.ph = Math.max(10, Math.min(16, H * 0.018));
    var wide = G.puTimer.w > 0 ? 1.45 : 1;
    G.pw = clamp(
      Math.max(64, Math.min(W * 0.28, 148 - G.level * 2, fieldW * 0.42)) * wide,
      48,
      fieldW,
    );
    G.BR = Math.max(5, Math.min(9, Math.min(W, H) * 0.012));
    if (G.rebuildBallGfx) G.rebuildBallGfx();
    G.py = H - mB - G.ph - (compact ? 6 : 8);
    if (!G.launched()) {
      G.px = W * 0.5 - G.pw * 0.5;
      G.ptx = G.px;
    }
    G.px = clamp(G.px, mL, W - mR - G.pw);
    G.ptx = clamp(G.ptx, mL, W - mR - G.pw);
    G.gridX = mL;
    G.gridY = hudH + (compact ? 2 : 6);
    if (!G.bricks.length) {
      G.cols = Math.min(
        compact ? 10 : 14,
        9 +
          Math.floor((G.level - 1) * 0.6) +
          (W > 700 ? 1 : 0) +
          (W > 1100 ? 1 : 0),
      );
      G.rows = Math.min(
        compact ? 5 : 12,
        5 + Math.min(compact ? 1 : 6, G.level - 1) + (H > 800 ? 1 : 0),
      );
    }
    var maxGridH = Math.max(36, G.py - G.BR * 4 - G.gridY);
    G.gap = Math.max(2, Math.min(7, W * 0.008));
    G.bw = (fieldW - (G.cols - 1) * G.gap) / Math.max(1, G.cols);
    G.bh = Math.max(
      6,
      Math.min(
        compact ? 16 : 26,
        (maxGridH - (G.rows - 1) * G.gap) / Math.max(1, G.rows),
      ),
    );
    var i;
    for (i = 0; i < G.bricks.length; i++) {
      var b = G.bricks[i];
      b.x = G.gridX + b.c * (G.bw + G.gap);
      b.y = G.gridY + b.r * (G.bh + G.gap);
      b.w = G.bw;
      b.h = G.bh;
      b.hx = b.x + G.bw * 0.5;
      b.hy = b.y + G.bh * 0.5;
    }
    for (i = 0; i < G.balls.length; i++) {
      var ball = G.balls[i];
      ball.r = G.BR;
      if (ball.stuck) {
        ball.x = G.px + G.pw * 0.5;
        ball.y = G.py - ball.r - 1;
        ball.px = ball.x;
        ball.py = ball.y;
      } else {
        ball.x = clamp(ball.x, G.playL + ball.r, W - G.playR - ball.r);
        ball.y = Math.min(ball.y, H + ball.r + 2);
      }
    }
    if (G.boss) {
      G.boss.w = Math.min(G.boss.w, W - G.playL - G.playR);
      G.boss.x = clamp(G.boss.x, G.playL, W - G.playR - G.boss.w);
      G.boss.y = clamp(G.boss.y, G.gridY + 8, G.py - G.boss.h - G.BR * 10);
    }
    if (G.render) G.render.invalidate();
  }

  return { fit: fit, layoutPlay: layoutPlay, readInsets: readInsets };
}
