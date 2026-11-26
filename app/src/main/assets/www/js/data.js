'use strict';
/* ============================================================
   FLEX RUSH  -  data.js
   Katalog: bedenler, şapkalar, temalar, geliştirmeler, tier'lar
   ============================================================ */

const GAME_NAME = 'FLEX RUSH';

/* ad: true  -> reklam izleyerek açılır (şimdilik demo reklam) */
const SKINS = [
  { id: 0, en: 'Sunny', tr: 'Güneş', price: 0, c: [1.00, 0.70, 0.36], shorts: [0.12, 0.18, 0.52], hair: [0.16, 0.09, 0.06], gloss: 0.55 },
  { id: 1, en: 'Cocoa', tr: 'Kakao', price: 300, c: [0.60, 0.37, 0.23], shorts: [0.95, 0.35, 0.30], hair: [0.08, 0.05, 0.04], gloss: 0.55 },
  { id: 2, en: 'Mint', tr: 'Nane', price: 0, ad: true, c: [0.42, 0.92, 0.72], shorts: [0.10, 0.20, 0.45], hair: [0.10, 0.35, 0.30], gloss: 0.6 },
  { id: 3, en: 'Ocean', tr: 'Okyanus', price: 300, c: [0.24, 0.60, 1.00], shorts: [1.0, 0.85, 0.2], hair: [0.05, 0.12, 0.35], gloss: 0.7 },
  { id: 4, en: 'Berry', tr: 'Böğürtlen', price: 600, c: [0.62, 0.32, 0.95], shorts: [0.2, 0.9, 0.7], hair: [0.20, 0.08, 0.40], gloss: 0.7 },
  { id: 5, en: 'Coral', tr: 'Mercan', price: 0, ad: true, c: [1.00, 0.45, 0.56], shorts: [0.15, 0.2, 0.5], hair: [0.35, 0.10, 0.18], gloss: 0.7 },
  { id: 6, en: 'Lava', tr: 'Lav', price: 900, c: [1.00, 0.34, 0.10], shorts: [0.12, 0.10, 0.14], hair: [0.25, 0.04, 0.02], gloss: 0.8, emit: 0.28, anim: 'lava' },
  { id: 7, en: 'Chrome', tr: 'Krom', price: 1200, c: [0.80, 0.85, 0.92], shorts: [0.10, 0.12, 0.2], hair: [0.35, 0.38, 0.45], gloss: 1.7, metal: true },
  { id: 8, en: 'Gold', tr: 'Altın', price: 1500, c: [1.00, 0.78, 0.22], shorts: [0.10, 0.12, 0.3], hair: [0.55, 0.38, 0.05], gloss: 1.7, metal: true },
  { id: 9, en: 'Neon', tr: 'Neon', price: 1500, c: [0.55, 1.00, 0.12], shorts: [0.08, 0.10, 0.28], hair: [0.1, 0.4, 0.05], gloss: 0.9, emit: 0.3, anim: 'neon' },
  { id: 10, en: 'Galaxy', tr: 'Galaksi', price: 2000, c: [0.4, 0.2, 0.9], shorts: [0.05, 0.05, 0.15], hair: [0.9, 0.9, 1.0], gloss: 1.0, emit: 0.2, anim: 'galaxy' },
  { id: 11, en: 'Rainbow', tr: 'Gökkuşağı', price: 2500, c: [1, 0.5, 0.5], shorts: [1, 1, 1], hair: [1, 1, 1], gloss: 1.0, emit: 0.12, anim: 'rainbow' }
];

const HATS = [
  { id: 0, en: 'None', tr: 'Yok', price: 0 },
  { id: 1, en: 'Headband', tr: 'Bandana', price: 250 },
  { id: 2, en: 'Cap', tr: 'Şapka', price: 300 },
  { id: 3, en: 'Cowboy', tr: 'Kovboy', price: 500 },
  { id: 4, en: 'Captain', tr: 'Kaptan', price: 600 },
  { id: 5, en: 'Flowers', tr: 'Çiçek', price: 500 },
  { id: 6, en: 'Cone', tr: 'Koni', price: 0, ad: true },
  { id: 7, en: 'Party', tr: 'Parti', price: 0, ad: true },
  { id: 8, en: 'Shades', tr: 'Gözlük', price: 400 },
  { id: 9, en: 'Chef', tr: 'Şef', price: 400 },
  { id: 10, en: 'Top Hat', tr: 'Silindir', price: 800 },
  { id: 11, en: 'Viking', tr: 'Viking', price: 800 },
  { id: 12, en: 'Crown', tr: 'Taç', price: 1500 },
  { id: 13, en: 'Halo', tr: 'Hale', price: 2000 }
];

