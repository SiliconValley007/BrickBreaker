import { dateSeed } from "./levels.js";
import { lsGet, lsSet } from "./storage.js";

export function dailyInfo(now) {
  var stamp = dateSeed(now);
  return { stamp: stamp, level: 1 + (stamp % 20) };
}

export function startDaily(G, now) {
  var d = dailyInfo(now);
  G.dailyMode = true;
  G.dailyStamp = d.stamp;
  G.levelSeed = d.stamp;
  G.level = d.level;
  lsSet("nb_daily", String(d.stamp));
  return d;
}

export function endDaily(G) {
  G.dailyMode = false;
  G.levelSeed = 0;
}

export function renderDaily(G) {
  var d = dailyInfo();
  var tag = G.$("dailyTag");
  var msg = G.$("dailyMsg");
  if (tag) tag.textContent = "Seed " + d.stamp;
  var prev = lsGet("nb_daily");
  if (msg) {
    msg.textContent =
      prev === String(d.stamp)
        ? "You already ran today's seed. Play again or wait for tomorrow."
        : "One seeded run. Same bricks for everyone today.";
  }
}
