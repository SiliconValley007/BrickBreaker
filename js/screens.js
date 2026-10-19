import { APP_VER, PALETTES, STATE } from "./const.js";
import { loadNum, loadBool, lsGet, lsSet } from "./storage.js";
import {
  $ as $id,
  setPanel as showPanel,
  syncSwitch,
  trapFocus,
} from "./ui.js";
import { endDaily } from "./daily.js";
import { worldOf } from "./levels.js";

export function createConfig() {
  var reduceMQ =
    window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)");
  var motionStored = lsGet("nb_motion");
  return {
    vol: Math.max(0, Math.min(100, loadNum("nb_vol", 70))),
    mute: loadBool("nb_mute", false),
    shake: loadBool("nb_shake", true),
    hitstop: loadBool("nb_hit", true),
    haptics: loadBool("nb_haptics", true),
    motion:
      motionStored == null
        ? !!(reduceMQ && reduceMQ.matches)
        : motionStored === "1",
    cb: loadBool("nb_cb", false),
    bloom: loadBool("nb_bloom", true),
    chroma: loadBool("nb_chroma", true),
    mus: Math.max(0, Math.min(100, loadNum("nb_mus", 70))),
    sfx: Math.max(0, Math.min(100, loadNum("nb_sfx", 70))),
  };
}

