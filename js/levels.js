import { mulberry32, mixSeed } from "./const.js";

export var PATTERNS = [
  ["#########", "#########", "#########", "..#####.."],
  [".#######.", "#.......#", "#.......#", "#...U...#", "#########"],
  ["#.#.#.#.#", ".#.#.#.#.", "#.#.#.#.#", ".#.#.#.#."],
  ["#########", "#.X...X.#", "#..EEE..#", "#.X...X.#", "#########"],
  ["..#####..", ".#######.", "#########", "#.X...X.#", "#..EEE..#"],
  ["#X#X#X#X#", "X.......X", "#..UUU..#", "#.......#", "X#X#X#X#X"],
  ["#########", "X.......X", "X.E...E.X", "X.......X", "#########"],
  ["R.R.R.R.R", ".#######.", "R.R.R.R.R", ".#######.", "R.R.R.R.R"],
  ["M.......M", ".#######.", "..#####..", ".#######.", "M.......M"],
  ["X#######X", "#.......#", "#..UUU..#", "#.......#", "X#######X"],
  ["###...###", "##.###.##", "#.#####.#", "##.###.##", "###...###"],
  ["X.X.X.X.X", ".X.X.X.X.", "X.X.X.X.X", ".X.X.X.X.", "X.X.X.X.X"],
  ["#########", "#########", "XX.XXX.XX", "#########", "#########"],
  ["E.......E", ".#######.", "#.UU.UU.#", ".#######.", "E.......E"],
  ["RR.....RR", ".#######.", "#.XXXXX.#", ".#######.", "RR.....RR"],
  ["#####M###", "####.####", "###...###", "##M...M##", "#.......#"],
  ["X#######X", "#X.....X#", "#.X...X.#", "#..X.X..#", "#...X...#"],
  ["##.....##", "##.###.##", "##.###.##", "##.###.##", "##.....##"],
  ["R#R#R#R#R", "#U#U#U#U#", "R#R#R#R#R", "#U#U#U#U#", "R#R#R#R#R"],
  ["###U###", "##...##", "#..E..#", "##.M.##", "###U###"],
  ["X.......X", ".XXXXXXX.", "..XXXXX..", "...XXX...", "....X...."],
  ["#########", "#EEEEE..#", "#.M...M.#", "#.......#", "#########"],
];

export var WORLDS = [
  {
    id: 0,
    n: "Neon Grid",
    levels: 5,
    bg: [5, 6, 15],
    glow: "rgba(0,80,140,.22)",
    pal: 0,
  },
  {
    id: 1,
    n: "Magenta Storm",
    levels: 5,
    bg: [18, 4, 22],
    glow: "rgba(140,0,90,.24)",
    pal: 1,
  },
  {
    id: 2,
    n: "Toxic Reef",
    levels: 5,
    bg: [4, 18, 12],
    glow: "rgba(20,90,40,.22)",
    pal: 2,
  },
  {
    id: 3,
    n: "Solar Forge",
    levels: 5,
    bg: [20, 10, 4],
    glow: "rgba(120,60,10,.22)",
    pal: 3,
  },
  {
    id: 4,
    n: "Deep Void",
    levels: 5,
    bg: [4, 4, 12],
    glow: "rgba(40,20,90,.24)",
    pal: 4,
  },
];

export var DIFF = {
  chill: { n: "Chill", lives: 5, spd: 0.78, drop: 0.16 },
  classic: { n: "Classic", lives: 3, spd: 1, drop: 0.12 },
  insane: { n: "Insane", lives: 2, spd: 1.28, drop: 0.08 },
};

export function worldOf(level) {
  var i = Math.min(WORLDS.length - 1, Math.floor((Math.max(1, level) - 1) / 5));
  return WORLDS[i];
}

export function dateSeed(d) {
  d = d || new Date();
  return (
    d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
  );
}

export function runSeedFor(seed, level, salt) {
  return mixSeed(seed, level, salt || 0);
}

export function rng(seed) {
  return mulberry32(seed | 0);
}

export function loadProgress(lsGet) {
  try {
    var a = JSON.parse(lsGet("nb_progress") || "{}");
    if (!a || typeof a !== "object") a = {};
    if (!a.stars) a.stars = {};
    if (!a.max) a.max = 1;
    return a;
  } catch (e) {
    return { stars: {}, max: 1 };
  }
}

export function saveProgress(lsSet, p) {
  lsSet(
    "nb_progress",
    JSON.stringify({ stars: p.stars || {}, max: p.max || 1 }),
  );
}

export function starsFor(livesLeft, startLives) {
  if (livesLeft >= startLives) return 3;
  if (livesLeft >= startLives - 1) return 2;
  return 1;
}
