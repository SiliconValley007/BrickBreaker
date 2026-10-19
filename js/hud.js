import { DIFF, WORLDS, loadProgress } from "./levels.js";
import { lsGet, lsSet, exportJSON, importJSON } from "./storage.js";
import { escapeHtml } from "./ui.js";
import { renderDaily } from "./daily.js";

export function createHud(G) {
  function $(id) {
    return G.$(id);
  }
  function updateHUD() {
    G.scoreEl.textContent = G.score;
    G.levelEl.textContent = G.level;
    if (G.score > G.best) {
      G.best = G.score;
      lsSet("nb_best", G.best);
    }
    G.bestEl.textContent = G.best;
    var html = "",
      maxPips = Math.max(3, G.lives),
      i;
    for (i = 0; i < maxPips; i++)
      html += '<i class="pip' + (i < G.lives ? " on" : "") + '"></i>';
    G.livesEl.innerHTML = html;
  }
  function updatePwr() {
    var k, t, em;
    for (k in G.pwrEls) {
      t = G.puTimer[k] || 0;
      G.pwrEls[k].classList.toggle("on", t > 0);
      em = G.pwrEls[k].querySelector("em");
      if (em) em.textContent = t > 0 ? Math.ceil(t) : "";
    }
  }
  function applyDiff(key) {
    if (!DIFF[key]) key = "classic";
    G.diffKey = key;
    G.diff = DIFF[key];
    lsSet("nb_diff", key);
  }
  function renderWorlds() {
    var el = $("worldList");
    if (!el) return;
    var h = "",
      i,
      w,
      n,
      lvl,
      locked,
      stars,
      j;
    var max = G.progress.max || 1;
    for (i = 0; i < WORLDS.length; i++) {
      w = WORLDS[i];
      h +=
        "<div class='world-block'><h2>" +
        escapeHtml(w.n) +
        "</h2><div class='lv-row'>";
      for (n = 0; n < w.levels; n++) {
        lvl = i * 5 + n + 1;
        locked = lvl > max;
        stars = G.progress.stars[String(lvl)] || 0;
        h +=
          "<button class='lv' type='button' data-lv='" +
          lvl +
          "'" +
          (locked ? " disabled" : "") +
          ">" +
          lvl;
        h += "<span class='stars'>";
        for (j = 0; j < 3; j++) h += j < stars ? "*" : "-";
        h += "</span></button>";
      }
      h += "</div></div>";
    }
    el.innerHTML = h;
    var btns = el.querySelectorAll(".lv");
    for (i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () {
        var lv = +this.getAttribute("data-lv");
        if (!lv) return;
        G.resumeAudio();
        G.startLevel = lv;
        G.newGame(lv, false);
        G.setState(G.STATE.PLAY);
      });
    }
  }
  function bindMenus() {
    if ($("btnExport"))
      $("btnExport").addEventListener("click", function () {
        var box = $("saveBox");
        if (!box) return;
        box.hidden = false;
        box.value = exportJSON();
        try {
          box.select();
        } catch (e) {}
        G.announce("Save data ready to copy");
      });
    if ($("btnImport"))
      $("btnImport").addEventListener("click", function () {
        var box = $("saveBox");
        if (!box) return;
        box.hidden = false;
        if (!box.value) {
          G.announce("Paste save JSON then tap Import again");
          return;
        }
        if (importJSON(box.value)) {
          G.announce("Save imported. Reload to apply.");
          G.progress = loadProgress(lsGet);
        } else G.announce("Invalid save data");
      });
    if ($("diffSel")) {
      $("diffSel").value = G.diffKey;
      $("diffSel").addEventListener("change", function () {
        applyDiff(this.value);
      });
    }
  }
  return {
    updateHUD: updateHUD,
    updatePwr: updatePwr,
    applyDiff: applyDiff,
    renderWorlds: renderWorlds,
    renderDaily: function () {
      renderDaily(G);
    },
    bindMenus: bindMenus,
  };
}