export function createScreens(G) {
  var cfg = G.cfg;
  var panels = {
    title: $id("pTitle"),
    pause: $id("pPause"),
    clear: $id("pClear"),
    over: $id("pOver"),
    set: $id("pSet"),
    scores: $id("pScores"),
    ach: $id("pAch"),
    stats: $id("pStats"),
    levels: $id("pLevels"),
    daily: $id("pDaily"),
    tut: $id("pTut"),
  };
  var liveEl = $id("live");
  var pauseBtn = $id("pauseBtn");
  var muteFab = $id("muteFab");
  var overlay = $id("overlay");
  var hud = $id("hud");
  var nameIn = $id("nameIn");
  var metaFrom = "title";
  var swToast = 0;

  function announce(t) {
    if (liveEl) liveEl.textContent = t;
  }
  function setPanel(name) {
    showPanel(panels, overlay, name);
    var el = panels[name];
    if (el) trapFocus(el);
  }
  function setMusic() {
    G.audio.syncMusic(G.level, G.boss, G.combo);
    G.audio.startMusic();
  }
  function onState(s) {
    if (s === STATE.PLAY) {
      overlay.classList.add("hidden");
      hud.hidden = false;
      pauseBtn.classList.add("show");
      muteFab.classList.add("show");
      hud.setAttribute("aria-hidden", "false");
      setMusic();
      G.audio.duck(false);
    } else {
      G.audio.duck(true);
      overlay.classList.remove("hidden");
      pauseBtn.classList.remove("show");
      muteFab.classList.remove("show");
      if (s === STATE.TITLE) hud.hidden = true;
      if (s === STATE.PAUSE) {
        var tag = $id("pauseTag");
        if (tag) tag.textContent = "Level " + G.level;
        setPanel("pause");
      }
    }
  }
  function onFinish(info) {
    if (!info) return;
    nameIn.value = (lsGet("nb_init") || "AAA").slice(0, 3).toUpperCase();
    $id("overTag").textContent = "Level " + info.level;
    $id("overMsg").textContent =
      "Final score " +
      info.score +
      (info.score >= info.best ? " - new best." : " - best " + info.best + ".");
    setPanel("over");
  }
  function onLevelClear(info) {
    if (!info) return;
    var w = worldOf(info.level);
    $id("clearTag").textContent =
      (info.daily ? "" : w ? w.n + " - " : "") +
      (info.daily ? "Daily" : "Level " + info.level) +
      " complete";
    $id("clearMsg").textContent =
      "Score " +
      info.score +
      " - " +
      info.stars +
      " star" +
      (info.stars === 1 ? "" : "s") +
      (info.daily ? " - daily clear." : " - density and speed are climbing.");
    var nextBtn = $id("btnNext");
    if (nextBtn) nextBtn.textContent = info.daily ? "Title" : "Next Level";
    setPanel("clear");
  }
  function openPanel(name) {
    if (G.state === STATE.PLAY) {
      metaFrom = "pause";
      G.setState(STATE.PAUSE);
    } else if (G.state === STATE.PAUSE) metaFrom = "pause";
    else if (G.state === STATE.OVER) metaFrom = "over";
    else metaFrom = "title";
    setPanel(name);
    overlay.classList.remove("hidden");
    if (name === "scores") G.renderScores();
    if (name === "ach") G.renderAch();
    if (name === "stats") G.renderStats();
    if (name === "levels") G.hudApi.renderWorlds();
    if (name === "daily") G.hudApi.renderDaily();
  }
  function backTo(panel) {
    setPanel(panel);
    if (panel === "title") {
      G.audio.stopMusic();
      G.setState(STATE.TITLE);
    } else if (panel === "pause") G.setState(STATE.PAUSE);
    else if (panel === "over") G.setState(STATE.OVER);
  }
  function toTitle() {
    G.audio.stopMusic();
    setPanel("title");
    G.setState(STATE.TITLE);
  }
  function action() {
    G.audio.resumeAudio();
    if (G.state === STATE.TITLE || G.state === STATE.OVER) {
      G.newGame();
      G.setState(STATE.PLAY);
    } else if (G.state === STATE.PAUSE) {
      G.setState(STATE.PLAY);
    } else if (G.state === STATE.CLEAR) {
      if (G.dailyMode) {
        endDaily(G);
        toTitle();
        return;
      }
      G.nextLevel();
      G.setState(STATE.PLAY);
    }
  }
  function setMute(m) {
    cfg.mute = m;
    lsSet("nb_mute", m ? "1" : "0");
    G.audio.applyGains();
    muteFab.textContent = m ? "MUTE" : "SND";
    muteFab.setAttribute("aria-label", m ? "Unmute" : "Mute");
    syncSwitch($id("swMute"), m);
    if (!m) G.audio.resumeAudio();
  }
  function bindSwitch(id, key, store, extra) {
    var el = $id(id);
    if (!el) return;
    syncSwitch(el, !!cfg[key]);
    el.addEventListener("click", function () {
      cfg[key] = !cfg[key];
      lsSet(store, cfg[key] ? "1" : "0");
      syncSwitch(el, cfg[key]);
      if (extra) extra();
    });
  }
  function bindGain(id, key, store) {
    var el = $id(id);
    if (!el) return;
    el.value = cfg[key];
    el.addEventListener("input", function () {
      cfg[key] = +this.value;
      lsSet(store, cfg[key]);
      G.audio.applyGains();
    });
  }
  function bindMenu() {
    if ($id("btnSet"))
      $id("btnSet").addEventListener("click", function () {
        openPanel("set");
      });
    if ($id("btnPauseSet"))
      $id("btnPauseSet").addEventListener("click", function () {
        openPanel("set");
      });
    if ($id("btnScores"))
      $id("btnScores").addEventListener("click", function () {
        openPanel("scores");
      });
    if ($id("btnOverScores"))
      $id("btnOverScores").addEventListener("click", function () {
        openPanel("scores");
      });
    if ($id("btnAch"))
      $id("btnAch").addEventListener("click", function () {
        openPanel("ach");
      });
    if ($id("btnStats"))
      $id("btnStats").addEventListener("click", function () {
        openPanel("stats");
      });
    if ($id("btnLevels"))
      $id("btnLevels").addEventListener("click", function () {
        openPanel("levels");
      });
    if ($id("btnDaily"))
      $id("btnDaily").addEventListener("click", function () {
        openPanel("daily");
      });
    if ($id("btnTut"))
      $id("btnTut").addEventListener("click", function () {
        openPanel("tut");
      });
    if ($id("btnSetBack"))
      $id("btnSetBack").addEventListener("click", function () {
        backTo(metaFrom);
      });
    if ($id("btnScBack"))
      $id("btnScBack").addEventListener("click", function () {
        backTo(metaFrom);
      });
    if ($id("btnAchBack"))
      $id("btnAchBack").addEventListener("click", function () {
        backTo(metaFrom);
      });
    if ($id("btnStBack"))
      $id("btnStBack").addEventListener("click", function () {
        backTo(metaFrom);
      });
    if ($id("btnLvBack"))
      $id("btnLvBack").addEventListener("click", function () {
        backTo("title");
      });
    if ($id("btnDailyBack"))
      $id("btnDailyBack").addEventListener("click", function () {
        backTo("title");
      });
    if ($id("btnTutBack"))
      $id("btnTutBack").addEventListener("click", function () {
        backTo("title");
      });
    if ($id("btnTutGo"))
      $id("btnTutGo").addEventListener("click", function () {
        lsSet("nb_tut", "1");
        G.audio.resumeAudio();
        G.newGame(1, false);
        G.setState(STATE.PLAY);
      });
    if ($id("btnDailyGo"))
      $id("btnDailyGo").addEventListener("click", function () {
        G.audio.resumeAudio();
        G.newGame(1, true);
        G.setState(STATE.PLAY);
      });
    if ($id("action")) $id("action").addEventListener("click", action);
    if ($id("btnAgain")) $id("btnAgain").addEventListener("click", action);
    if ($id("btnNext"))
      $id("btnNext").addEventListener("click", function () {
        G.audio.resumeAudio();
        if (G.dailyMode && G.state === STATE.CLEAR) {
          endDaily(G);
          toTitle();
          return;
        }
        G.nextLevel();
        G.setState(STATE.PLAY);
      });
    if ($id("btnResume"))
      $id("btnResume").addEventListener("click", function () {
        G.setState(STATE.PLAY);
      });
    if ($id("btnQuit")) $id("btnQuit").addEventListener("click", toTitle);
    if ($id("btnOverTitle"))
      $id("btnOverTitle").addEventListener("click", toTitle);
    pauseBtn.addEventListener("click", function () {
      if (G.state === STATE.PLAY) G.setState(STATE.PAUSE);
      else if (G.state === STATE.PAUSE) G.setState(STATE.PLAY);
    });
    muteFab.addEventListener("click", function () {
      setMute(!cfg.mute);
    });
    if ($id("swMute"))
      $id("swMute").addEventListener("click", function () {
        setMute(!cfg.mute);
      });
    bindSwitch("swShake", "shake", "nb_shake");
    bindSwitch("swHit", "hitstop", "nb_hit");
    bindSwitch("swHaptics", "haptics", "nb_haptics");
    bindSwitch("swMotion", "motion", "nb_motion", function () {
      G.reduce = cfg.motion;
    });
    bindSwitch("swCb", "cb", "nb_cb", function () {
      G.PAL = PALETTES[cfg.cb ? "cb" : "default"];
      G.rebuildBallGfx();
      G.render.invalidate();
    });
    bindSwitch("swBloom", "bloom", "nb_bloom");
    bindSwitch("swChroma", "chroma", "nb_chroma");
    if ($id("vol")) {
      $id("vol").value = cfg.vol;
      $id("vol").addEventListener("input", function () {
        cfg.vol = +this.value;
        lsSet("nb_vol", cfg.vol);
      });
    }
    bindGain("volMus", "mus", "nb_mus");
    bindGain("volSfx", "sfx", "nb_sfx");
    if ($id("nameIn"))
      $id("nameIn").addEventListener("input", function () {
        this.value =
          this.value
            .replace(/[^a-zA-Z0-9]/g, "")
            .toUpperCase()
            .slice(0, 3) || "AAA";
        lsSet("nb_init", this.value);
      });
    if ($id("btnShare"))
      $id("btnShare").addEventListener("click", function () {
        var text =
          "NEON BREAK - score " + G.score + " on level " + G.level + ".";
        if (navigator.share) {
          navigator
            .share({ title: "NEON BREAK", text: text, url: location.href })
            .catch(function () {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(text + " " + location.href).then(
            function () {
              announce("Score copied to clipboard");
            },
            function () {
              announce(text);
            },
          );
        } else announce(text);
      });
    if (G.hudApi) G.hudApi.bindMenus();
  }
  function showSwToast() {
    var t = $id("swToast");
    if (!t || swToast) return;
    t.hidden = false;
    swToast = 1;
    t.onclick = function () {
      location.reload();
    };
  }
  function boot() {
    syncSwitch($id("swMute"), cfg.mute);
    setMute(cfg.mute);
    syncSwitch($id("swShake"), cfg.shake);
    syncSwitch($id("swHit"), cfg.hitstop);
    syncSwitch($id("swHaptics"), cfg.haptics);
    syncSwitch($id("swMotion"), cfg.motion);
    syncSwitch($id("swCb"), cfg.cb);
    syncSwitch($id("swBloom"), cfg.bloom);
    syncSwitch($id("swChroma"), cfg.chroma);
    if ($id("vol")) $id("vol").value = cfg.vol;
    if ($id("volMus")) $id("volMus").value = cfg.mus;
    if ($id("volSfx")) $id("volSfx").value = cfg.sfx;
    if ($id("diffSel")) $id("diffSel").value = G.diffKey;
    nameIn.value = (lsGet("nb_init") || "AAA").slice(0, 3).toUpperCase();
    var contrastMQ =
      window.matchMedia && matchMedia("(prefers-contrast: more)");
    function syncContrast() {
      document.documentElement.classList.toggle(
        "hc",
        !!(contrastMQ && contrastMQ.matches),
      );
    }
    syncContrast();
    if (contrastMQ && contrastMQ.addEventListener)
      contrastMQ.addEventListener("change", syncContrast);
    var reduceMQ =
      window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMQ && reduceMQ.addEventListener)
      reduceMQ.addEventListener("change", function () {
        if (lsGet("nb_motion") == null) {
          cfg.motion = reduceMQ.matches;
          G.reduce = cfg.motion;
          syncSwitch($id("swMotion"), cfg.motion);
        }
      });
    if (location.search.indexOf("daily=1") >= 0 && panels.daily)
      setPanel("daily");
    else if (!loadBool("nb_tut", false) && panels.tut) setPanel("tut");
    else setPanel("title");
    var verEl = $id("appVer");
    if (verEl) verEl.textContent = APP_VER;
    if (navigator.serviceWorker && location.protocol !== "file:") {
      navigator.serviceWorker
        .register("sw.js")
        .then(function (reg) {
          if (reg.waiting) showSwToast();
          reg.addEventListener("updatefound", function () {
            var w = reg.installing;
            if (!w) return;
            w.addEventListener("statechange", function () {
              if (w.state === "installed" && navigator.serviceWorker.controller)
                showSwToast();
            });
          });
        })
        .catch(function () {});
    }
  }

  G.action = action;
  G.onState = onState;
  G.onFinish = onFinish;
  G.onLevelClear = onLevelClear;
  G.openPanel = openPanel;
  G.backTo = backTo;
  G.toTitle = toTitle;
  G.setPanel = setPanel;
  G.showSwToast = showSwToast;
  G.announce = announce;
  bindMenu();
  return { boot: boot, setPanel: setPanel, action: action, announce: announce };
}
