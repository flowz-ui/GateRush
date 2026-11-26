'use strict';
/* ============================================================
   FLEX RUSH  -  util.js
   Küçük yardımcılar, çeviri, kayıt sistemi, ses ve titreşim
   ============================================================ */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash1(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

/* ---------------- çeviri ---------------- */
const I18N = { lang: 'en' };
function T(en, tr) { return I18N.lang === 'tr' ? tr : en; }
function detectLang() {
  const l = ((navigator.language || navigator.userLanguage || 'en') + '').toLowerCase();
  return l.indexOf('tr') === 0 ? 'tr' : 'en';
}

/* ---------------- kayıt ---------------- */
const SAVE_KEY = 'flexrush_save_v1';
const Save = {
  d: null,
  defaults() {
    return {
      v: 1, coins: 0, level: 1, best: 0, runs: 0,
      owned: { body: [0], hat: [0] }, eq: { body: 0, hat: 0 },
      up: { power: 0, income: 0, stamina: 0 },
      set: { music: 1, sfx: 1, vib: 1, quality: 2, sens: 1, lang: '' },
      daily: { last: '', streak: 0 }, adAt: 0, tut: 0, lastPlay: 0, noAds: 0
    };
  },
  merge(def, src) {
    if (!src || typeof src !== 'object') return def;
    for (const k in def) {
      if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k])) def[k] = this.merge(def[k], src[k]);
      else if (src[k] !== undefined) def[k] = src[k];
    }
    return def;
  },
  load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { raw = null; }
    this.d = this.merge(this.defaults(), raw);
    I18N.lang = this.d.set.lang || detectLang();
    return this.d;
  },
  save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.d)); } catch (e) { /* özel mod vb. */ } },
  reset() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } this.load(); },
  owns(kind, id) { return this.d.owned[kind].indexOf(id) >= 0; },
  give(kind, id) { if (!this.owns(kind, id)) this.d.owned[kind].push(id); },
  addCoins(n) { this.d.coins = Math.max(0, Math.floor(this.d.coins + n)); },
  todayStr() { const t = new Date(); return t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate(); }
};

/* ---------------- titreşim ---------------- */
const Haptic = {
  buzz(ms) {
    if (!Save.d || !Save.d.set.vib) return;
    try {
      if (window.AndroidBridge && window.AndroidBridge.vibrate) window.AndroidBridge.vibrate(ms | 0);
      else if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) { }
  }
};

