import { ACH } from "./const.js";
import { lsSet, loadBool } from "./storage.js";
import { escapeHtml } from "./ui.js";

export function createAchievements(G) {
  function load() {
    var a = {};
    for (var i = 0; i < ACH.length; i++)
      a[ACH[i].id] = loadBool("nb_ach_" + ACH[i].id, false);
    return a;
  }
  function unlock(id) {
    if (!id || G.ach[id]) return;
    G.ach[id] = true;
    lsSet("nb_ach_" + id, "1");
    G.announce("Medal unlocked: " + id);
    G.sfx(9);
  }
  function saveStats() {
    lsSet("nb_runs", G.stats.runs);
    lsSet("nb_bricks", G.stats.bricks);
    lsSet("nb_best_combo", G.stats.bestCombo);
    lsSet("nb_bosses", G.stats.bosses);
    lsSet("nb_time", G.stats.time);
  }
  function fmtTime(s) {
    s = Math.floor(s || 0);
    return Math.floor(s / 60) + "m " + (s % 60) + "s";
  }
  function renderAch() {
    var el = G.$("achList");
    if (!el) return;
    var h = "";
    for (var i = 0; i < ACH.length; i++) {
      var a = ACH[i];
      var got = !!G.ach[a.id];
      h +=
        "<div class='ach" +
        (got ? " got" : "") +
        "'><span class='mark'>" +
        (got ? "OK" : "-") +
        "</span><div><b>" +
        escapeHtml(a.n) +
        "</b><span>" +
        escapeHtml(a.d) +
        "</span></div></div>";
    }
    el.innerHTML = h;
  }
  function renderStats() {
    var el = G.$("statList");
    if (!el) return;
    var stats = G.stats;
    el.innerHTML =
      "<table><tbody>" +
      "<tr><td>Runs</td><td>" +
      stats.runs +
      "</td></tr>" +
      "<tr><td>Bricks destroyed</td><td>" +
      stats.bricks +
      "</td></tr>" +
      "<tr><td>Best combo</td><td>x" +
      stats.bestCombo +
      "</td></tr>" +
      "<tr><td>Bosses defeated</td><td>" +
      stats.bosses +
      "</td></tr>" +
      "<tr><td>Time played</td><td>" +
      fmtTime(stats.time) +
      "</td></tr>" +
      "<tr><td>Best score</td><td>" +
      G.best +
      "</td></tr>" +
      "</tbody></table>";
  }
  return {
    load: load,
    unlock: unlock,
    saveStats: saveStats,
    renderAch: renderAch,
    renderStats: renderStats,
    fmtTime: fmtTime,
  };
}
