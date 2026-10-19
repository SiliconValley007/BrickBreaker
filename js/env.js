import { lsGet } from "./storage.js";
import { $ as $id, syncSwitch } from "./ui.js";

export function watchEnv(G, cfg) {
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
}

export function registerSW(showSwToast) {
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