/* gökyüzü + deniz paletleri (seviyeye göre döner) */
const THEMES = [
  { // gün ortası
    top: [0.16, 0.46, 0.95], mid: [0.74, 0.91, 1.0], sunC: [1.0, 0.96, 0.82], sunDir: [0.30, 0.42, -1],
    deep: [0.02, 0.28, 0.60], shallow: [0.10, 0.74, 0.86], sky: [0.86, 0.94, 1.0], ground: [0.60, 0.70, 0.82],
    light: [-0.35, 0.85, 0.40], accent: [0.78, 1.0, 0.24]
  },
  { // altın saat
    top: [0.22, 0.26, 0.68], mid: [1.0, 0.76, 0.52], sunC: [1.0, 0.72, 0.38], sunDir: [0.22, 0.10, -1],
    deep: [0.05, 0.14, 0.40], shallow: [0.20, 0.52, 0.72], sky: [1.0, 0.86, 0.72], ground: [0.55, 0.45, 0.60],
    light: [-0.55, 0.45, 0.45], accent: [1.0, 0.82, 0.25]
  },
  { // pembe alaca
    top: [0.28, 0.18, 0.60], mid: [1.0, 0.62, 0.78], sunC: [1.0, 0.62, 0.72], sunDir: [-0.26, 0.09, -1],
    deep: [0.10, 0.08, 0.38], shallow: [0.50, 0.36, 0.78], sky: [1.0, 0.82, 0.92], ground: [0.50, 0.40, 0.65],
    light: [0.55, 0.45, 0.45], accent: [0.45, 0.95, 1.0]
  },
  { // nane sabahı
    top: [0.30, 0.74, 0.96], mid: [0.86, 1.0, 0.92], sunC: [1.0, 1.0, 0.86], sunDir: [-0.32, 0.36, -1],
    deep: [0.00, 0.40, 0.52], shallow: [0.26, 0.92, 0.76], sky: [0.90, 1.0, 0.96], ground: [0.55, 0.72, 0.70],
    light: [0.40, 0.85, 0.40], accent: [1.0, 0.45, 0.6]
  }
];

const TIERS = [
  { min: 0, en: 'SKINNY', tr: 'ÇÖP' },
  { min: 25, en: 'FIT', tr: 'FORMDA' },
  { min: 60, en: 'STRONG', tr: 'GÜÇLÜ' },
  { min: 140, en: 'JACKED', tr: 'KASLI' },
  { min: 320, en: 'BEAST', tr: 'CANAVAR' },
  { min: 700, en: 'TITAN', tr: 'TİTAN' }
];
function tierOf(P) { let t = 0; for (let i = 0; i < TIERS.length; i++) if (P >= TIERS[i].min) t = i; return t; }

/* kas gücü -> beden büyüklüğü (0..1.2) */
function bulkOf(P) { return clamp(Math.log(Math.max(P, 10) / 10) / Math.log(64), 0, 1.2); }

const UPGRADES = [
  { id: 'power', en: 'POWER', tr: 'GÜÇ', den: 'Start stronger', dtr: 'Daha güçlü başla', max: 12 },
  { id: 'income', en: 'INCOME', tr: 'GELİR', den: 'Earn more coins', dtr: 'Daha çok para kazan', max: 12 },
  { id: 'stamina', en: 'STAMINA', tr: 'DAYANIKLILIK', den: 'Lose less muscle', dtr: 'Daha az kas kaybet', max: 10 }
];
function upCost(lvl) { return Math.round(60 * Math.pow(1.52, lvl) / 5) * 5; }
function startPower() { return 10 + 4 * Save.d.up.power; }
function incomeMult() { return 1 + 0.12 * Save.d.up.income; }
function lossMult() { return 1 - 0.05 * Save.d.up.stamina; }

function hsv(h, s, v) {
  h = ((h % 1) + 1) % 1; const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  switch (i % 6) { case 0: return [v, t, p]; case 1: return [q, v, p]; case 2: return [p, v, t]; case 3: return [p, q, v]; case 4: return [t, p, v]; default: return [v, p, q]; }
}
const _sk = { c: [1, 1, 1], gloss: 0.5, emit: 0 };
function skinColor(sk, t) {
  _sk.gloss = sk.gloss || 0.5; _sk.emit = sk.emit || 0;
  let c = sk.c;
  if (sk.anim === 'rainbow') c = hsv(t * 0.22, 0.75, 1);
  else if (sk.anim === 'galaxy') c = hsv(0.72 + 0.12 * Math.sin(t * 0.8), 0.7, 0.55 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.7)));
  else if (sk.anim === 'neon') { _sk.emit = 0.22 + 0.2 * Math.sin(t * 4); }
  else if (sk.anim === 'lava') { _sk.emit = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(t * 3)); c = [1, 0.25 + 0.2 * Math.sin(t * 2.4), 0.08]; }
  _sk.c = c; return _sk;
}
