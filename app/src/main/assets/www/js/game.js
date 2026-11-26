'use strict';
/* ============================================================
   FLEX RUSH  -  game.js
   Oyun mantığı (DOM/GL içermez; Node'da test edilebilir)
   ============================================================ */

const ROAD_HALF = 2.45;

const Game = (() => {
  const G = {
    t: 0, mode: 'menu', view: 'home', level: 1, L: 200, themeIdx: 0,
    hero: { d: 0, x: 0, y: 0, P: 10, bulk: 0, lean: 0, run: 0, flex: 0, face: 1, mallet: null, nod: 0 },
    items: [], debris: [], parts: [],
    eq: { body: 0, hat: 0 },
    fin: { padD: 0, towerD: 0, H: 11, phase: 0, t: 0, puckY: 0.9, hFrac: 0, ring: 0, cam: 0, mult: 1, bell: false },
    run: { coins: 0, dumbs: 0, smashes: 0, startP: 10, maxP: 10, gatesGood: 0, revived: false, failWall: null, bonus: 0, total: 0 },
    input: { dx: 0, key: 0 }, slow: 0, shake: 0, on: null, tutorial: 0
  };
  let targetX = 0, vxs = 0;
  const rnd = { f: Math.random };

  function emit(ev, data) { if (G.on) G.on(ev, data); }

  /* ----------------------- seviye üretimi ----------------------- */
  function genLevel(level) {
    const r = mulberry32(level * 7919 + 13);
    const items = [];
    let d = 34, sim = startPower();
    let segs = Math.min(7 + Math.floor(level * 0.6), 14);
    const frac = Math.min(0.5 + level * 0.014, 0.84);

    function row(type, x, dd, extra) { const it = Object.assign({ type, x, d: dd, taken: false }, extra || {}); items.push(it); return it; }
    function coinLine(x0, dd, n, gap) { for (let i = 0; i < n; i++) row('coin', x0, dd + i * gap); }
    function coinArc(dd, n) { for (let i = 0; i < n; i++) { const a = (i / (n - 1)) * Math.PI; row('coin', Math.cos(a) * 1.5 * (r() > 0.5 ? 1 : 1) * 0 + (-1.5 + 3 * (i / (n - 1))), dd + i * 1.6); } }
    function weave(dd, n) { for (let i = 0; i < n; i++) row('coin', Math.sin(i * 0.7) * 1.7, dd + i * 1.5); }

    let prev = '';
    for (let s = 0; s < segs; s++) {
      let kind;
      if (s === 0) kind = 'gate';
      else if (s === segs - 1) kind = 'wall';
      else {
        const pool = level < 3 ? ['gate', 'pick', 'gate', 'pick', 'junk'] : ['gate', 'pick', 'junk', 'wall', 'gate', 'shake'];
        kind = pool[Math.floor(r() * pool.length)];
        if (s % 3 === 2 && level >= 2) kind = 'wall';
      }
      if (kind === 'wall' && (prev === 'wall' || sim < 16) && s !== segs - 1) kind = 'pick';
      if (kind === 'wall' && s === segs - 1 && prev === 'wall') { kind = 'pick'; segs++; }
      prev = kind;
      if (kind === 'gate') {
        let goodOp, goodV;
        if (r() < 0.4) { goodOp = 'MUL'; goodV = r() < 0.78 ? 2 : 3; }
        else { goodOp = 'ADD'; goodV = Math.max(5, Math.round(sim * (0.30 + r() * 0.2) / 5) * 5); }
        let badOp, badV;
        if (r() < 0.5) { badOp = 'SUB'; badV = Math.max(5, Math.round(sim * (0.25 + r() * 0.15) / 5) * 5); }
        else { badOp = 'DIV'; badV = 2; }
        const goodLeft = r() < 0.5;
        const good = { op: goodOp, v: goodV, good: true }, bad = { op: badOp, v: badV, good: false };
        row('gate', 0, d, { l: goodLeft ? good : bad, r: goodLeft ? bad : good, used: false });
        sim = goodOp === 'MUL' ? sim * goodV : sim + goodV;
        if (level >= 4 && r() < 0.25) {         // ikisi de iyi olan kapı
          const it = items[items.length - 1]; const alt = { op: 'ADD', v: Math.max(5, Math.round(sim * 0.12 / 5) * 5), good: true };
          if (goodLeft) it.r = alt; else it.l = alt;
        }
        d += 30;
      } else if (kind === 'pick') {
        const lane = r() < 0.5 ? -1.4 : 1.4, n = 5 + Math.floor(r() * 3);
        for (let i = 0; i < n; i++) row('dumb', lane + (i % 2 ? 0.25 : -0.25) * 0, d + i * 2.4, { big: false });
        row('dumb', -lane, d + 4, { big: true });
        coinLine(-lane * 0.15, d + 1, 7, 2.0);
        sim += n * 3.6 + 10;
        d += 26;
      } else if (kind === 'junk') {
        const n = 2 + (level > 5 ? 1 : 0);
        const gapX = [-1.6, 0, 1.6][Math.floor(r() * 3)];
        const xs = [-1.7, 0, 1.7];
        for (const x of xs) if (Math.abs(x - gapX) > 0.2 && n >= 2) row('burger', x, d);
        weave(d - 6, 5);
        row('coin', gapX, d + 1.5); row('coin', gapX, d + 3);
        d += 22;
      } else if (kind === 'shake') {
        row('shake', r() < 0.5 ? -1.5 : 1.5, d); weave(d + 3, 6); sim += 12; d += 22;
      } else { // wall
        const req = Math.max(10, Math.round(Math.min(sim * frac, sim - 4) / 5) * 5);
        row('wall', 0, d, { req, broken: false });
        sim = Math.max(8, sim - req * 0.35) + 10;
        coinArc(d - 14, 6);
        for (let i = 0; i < 4; i++) row('dumb', (i % 2 ? 0.9 : -0.9), d + 8 + i * 2.4, { big: false });
        d += 28;
      }
    }
    const L = d + 6;
    return { items, L, sim };
  }

  /* ----------------------- durum geçişleri ----------------------- */
  function applyEquip() { G.eq.body = Save.d.eq.body; G.eq.hat = Save.d.eq.hat; }

  function loadLevel(level) {
    const lv = genLevel(level);
    G.level = level; G.items = lv.items; G.L = lv.L; G.sim = lv.sim;
    G.themeIdx = (level - 1) % THEMES.length;
    G.debris.length = 0; G.parts.length = 0;
    const F = G.fin; F.padD = G.L + 11.3; F.towerD = G.L + 14.8; F.H = 11; F.phase = 0; F.t = 0; F.puckY = 0.9; F.hFrac = 0;
    F.ring = 0; F.cam = 0; F.mult = 1; F.bell = false;
    const h = G.hero; h.d = 0; h.x = 0; h.P = startPower(); h.bulk = bulkOf(h.P); h.lean = 0; h.mallet = null; h.run = 0; h.flex = 0; h.face = 1;
    targetX = 0; vxs = 0; G.slow = 0;
    const R = G.run; R.coins = 0; R.dumbs = 0; R.smashes = 0; R.startP = h.P; R.maxP = h.P; R.revived = false; R.failWall = null; R.bonus = 0; R.total = 0;
  }

  function toMenu(level) {
    applyEquip();
    loadLevel(level || Save.d.level);
    G.mode = 'menu'; G.view = 'home'; G.hero.d = 0; G.items = [];
    G.hero.P = startPower(); G.hero.bulk = bulkOf(G.hero.P) * 0 + Math.min(bulkOf(startPower()) + 0.0, 1);
  }

  function start() {
    if (G.mode !== 'menu') return;
    loadLevel(Save.d.level);
    G.mode = 'play'; G.view = 'home'; G.hero.run = 1; G.hero.face = 1;
    Save.d.runs++; Save.save();
    emit('start', {});
  }

  function setView(v) { G.view = v; if (v === 'home' || v === 'body' || v === 'hat') G.mode = (v === 'home') ? 'menu' : 'ward'; }

  /* ----------------------- yardımcılar ----------------------- */
  function spawnParts(x, y, z, n, col, spd, size, sq) {
    for (let i = 0; i < n; i++) {
      if (G.parts.length > 420) return;
      const a = rnd.f() * TAU, u = rnd.f() * 2 - 1, s = Math.sqrt(1 - u * u), sp = spd * (0.3 + rnd.f() * 0.7);
      const c = Array.isArray(col[0]) ? col[Math.floor(rnd.f() * col.length)] : col;
      G.parts.push({ x, y, z, vx: Math.cos(a) * s * sp, vy: Math.abs(u) * sp + spd * 0.3, vz: Math.sin(a) * s * sp, life: 0.5 + rnd.f() * 0.6, max: 1.0, r: c[0], g: c[1], b: c[2], size: size * (0.6 + rnd.f() * 0.8), sq: !!sq, grav: sq ? 5 : 9 });
    }
  }
  function confetti(x, y, z, n) {
    const cols = [[1, 0.3, 0.4], [1, 0.85, 0.2], [0.3, 0.9, 0.5], [0.3, 0.7, 1], [0.8, 0.4, 1], [1, 1, 1]];
    for (let i = 0; i < n; i++) {
      if (G.parts.length > 460) return;
      const c = cols[i % cols.length], a = rnd.f() * TAU;
      G.parts.push({ x: x + (rnd.f() - 0.5) * 2, y: y + rnd.f() * 1.5, z: z + (rnd.f() - 0.5) * 2, vx: Math.cos(a) * (1 + rnd.f() * 4), vy: 5 + rnd.f() * 6, vz: Math.sin(a) * (1 + rnd.f() * 4), life: 1.6 + rnd.f(), max: 2.2, r: c[0], g: c[1], b: c[2], size: 0.1 + rnd.f() * 0.08, sq: true, grav: 6 });
    }
  }
  function smashWall(it) {
    it.broken = true; it.taken = true;
    const z = -it.d;
    for (let i = 0; i < 26; i++) {
      const c = 0.5 + rnd.f() * 0.4;
      G.debris.push({ x: (rnd.f() - 0.5) * 5, y: 0.3 + rnd.f() * 2.2, z: z, vx: (rnd.f() - 0.5) * 6, vy: 2 + rnd.f() * 5, vz: -4 - rnd.f() * 7, rx: rnd.f() * 6, ry: rnd.f() * 6, rz: rnd.f() * 6, vr: (rnd.f() - 0.5) * 12, s: 0.2 + rnd.f() * 0.25, r: 0.82 * c, g: 0.34 * c, b: 0.28 * c, life: 2.2 });
    }
    spawnParts(0, 1.4, z, 40, [[1, 0.85, 0.5], [1, 0.6, 0.3], [1, 1, 1]], 8, 0.16);
    G.shake = 1; G.slow = 0.22;
  }

  function addPower(delta, mulloss) {
    const h = G.hero; h.P = Math.max(0, h.P + delta);
    if (h.P > G.run.maxP) G.run.maxP = h.P;
  }

  /* ----------------------- oyun güncellemesi ----------------------- */
  function fail(wall) {
    G.mode = 'fail'; G.hero.run = 0; G.hero.face = 2; G.run.failWall = wall || null;
    Save.d.best = Math.max(Save.d.best, Math.floor(G.hero.d)); Save.save();
    emit('fail', { wall: wall ? wall.req : 0, progress: clamp(G.hero.d / G.L, 0, 1) });
  }
  function revive() {
    if (G.mode !== 'fail') return;
    const h = G.hero, w = G.run.failWall;
    if (w) { h.P = Math.max(h.P, Math.ceil(w.req * 1.25)); h.d = Math.max(0, w.d - 4); }
    else h.P = Math.max(h.P, 25);
    h.bulk = bulkOf(h.P); h.face = 1; h.run = 1; G.run.revived = true; G.mode = 'play';
    emit('revive', {});
  }

  function update(dtRaw) {
    let dt = Math.min(dtRaw, 0.05);
    G.t += dt;
    if (G.slow > 0) { G.slow -= dtRaw; dt *= 0.3; }
    G.shake = Math.max(0, G.shake - dt * 3);
    const h = G.hero;
    // bulk yumuşak geçiş
    const bt = bulkOf(h.P);
    h.bulk += (bt - h.bulk) * Math.min(1, dt * 7);

    // parçacıklar
    for (let i = G.parts.length - 1; i >= 0; i--) {
      const p = G.parts[i]; p.life -= dt;
      if (p.life <= 0) { G.parts[i] = G.parts[G.parts.length - 1]; G.parts.pop(); continue; }
      p.vy -= p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.05 && p.vy < 0) { p.y = 0.05; p.vy *= -0.3; p.vx *= 0.7; p.vz *= 0.7; }
    }
    for (let i = G.debris.length - 1; i >= 0; i--) {
      const b = G.debris[i]; b.life -= dt;
      if (b.life <= 0) { G.debris[i] = G.debris[G.debris.length - 1]; G.debris.pop(); continue; }
      b.vy -= 14 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.rx += b.vr * dt; b.ry += b.vr * 0.7 * dt;
      if (b.y < b.s * 0.5) { b.y = b.s * 0.5; b.vy *= -0.35; b.vx *= 0.8; b.vz *= 0.8; }
    }
    if (G.fin.ring > 0) G.fin.ring = Math.max(0, G.fin.ring - dt * 0.5);

    if (G.mode === 'play') play(dt);
    else if (G.mode === 'finale') finale(dt);
    else if (G.mode === 'menu' || G.mode === 'ward') { h.lean *= 0.9; }
  }

  function play(dt) {
    const h = G.hero, sens = [0.8, 1.0, 1.35][Save.d.set.sens] || 1;
    // yatay giriş
    targetX = clamp(targetX + G.input.dx * sens + G.input.key * 5.2 * dt, -ROAD_HALF + 0.1, ROAD_HALF - 0.1);
    G.input.dx = 0;
    const prev = h.x;
    h.x += (targetX - h.x) * (1 - Math.exp(-dt * 17));
    const vx = (h.x - prev) / Math.max(dt, 1e-4);
    vxs += (vx - vxs) * Math.min(1, dt * 10);
    h.lean = clamp(vxs * 0.12, -0.9, 0.9);

    const speed = 9.5 + Math.min(G.level * 0.12, 2.2);
    const prevD = h.d;
    h.d += speed * dt;
    h.run = 1;

    // kollizyon
    const its = G.items;
    for (let i = 0; i < its.length; i++) {
      const it = its[i];
      if (it.taken) continue;
      if (it.d > h.d + 3) { if (it.d > h.d + 40) continue; }
      if (it.type === 'gate') {
        if (!it.used && h.d >= it.d) { it.used = true; applyGate(it); if (G.mode !== 'play') return; }
      } else if (it.type === 'wall') {
        if (h.d >= it.d - 1.2) {
          if (h.P >= it.req) { h.P -= it.req * 0.35 * lossMult(); smashWall(it); G.run.smashes++; Snd.play('smash'); Haptic.buzz(40); emit('smash', { req: it.req }); }
          else { h.d = it.d - 1.2; fail(it); Snd.play('fail'); return; }
        }
      } else if (Math.abs(it.d - h.d) < 0.9 && Math.abs(it.x - h.x) < (it.type === 'burger' ? 0.85 : 0.75)) {
        it.taken = true;
        if (it.type === 'coin') { G.run.coins += 1; spawnParts(it.x, 1.0, -it.d, 6, [1, 0.85, 0.25], 3, 0.09); Snd.play('coin', Math.min(G.run.coins % 12, 11)); emit('coin', {}); }
        else if (it.type === 'dumb') { const v = it.big ? 12 : 4; addPower(v); G.run.dumbs++; spawnParts(it.x, 1.1, -it.d, 10, [0.78, 1, 0.24], 4, 0.1); Snd.play('dumb', G.run.dumbs % 8); Haptic.buzz(8); emit('pow', { v: v }); }
        else if (it.type === 'shake') { addPower(18); spawnParts(it.x, 1.0, -it.d, 16, [[0.78, 1, 0.24], [1, 1, 1]], 5, 0.11); Snd.play('good'); Haptic.buzz(15); emit('pow', { v: 18 }); }
        else if (it.type === 'burger') {
          const loss = Math.max(4, Math.round(h.P * 0.12 * lossMult()));
          addPower(-loss); spawnParts(it.x, 0.8, -it.d, 14, [[0.95, 0.66, 0.3], [0.5, 0.25, 0.1]], 5, 0.12); Snd.play('burger'); Haptic.buzz(35); G.shake = 0.6;
          emit('junk', { v: -loss });
          if (h.P < 1) { fail(null); return; }
        }
      }
    }
    // final çizgisi
    if (h.d >= G.L) { startFinale(); }
  }

  function applyGate(it) {
    const h = G.hero, side = h.x < 0 ? it.l : it.r;
    let P = h.P, nv;
    if (side.op === 'ADD') nv = P + side.v;
    else if (side.op === 'MUL') nv = P * side.v;
    else if (side.op === 'SUB') nv = P - side.v * lossMult();
    else nv = Math.ceil(P / (1 + (side.v - 1) * lossMult()));
    const delta = nv - P;
    h.P = Math.max(0, Math.min(99999, nv));
    if (h.P > G.run.maxP) G.run.maxP = h.P;
    const x = h.x, z = -h.d;
    if (side.good) { spawnParts(x, 1.4, z, 28, [[0.3, 1, 0.6], [0.78, 1, 0.24], [1, 1, 1]], 6, 0.12); Snd.play('good'); Haptic.buzz(18); G.run.gatesGood++; }
    else { spawnParts(x, 1.4, z, 24, [[1, 0.3, 0.36], [1, 0.6, 0.3]], 6, 0.12); Snd.play('bad'); Haptic.buzz(40); G.shake = 0.5; }
    emit('gate', { good: side.good, op: side.op, v: side.v, delta: Math.round(delta) });
    if (h.P < 1) { fail(null); }
  }

  /* ----------------------- final: yüksek vurucu ----------------------- */
  function startFinale() {
    G.mode = 'finale';
    const F = G.fin; F.phase = 0; F.t = 0; F.cam = 0;
    // hedef yükseklik: gücün seviye tahminine oranı
    const ratio = G.hero.P / Math.max(G.sim * 0.9, 12);
    F.hFrac = clamp((ratio - 0.35) / 1.15, 0.04, 1);
    F.mult = +(1 + 4 * F.hFrac).toFixed(1);
    confetti(-2.9, 4, -G.L, 22); confetti(2.9, 4, -G.L, 22);
    Snd.play('whoosh');
    emit('finale', {});
  }
  const PH = { RUN: 0, CHARGE: 1, SWING: 2, RISE: 3, DONE: 4 };
  function finale(dt) {
    const F = G.fin, h = G.hero; F.t += dt;
    const stopD = F.padD - 1.7;
    F.cam = clamp(F.cam + dt * 0.7, 0, 1);
    if (F.phase === PH.RUN) {
      h.x += (0 - h.x) * Math.min(1, dt * 8); h.lean = 0;
      h.d = Math.min(stopD, h.d + 9 * dt); h.run = 1;
      if (h.d >= stopD - 0.01) { F.phase = PH.CHARGE; F.t = 0; h.run = 0; Snd.play('flex'); }
    } else if (F.phase === PH.CHARGE) {
      h.run = 0; h.flex = 0; h.face = 1;
      const k = clamp(F.t / 0.9, 0, 1);
      h.mallet = lerp(-0.2, -3.2, sstep(0, 1, k));
      h.nod = 0;
      if (F.t > 0.9) { F.phase = PH.SWING; F.t = 0; Snd.play('swing'); }
    } else if (F.phase === PH.SWING) {
      const k = clamp(F.t / 0.2, 0, 1);
      h.mallet = lerp(-3.2, -1.2, k * k);
      if (k >= 1) {
        F.phase = PH.RISE; F.t = 0; G.shake = 1; G.slow = 0.15; Snd.play('thud'); Haptic.buzz(60);
        spawnParts(0, 0.9, -F.padD, 40, [[1, 0.9, 0.4], [1, 1, 1], [1, 0.6, 0.2]], 8, 0.14);
      }
    } else if (F.phase === PH.RISE) {
      h.mallet = lerp(-1.2, -1.0, clamp(F.t, 0, 1));
      const dur = 1.2 + 1.6 * F.hFrac, k = clamp(F.t / dur, 0, 1), e = 1 - Math.pow(1 - k, 2.2);
      const top = 0.9 + F.hFrac * (F.H - 0.6);
      const prev = F.puckY; F.puckY = lerp(0.9, top, e);
      if (Math.floor(prev * 2) !== Math.floor(F.puckY * 2)) Snd.play('tick', F.puckY);
      if (k >= 1) {
        F.phase = PH.DONE; F.t = 0; h.flex = 1; h.mallet = null;
        if (F.hFrac > 0.97) { F.bell = true; F.ring = 1; Snd.play('bell'); confetti(0, F.H, -F.towerD, 60); }
        else confetti(0, F.H * 0.6, -F.towerD, 20);
        finishLevel();
      }
    }
  }

  function finishLevel() {
    const F = G.fin, R = G.run, h = G.hero;
    const base = Math.round((40 + 12 * G.level) * F.mult * incomeMult());
    const coins = Math.round(R.coins * incomeMult());
    R.bonus = base; R.total = base + coins; R.collected = coins;
    Save.addCoins(R.total);
    Save.d.level = G.level + 1;
    Save.d.best = Math.max(Save.d.best, G.level);
    Save.save();
    G.winT = 0;
    setTimeout && 0;
    G.mode = 'finale';          // 'win' geçişi winDelay ile
    G.winDelay = 1.2;
    emit('rise_done', { mult: F.mult, bell: F.bell });
  }
  function tickWin(dt) {
    if (G.winDelay > 0) { G.winDelay -= dt; if (G.winDelay <= 0) { G.mode = 'win'; G.hero.cheer = 1; Snd.play('win'); emit('win', { total: G.run.total, bonus: G.run.bonus, coins: G.run.collected, mult: G.fin.mult, bell: G.fin.bell }); confetti(0, 2, G.hero.d * -1, 50); } }
  }

  /* ----------------------- dış arayüz ----------------------- */
  const origUpdate = update;
  function step(dtRaw) { origUpdate(dtRaw); if (G.winDelay > 0 && G.fin.phase === PH.DONE) tickWin(Math.min(dtRaw, 0.05)); }

  function nextLevel() { toMenu(Save.d.level); G.winDelay = 0; }
  function retry() { toMenu(Save.d.level); G.winDelay = 0; start(); }
  function drag(dx) { G.input.dx += dx; }

  return { G, update: step, start, revive, toMenu, nextLevel, retry, setView, drag, applyEquip, genLevel, setKey(v) { G.input.key = v; }, rnd };
})();