/* ---------------- ses (WebAudio ile sentezlenir, dosya gerekmez) ---------------- */
const Snd = (() => {
  let ctx = null, master = null, sfx = null, mus = null, noiseBuf = null;
  let musicOn = false, timer = null, step = 0, nextT = 0, intensity = 0;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try {
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
        sfx = ctx.createGain(); sfx.gain.value = 0.8; sfx.connect(master);
        mus = ctx.createGain(); mus.gain.value = 0.26; mus.connect(master);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { ctx = null; return false; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function tone(f, dur, type, vol, slideTo, delay, dest) {
    const t0 = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || sfx);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(dur, vol, freq, delay, dest, q) {
    const t0 = ctx.currentTime + (delay || 0);
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = q || 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(dest || sfx);
    s.start(t0); s.stop(t0 + dur + 0.05);
  }

  const lib = {
    click() { tone(660, 0.07, 'triangle', 0.25, 880); },
    back() { tone(520, 0.08, 'triangle', 0.22, 380); },
    coin(p) { const b = 880 * (1 + (p || 0) * 0.06); tone(b, 0.09, 'square', 0.12); tone(b * 1.5, 0.16, 'square', 0.12, 0, 0.07); },
    dumb(p) { tone(300, 0.1, 'sawtooth', 0.14, 520); tone(620 + (p || 0) * 40, 0.14, 'triangle', 0.2, 0, 0.06); },
    good() { tone(440, 0.1, 'triangle', 0.25); tone(554, 0.1, 'triangle', 0.25, 0, 0.07); tone(659, 0.22, 'triangle', 0.28, 0, 0.14); },
    bad() { tone(300, 0.28, 'sawtooth', 0.22, 110); noise(0.18, 0.18, 400); },
    burger() { tone(180, 0.2, 'square', 0.18, 70); noise(0.12, 0.14, 900); },
    smash() { noise(0.45, 0.6, 320, 0, null, 0.5); tone(120, 0.35, 'sine', 0.5, 40); noise(0.3, 0.3, 2400, 0.02); },
    thud() { tone(90, 0.3, 'sine', 0.55, 40); noise(0.1, 0.3, 200); },
    swing() { noise(0.28, 0.22, 1800, 0, null, 1.5); },
    whoosh() { noise(0.35, 0.16, 900, 0, null, 0.6); },
    tick(p) { tone(900 + (p || 0) * 30, 0.03, 'square', 0.08); },
    bell() { [1319, 1760, 2093].forEach((f, i) => tone(f, 1.2, 'sine', 0.22, 0, i * 0.02)); tone(660, 1.3, 'triangle', 0.15); },
    win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.26, 'triangle', 0.26, 0, i * 0.09)); tone(1568, 0.6, 'sine', 0.2, 0, 0.5); },
    fail() { tone(392, 0.3, 'sawtooth', 0.2, 330); tone(330, 0.3, 'sawtooth', 0.2, 262, 0.22); tone(262, 0.55, 'sawtooth', 0.22, 160, 0.44); },
    buy() { tone(784, 0.1, 'square', 0.14); tone(988, 0.1, 'square', 0.14, 0, 0.08); tone(1318, 0.26, 'square', 0.16, 0, 0.16); },
    pop() { tone(500, 0.1, 'sine', 0.3, 900); },
    flex() { tone(150, 0.25, 'sawtooth', 0.16, 300); tone(300, 0.3, 'triangle', 0.18, 600, 0.05); }
  };

  /* müzik: basit bir döngü (bas + arp + davul) */
  const BASS = [65.41, 51.91, 77.78, 58.27];                 // Cm, Ab, Eb, Bb kökleri
  const CH = [[0, 3, 7, 12], [0, 4, 7, 12], [0, 4, 7, 12], [0, 4, 7, 12]];
  const ROOT = [261.63, 207.65, 311.13, 233.08];
  function scheduleStep(s, t) {
    const bar = ((s / 16) | 0) % 4, i = s % 16;
    const dt = t - ctx.currentTime;
    if (i % 2 === 0) {
      const ch = CH[bar], n = ch[(i / 2 + (i > 7 ? 1 : 0)) % 4];
      tone(ROOT[bar] * Math.pow(2, n / 12), 0.16, 'triangle', 0.16, 0, dt, mus);
    }
    if (i % 4 === 0 || i === 6 || i === 14) tone(BASS[bar], 0.22, 'sawtooth', 0.2, 0, dt, mus);
    if (i % 4 === 0) tone(110, 0.12, 'sine', 0.4 + intensity * 0.2, 40, dt, mus);
    if (i % 4 === 2) noise(0.05, 0.09 + intensity * 0.05, 7000, dt, mus, 0.4);
    if (intensity > 0.5 && i % 8 === 4) noise(0.12, 0.12, 2200, dt, mus, 0.5);
  }
  function pump() {
    if (!ctx || !musicOn) return;
    const spb = 60 / 118 / 4;
    if (nextT < ctx.currentTime - 0.3) nextT = ctx.currentTime + 0.05;
    while (nextT < ctx.currentTime + 0.25) { scheduleStep(step++, nextT); nextT += spb; }
  }

  return {
    unlock() { return ensure(); },
    play(name, a) {
      if (!Save.d || !Save.d.set.sfx) return;
      if (!ensure()) return;
      try { lib[name] && lib[name](a); } catch (e) { }
    },
    music(on) {
      if (on && Save.d && Save.d.set.music) {
        if (!ensure()) return;
        if (!musicOn) { musicOn = true; step = 0; nextT = ctx.currentTime + 0.1; timer = setInterval(pump, 40); }
      } else {
        musicOn = false;
        if (timer) { clearInterval(timer); timer = null; }
      }
    },
    intensity(v) { intensity = v; },
    isMusic() { return musicOn; }
  };
})();
