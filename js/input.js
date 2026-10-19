import { STATE } from "./const.js";

export function createInput(G, canvas) {
  var keys = { l: 0, r: 0 };
  var padL = 0,
    padPrev = {};
  var pointerId = null,
    downX = 0,
    downY = 0,
    moved = 0,
    mouseDown = false;
  G.touchMode = false;

  function canvasX(clientX) {
    var r = canvas.getBoundingClientRect();
    return ((clientX - r.left) / Math.max(1, r.width)) * G.W;
  }
  function onPointer(x) {
    G.ptx = x - G.pw * 0.5;
  }
  function resume() {
    G.audio.resumeAudio();
  }
  function uiTarget(el) {
    return !!(
      el &&
      el.closest &&
      el.closest("button, a, input, select, textarea, label")
    );
  }
  function down(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (uiTarget(e.target)) return;
    resume();
    G.touchMode = e.pointerType === "touch";
    if (G.state !== STATE.PLAY) return;
    e.preventDefault();
    pointerId = e.pointerId;
    downX = e.clientX;
    downY = e.clientY;
    moved = 0;
    mouseDown = e.pointerType === "mouse";
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) {}
    onPointer(canvasX(e.clientX));
    if (mouseDown) G.launch();
  }
  function move(e) {
    if (G.state !== STATE.PLAY) return;
    if (pointerId != null && e.pointerId !== pointerId) return;
    if (e.pointerType !== "mouse" && pointerId == null) return;
    var x = e.clientX,
      y = e.clientY;
    if (typeof e.getCoalescedEvents === "function") {
      var list = e.getCoalescedEvents();
      if (list && list.length) {
        x = list[list.length - 1].clientX;
        y = list[list.length - 1].clientY;
      }
    }
    if (Math.abs(x - downX) + Math.abs(y - downY) > 8) moved = 1;
    onPointer(canvasX(x));
  }
  function up(e) {
    if (pointerId == null || e.pointerId !== pointerId) return;
    if (G.state === STATE.PLAY && !mouseDown && !moved) G.launch();
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (err) {}
    pointerId = null;
    mouseDown = false;
    moved = 0;
  }
  function cancel(e) {
    if (pointerId !== null && e.pointerId === pointerId) {
      pointerId = null;
      mouseDown = false;
      moved = 0;
    }
  }

  canvas.addEventListener("pointerdown", down, { passive: false });
  canvas.addEventListener("pointermove", move, { passive: true });
  canvas.addEventListener("pointerup", up, { passive: true });
  canvas.addEventListener("pointercancel", cancel, { passive: true });
  canvas.addEventListener(
    "contextmenu",
    function (e) {
      e.preventDefault();
    },
    { passive: false },
  );
  window.addEventListener("pointerdown", resume, { passive: true });

  function editing(el) {
    return !!(el && el.closest && el.closest("input, textarea, select"));
  }
  window.addEventListener("keydown", function (e) {
    if (editing(e.target)) return;
    var k = e.key;
    resume();
    if (k === "ArrowLeft" || k === "a" || k === "A") {
      keys.l = 1;
      e.preventDefault();
    } else if (k === "ArrowRight" || k === "d" || k === "D") {
      keys.r = 1;
      e.preventDefault();
    } else if (k === " " || k === "Spacebar") {
      e.preventDefault();
      if (G.state === STATE.PLAY) {
        if (G.anyStuck()) G.launch();
        else G.setState(STATE.PAUSE);
      } else if (G.state === STATE.PAUSE) G.setState(STATE.PLAY);
      else G.action();
    } else if (k === "Escape" || k === "p" || k === "P") {
      if (G.state === STATE.PLAY) G.setState(STATE.PAUSE);
      else if (G.state === STATE.PAUSE) G.setState(STATE.PLAY);
    }
  });
  window.addEventListener("keyup", function (e) {
    var k = e.key;
    if (k === "ArrowLeft" || k === "a" || k === "A") keys.l = 0;
    else if (k === "ArrowRight" || k === "d" || k === "D") keys.r = 0;
  });

  function padPressed(p, j) {
    return !!(p.buttons[j] && p.buttons[j].pressed);
  }
  function padEdge(p, j) {
    var now = padPressed(p, j);
    var was = padPrev[j];
    padPrev[j] = now;
    return now && !was;
  }
  function pollGamepad() {
    if (!navigator.getGamepads) {
      padL = 0;
      return;
    }
    var pads = navigator.getGamepads();
    var p = null;
    for (var i = 0; i < pads.length; i++)
      if (pads[i] && pads[i].connected) {
        p = pads[i];
        break;
      }
    if (!p) {
      padL = 0;
      return;
    }
    var ax = p.axes[0] || 0;
    padL = Math.abs(ax) > 0.18 ? ax : 0;
    if (p.buttons[14] && p.buttons[14].pressed) padL = -1;
    if (p.buttons[15] && p.buttons[15].pressed) padL = 1;
    if (padEdge(p, 0)) {
      resume();
      if (G.state === STATE.PLAY) {
        if (G.anyStuck()) G.launch();
        else G.setState(STATE.PAUSE);
      } else if (G.state === STATE.PAUSE) G.setState(STATE.PLAY);
      else G.action();
    }
    if (padEdge(p, 9)) {
      if (G.state === STATE.PLAY) G.setState(STATE.PAUSE);
      else if (G.state === STATE.PAUSE) G.setState(STATE.PLAY);
    }
  }

  return {
    keys: keys,
    pollGamepad: pollGamepad,
    get padL() {
      return padL;
    },
  };
}
