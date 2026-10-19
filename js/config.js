import { loadNum, loadBool, lsGet } from "./storage.js";

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
