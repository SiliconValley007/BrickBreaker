var mem = Object.create(null);
var native = null;
var usable = false;
var noticed = false;
var onNotice = null;

try {
  native = globalThis.localStorage;
  if (native) {
    native.setItem("nb_probe", "1");
    native.removeItem("nb_probe");
    usable = true;
  }
} catch (e) {
  usable = false;
  native = null;
}

export function storageOk() {
  return usable;
}
export function onStorageNotice(fn) {
  onNotice = fn;
}
function notice() {
  if (noticed) return;
  noticed = true;
  if (onNotice) onNotice();
}
function readStore(k) {
  if (usable) {
    try {
      return native.getItem(k);
    } catch (e) {
      usable = false;
      notice();
    }
  }
  return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null;
}
function writeStore(k, v) {
  mem[k] = String(v);
  if (!usable) {
    notice();
    return;
  }
  try {
    native.setItem(k, String(v));
  } catch (e) {
    usable = false;
    notice();
  }
}

export function lsGet(k) {
  return readStore(k);
}
export function lsSet(k, v) {
  writeStore(k, v);
}
export function loadNum(k, d) {
  var v = lsGet(k);
  if (v == null || v === "") return d;
  var n = +v;
  return Number.isFinite(n) ? n : d;
}
export function loadBool(k, d) {
  var v = lsGet(k);
  return v == null ? d : v === "1";
}

var MAX_BYTES = 120000;
var KEYS = [
  "nb_vol",
  "nb_mute",
  "nb_shake",
  "nb_hit",
  "nb_haptics",
  "nb_motion",
  "nb_cb",
  "nb_init",
  "nb_best",
  "nb_scores",
  "nb_runs",
  "nb_bricks",
  "nb_best_combo",
  "nb_bosses",
  "nb_time",
  "nb_progress",
  "nb_diff",
  "nb_daily",
  "nb_tut",
  "nb_mus",
  "nb_sfx",
  "nb_bloom",
  "nb_chroma",
];

export function collectSave() {
  var o = { v: 1, t: Date.now(), data: {} };
  var i, k, a;
  for (i = 0; i < KEYS.length; i++) {
    k = KEYS[i];
    a = lsGet(k);
    if (a != null) o.data[k] = a;
  }
  var src = usable && native ? native : mem;
  for (k in src) {
    if (k.indexOf("nb_ach_") === 0) {
      a = lsGet(k);
      if (a != null) o.data[k] = a;
    }
  }
  return o;
}

export function validateSave(obj) {
  if (!obj || obj.v !== 1 || !obj.data || typeof obj.data !== "object")
    return null;
  var out = {},
    n = 0,
    k,
    v;
  for (k in obj.data) {
    if (!/^nb_[a-z0-9_]+$/i.test(k)) continue;
    v = obj.data[k];
    if (
      typeof v !== "string" &&
      typeof v !== "number" &&
      typeof v !== "boolean"
    )
      continue;
    v = String(v);
    n += k.length + v.length;
    if (n > MAX_BYTES) return null;
    out[k] = v;
  }
  return out;
}

export function applySave(data) {
  var k;
  for (k in data) lsSet(k, data[k]);
}

export function exportJSON() {
  var s = JSON.stringify(collectSave());
  if (s.length > MAX_BYTES) s = s.slice(0, MAX_BYTES);
  return s;
}

export function importJSON(text) {
  if (!text || text.length > MAX_BYTES) return false;
  try {
    var obj = JSON.parse(text);
    var data = validateSave(obj);
    if (!data) return false;
    applySave(data);
    return true;
  } catch (e) {
    return false;
  }
}

export function resetAll() {
  var k;
  for (k in mem) delete mem[k];
  if (!usable || !native) return;
  try {
    var drop = [],
      i;
    if (typeof native.key === "function" && native.length != null) {
      for (i = 0; i < native.length; i++) {
        k = native.key(i);
        if (k && String(k).indexOf("nb_") === 0) drop.push(k);
      }
    } else {
      for (k in native) if (String(k).indexOf("nb_") === 0) drop.push(k);
    }
    for (i = 0; i < drop.length; i++) native.removeItem(drop[i]);
  } catch (e) {}
}
