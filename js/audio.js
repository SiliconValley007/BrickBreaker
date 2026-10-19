export function createAudio(cfg) {
  var ac = null,
    master = null,
    musicGain = null,
    sfxGain = null,
    musicTimer = null,
    musicBar = 0;
  var SCALE = [0, 3, 5, 7, 10];
  var comboPitch = 0;
  var musicRef = { level: 1, boss: null, combo: 0 };

  function audioCtx() {
    if (ac) return;
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    try {
      ac = new C();
    } catch (e) {
      return;
    }
    master = ac.createGain();
    master.gain.value = cfg.mute ? 0 : 1;
    master.connect(ac.destination);
    sfxGain = ac.createGain();
    sfxGain.gain.value = ((cfg.sfx == null ? 70 : cfg.sfx) / 100) * 0.3;
    sfxGain.connect(master);
    musicGain = ac.createGain();
    musicGain.gain.value = ((cfg.mus == null ? 70 : cfg.mus) / 100) * 0.12;
    musicGain.connect(master);
  }
  function resumeAudio() {
    audioCtx();
    if (ac && ac.state === "suspended") {
      try {
        ac.resume();
      } catch (e) {}
    }
  }
  function applyGains() {
    if (master) master.gain.value = cfg.mute ? 0 : 1;
    if (sfxGain)
      sfxGain.gain.value = ((cfg.sfx == null ? 70 : cfg.sfx) / 100) * 0.3;
    if (musicGain)
      musicGain.gain.value = ((cfg.mus == null ? 70 : cfg.mus) / 100) * 0.12;
  }
  function duck(on) {
    if (!musicGain || !ac || cfg.mute) return;
    var t = ac.currentTime;
    var v = ((cfg.mus == null ? 70 : cfg.mus) / 100) * 0.12;
    musicGain.gain.cancelScheduledValues(t);
    musicGain.gain.setValueAtTime(musicGain.gain.value, t);
    musicGain.gain.linearRampToValueAtTime(on ? v * 0.32 : v, t + 0.08);
  }
  function tone(f, d, type, v, slide, dest) {
    if (cfg.mute || !ac) return;
    if (ac.state === "suspended") resumeAudio();
    var t = ac.currentTime,
      o = ac.createOscillator(),
      g = ac.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(f, t);
    if (slide)
      o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v || 0.1, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    g.connect(dest || sfxGain);
    o.start(t);
    o.stop(t + d + 0.03);
  }
  function noise(d, v, dest, filterFreq) {
    if (cfg.mute || !ac) return;
    var n = Math.floor(ac.sampleRate * d),
      buf = ac.createBuffer(1, n, ac.sampleRate),
      ch = buf.getChannelData(0);
    for (var i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n); // cosmetic noise
    var src = ac.createBufferSource(),
      g = ac.createGain();
    src.buffer = buf;
    g.gain.value = v || 0.15;
    if (filterFreq) {
      var f = ac.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = filterFreq;
      src.connect(f);
      f.connect(g);
    } else src.connect(g);
    g.connect(dest || sfxGain);
    src.start();
  }
  function pitchFor(kind) {
    if (kind !== 1 && kind !== 3 && kind !== 5 && kind !== 6 && kind !== 10)
      return 1;
    return 1 + Math.min(0.55, comboPitch * 0.035);
  }
  function sfx(kind) {
    if (cfg.mute) return;
    resumeAudio();
    if (!ac) return;
    var p = pitchFor(kind);
    if (kind === 1) tone(620 * p, 0.05, "square", 0.07);
    else if (kind === 2) tone(190, 0.1, "triangle", 0.12, 80);
    else if (kind === 3) {
      tone(880 * p, 0.06, "square", 0.09);
      tone(1320 * p, 0.08, "triangle", 0.05);
    } else if (kind === 4) {
      tone(220, 0.35, "sawtooth", 0.13, 50);
      tone(110, 0.45, "square", 0.08, 35);
    } else if (kind === 5) {
      tone(520 * p, 0.12, "square", 0.1);
      tone(780 * p, 0.18, "triangle", 0.07);
    } else if (kind === 6) tone(340 * p, 0.05, "sine", 0.05);
    else if (kind === 7) {
      tone(240, 0.2, "sawtooth", 0.1, 90);
      noise(0.12, 0.12);
    } else if (kind === 8) {
      tone(980, 0.08, "square", 0.09, 1500);
      tone(1470, 0.1, "sine", 0.05);
    } else if (kind === 9) {
      tone(660, 0.1, "triangle", 0.1);
      tone(990, 0.14, "triangle", 0.08);
      tone(1320, 0.18, "sine", 0.06);
    } else if (kind === 10) tone(1200 * p, 0.05, "square", 0.07, 300);
    else if (kind === 11) {
      tone(300, 0.15, "square", 0.1, 60);
      noise(0.1, 0.1);
    }
  }
  function musicStep() {
    if (!ac || cfg.mute) {
      musicTimer = setTimeout(musicStep, 400);
      return;
    }
    var level = musicRef.level,
      boss = musicRef.boss,
      combo = musicRef.combo;
    var intensity = Math.min(
      1,
      (level - 1) / 14 + (boss ? 0.45 : 0) + Math.min(0.3, combo * 0.012),
    );
    var bpm = 104 + intensity * 46;
    var beat = 60 / bpm;
    var root = 110 * Math.pow(2, ((level % 5) * 2) / 12);
    var arp = [0, 2, 4, 2, 1, 3, 4, 3];
    for (var i = 0; i < 8; i++) {
      var deg = arp[i] % 5;
      var f = root * Math.pow(2, SCALE[deg] / 12) * (i > 3 ? 2 : 1);
      tone(
        f,
        beat * 0.42,
        intensity > 0.55 ? "sawtooth" : "triangle",
        0.038 + intensity * 0.018,
        f * 1.002,
        musicGain,
      );
    }
    var bass = root / 2;
    tone(
      bass,
      beat * 1.6,
      "sawtooth",
      0.045 + intensity * 0.02,
      bass * 0.99,
      musicGain,
    );
    if (musicBar % 2 === 0) {
      tone(bass * 1.5, beat * 0.9, "sine", 0.025, bass * 1.5, musicGain);
      tone(bass * 2, beat * 0.9, "sine", 0.018, bass * 2, musicGain);
    }
    if (intensity > 0.32)
      noise(0.035, 0.018 + intensity * 0.02, musicGain, 6200);
    if (intensity > 0.62)
      noise(0.02, 0.012 + intensity * 0.015, musicGain, 9000);
    if (musicBar % 4 === 0)
      tone(root * 3, beat * 0.5, "sine", 0.03, root * 3.01, musicGain);
    if (boss && musicBar % 2 === 1)
      tone(root * 0.75, beat * 0.3, "square", 0.025, root * 0.7, musicGain);
    musicBar++;
    musicTimer = setTimeout(musicStep, beat * 4 * 1000);
  }
  function startMusic() {
    resumeAudio();
    if (!ac || musicTimer) return;
    musicBar = 0;
    musicStep();
  }
  function stopMusic() {
    if (musicTimer) {
      clearTimeout(musicTimer);
      musicTimer = null;
    }
  }
  function syncMusic(level, boss, combo) {
    musicRef.level = level;
    musicRef.boss = boss;
    musicRef.combo = combo;
  }
  function setCombo(combo) {
    comboPitch = combo < 2 ? 0 : combo;
  }
  return {
    resumeAudio: resumeAudio,
    sfx: sfx,
    startMusic: startMusic,
    stopMusic: stopMusic,
    applyGains: applyGains,
    duck: duck,
    syncMusic: syncMusic,
    setCombo: setCombo,
  };
}
