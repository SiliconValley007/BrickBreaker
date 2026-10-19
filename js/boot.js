import { onStorageNotice, resetAll, storageOk } from "./storage.js";
import { $ } from "./ui.js";

function showErr(msg) {
  var el = $("errOverlay");
  var t = $("errMsg");
  if (t) t.textContent = msg || "Something went wrong.";
  if (el) {
    el.hidden = false;
    el.classList.remove("hidden");
  }
}

window.addEventListener("error", function (e) {
  showErr(e && e.message ? e.message : "Unexpected error");
});
window.addEventListener("unhandledrejection", function (e) {
  var r = e && e.reason;
  showErr(r && r.message ? r.message : String(r || "Unhandled rejection"));
});

function showStoreNotice() {
  var n = $("storeNotice");
  if (n) n.hidden = false;
}
onStorageNotice(showStoreNotice);
if (!storageOk()) showStoreNotice();

var reload = $("btnReload");
if (reload)
  reload.addEventListener("click", function () {
    location.reload();
  });
var reset = $("btnResetData");
if (reset)
  reset.addEventListener("click", function () {
    resetAll();
    location.reload();
  });

import("./main.js").catch(function (e) {
  showErr(e && e.message ? e.message : String(e));
});
