import { saveProgress } from "./levels.js";
import { lsGet, lsSet } from "./storage.js";
import { escapeHtml } from "./ui.js";

export function createScore(G) {
  function loadScores() {
    try {
      var a = JSON.parse(lsGet("nb_scores") || "[]");
      return Array.isArray(a)
        ? a
            .filter(function (s) {
              return s && typeof s.s === "number";
            })
            .slice(0, 8)
        : [];
    } catch (e) {
      return [];
    }
  }
  function saveScores(a) {
    lsSet("nb_scores", JSON.stringify(a.slice(0, 8)));
  }
  function recordStars(lvl, n) {
    var k = String(lvl);
    var prev = G.progress.stars[k] || 0;
    if (n > prev) G.progress.stars[k] = n;
    if (lvl + 1 > (G.progress.max || 1)) G.progress.max = lvl + 1;
    saveProgress(lsSet, G.progress);
  }
  function showCombo() {
    G.audio.setCombo(G.combo);
    if (G.combo < 2) {
      if (G.comboEl) G.comboEl.classList.remove("show");
      return;
    }
    if (G.comboEl) {
      G.comboEl.textContent = "COMBO x" + G.combo;
      G.comboEl.classList.add("show");
    }
    G.comboT = 0.7;
  }
  function renderScores() {
    var el = G.$("scoreList");
    var scores = G.scores;
    if (!el) return;
    if (!scores.length) {
      el.innerHTML = "<p class='msg'>No scores yet. Be the first.</p>";
      return;
    }
    var h =
      "<table><thead><tr><th>#</th><th>Name</th><th>Score</th><th>Lvl</th></tr></thead><tbody>";
    for (var i = 0; i < scores.length; i++) {
      var s = scores[i];
      h +=
        "<tr><td>" +
        (i + 1) +
        "</td><td>" +
        escapeHtml(s.n || "AAA") +
        "</td><td>" +
        (s.s || 0) +
        "</td><td>" +
        (s.l || 1) +
        "</td></tr>";
    }
    el.innerHTML = h + "</tbody></table>";
  }
  return {
    loadScores: loadScores,
    saveScores: saveScores,
    recordStars: recordStars,
    showCombo: showCombo,
    renderScores: renderScores,
  };
}
