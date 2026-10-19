export var STATE = { TITLE: 0, PLAY: 1, PAUSE: 2, CLEAR: 3, OVER: 4 };
export var APP_VER = "nb-v11";
export var FIXED = 1 / 120;
export var MAX_P = 240,
  MAX_SPARK = 60,
  MAX_STARS = 90,
  MAX_SHOT = 24,
  MAX_PU = 16,
  MAX_EMBER = 48,
  MAX_RING = 18;
export var TRAIL_CAP = 48,
  TRAIL_LIFE = 0.11;
export var PALETTES = {
  default: [
    ["#00f0ff", "#007a88"],
    ["#ff2bd6", "#8a106e"],
    ["#7dff4d", "#2f8a18"],
    ["#ffd166", "#9a6d12"],
    ["#7aa2ff", "#2a4aa0"],
    ["#ff6b4a", "#8a2814"],
    ["#c77dff", "#5a2a88"],
    ["#5ef0d0", "#1a7a68"],
  ],
  cb: [
    ["#56b4e9", "#1c6ea4"],
    ["#f0e442", "#a89800"],
    ["#009e73", "#006b4e"],
    ["#e69f00", "#9a6a00"],
    ["#cc79a7", "#8f4a6e"],
    ["#0072b2", "#004b78"],
    ["#d55e00", "#8a3c00"],
    ["#999999", "#5e5e5e"],
  ],
};
export var ACH = [
  { id: "first", n: "First Break", d: "Clear one level." },
  { id: "combo10", n: "Combo x10", d: "Chain ten bricks." },
  { id: "boss", n: "Boss Breaker", d: "Defeat a boss." },
  { id: "lvl5", n: "Deep Space", d: "Reach level 5." },
  { id: "lvl10", n: "Neon Legend", d: "Reach level 10." },
  { id: "million", n: "Over 9000", d: "Score 9000 points." },
  { id: "nohit", n: "Untouchable", d: "Clear a level without losing a life." },
  { id: "allpu", n: "Arsenal", d: "Collect six power-ups in one run." },
  { id: "fire", n: "Pyro", d: "Use the fireball." },
];
export var PU = [
  { k: "m", n: "Multi", c: "#00f0ff", d: 10, t: "MULTI" },
  { k: "w", n: "Wide", c: "#7dff4d", d: 14, t: "WIDE" },
  { k: "s", n: "Slow", c: "#7aa2ff", d: 10, t: "SLOW" },
  { k: "l", n: "Laser", c: "#ff2bd6", d: 10, t: "LASER" },
  { k: "f", n: "Fire", c: "#ffd166", d: 6, t: "FIRE" },
  { k: "x", n: "Life", c: "#ff5d7a", d: 0, t: "+1" },
];

export function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mixSeed(a, b, c) {
  var h =
    (a >>> 0) ^
    Math.imul((b | 0) + 0x9e3779b9, 0x85ebca6b) ^
    Math.imul((c | 0) + 0x7f4a7c15, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
}
