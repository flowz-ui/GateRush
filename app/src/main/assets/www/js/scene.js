'use strict';
/* ============================================================
   FLEX RUSH  -  scene.js
   Dünyayı çizer: deniz, platform, adalar, kapılar, nesneler,
   final kulesi, kamera ve etiketler.  Oyun durumunu (G) sadece okur.
   ============================================================ */

const Scene = (() => {
  const g = GLX, M = GLX.meshes;
  let S, CU, CY, CO, TO, FR;
  function bindMeshes() { S = M.sphere; CU = M.cube; CY = M.cyl; CO = M.cone; TO = M.torus; FR = M.frust; }

  let shadowTex = null, glowTex = null;
  const pres = { yaw: 0, run: 0, flex: 0, cheer: 0, face: 0, tilt: 0, camInit: false, ls: 0 };
  const envNow = {}, envKeys = ['top', 'mid', 'sunC', 'sunDir', 'deep', 'shallow', 'sky', 'ground', 'light', 'accent'];
  let envTheme = -1;

  function init() {
    bindMeshes(); Fig.bindMeshes();
    shadowTex = g.permTex('shadow', 64, 64, (c, w, h) => {
      const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
    });
    glowTex = shadowTex;
  }

  /* ------------------------- tema ------------------------- */
  function setTheme(idx, instant) {
    const th = THEMES[idx % THEMES.length];
    if (envTheme === idx && !instant) return;
    envTheme = idx;
    for (const k of envKeys) {
      if (!envNow[k] || instant) envNow[k] = th[k].slice();
    }
    envNow._target = th;
    if (instant) for (const k of envKeys) for (let i = 0; i < 3; i++) g.env[k] = envNow[k].slice();
  }
  function updateEnv(dt) {
    const th = envNow._target; if (!th) return;
    const a = 1 - Math.exp(-dt * 1.6);
    for (const k of envKeys) {
      const cur = envNow[k], tg = th[k];
      for (let i = 0; i < 3; i++) cur[i] += (tg[i] - cur[i]) * a;
      g.env[k] = cur;
    }
  }

  /* ------------------------- etiketler ------------------------- */
  function outlined(c, text, cx, cy, size, top, bot, stroke, sw, font) {
    c.font = size + 'px ' + (font || 'Anton'); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineJoin = 'round'; c.lineWidth = sw; c.strokeStyle = stroke; c.strokeText(text, cx, cy);
    const gr = c.createLinearGradient(0, cy - size * 0.5, 0, cy + size * 0.5);
    gr.addColorStop(0, top); gr.addColorStop(1, bot); c.fillStyle = gr; c.fillText(text, cx, cy);
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  function gateLabel(text, good) {
    return g.label('g|' + text + '|' + good, 256, 128, (c, w, h) => {
      if (good) outlined(c, text, w / 2, h / 2 + 4, 104, '#ffffff', '#d8ffa0', '#0b6b3a', 20);
      else outlined(c, text, w / 2, h / 2 + 4, 104, '#ffffff', '#ffd0d0', '#8a1020', 20);
    });
  }
  function powerLabel(P) {
    return g.label('p|' + P, 192, 96, (c, w, h) => {
      const gr = c.createLinearGradient(0, 8, 0, h - 8); gr.addColorStop(0, '#2a3fb0'); gr.addColorStop(1, '#0c1450');
      rr(c, 6, 8, w - 12, h - 16, 40); c.fillStyle = gr; c.fill();
      c.lineWidth = 6; c.strokeStyle = '#c6ff3d'; c.stroke();
      c.fillStyle = '#c6ff3d'; c.beginPath();
      c.moveTo(46, 20); c.lineTo(28, 52); c.lineTo(42, 52); c.lineTo(34, 78); c.lineTo(58, 42); c.lineTo(44, 42); c.lineTo(54, 20); c.closePath(); c.fill();
      outlined(c, String(P), 118, h / 2 + 3, 56, '#ffffff', '#e6efff', '#0a1040', 9);
    });
  }
  function reqLabel(req, ok) {
    return g.label('r|' + req + '|' + ok + '|' + I18N.lang, 256, 160, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h);
      if (ok) { gr.addColorStop(0, '#31d673'); gr.addColorStop(1, '#0d7a3d'); } else { gr.addColorStop(0, '#ff6070'); gr.addColorStop(1, '#a01428'); }
      rr(c, 8, 8, w - 16, h - 16, 34); c.fillStyle = gr; c.fill(); c.lineWidth = 7; c.strokeStyle = '#ffffff'; c.stroke();
      c.font = '28px Poppins'; c.fillStyle = 'rgba(255,255,255,0.92)'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(T('NEEDS', 'GEREKEN'), w / 2, 40);
      outlined(c, String(req), w / 2, 100, 78, '#ffffff', '#ffffff', 'rgba(0,0,0,0.35)', 10);
    });
  }
  function multLabel(txt) {
    return g.label('m|' + txt, 192, 96, (c, w, h) => outlined(c, txt, w / 2, h / 2 + 4, 76, '#ffffff', '#ffffff', '#1a2270', 16));
  }
  function bigLabel(txt, top, bot, stroke) {
    return g.label('b|' + txt, 512, 160, (c, w, h) => outlined(c, txt, w / 2, h / 2 + 6, 120, top, bot, stroke, 26));
  }

  /* ------------------------- çevre ------------------------- */
  function palm(x, y, z, s, lean, t, seed) {
    g.setRoot(x, y, z);
    const m = g.cur(); M4.RZ(m, lean);
    g.part(CY, 0, 1.7 * s, 0, 0.2 * s, 3.4 * s, 0.2 * s, 0.55, 0.36, 0.2, 0.1);
    for (let i = 0; i < 6; i++) {
      g.push(); const lm = g.cur();
      M4.T(lm, 0, 3.4 * s, 0); M4.RY(lm, i * 1.047 + seed); M4.RZ(lm, -0.35 + Math.sin(t * 1.4 + i + seed) * 0.05);
      g.part(S, 1.0 * s, 0, 0, 1.15 * s, 0.07 * s, 0.34 * s, 0.22, 0.66, 0.28, 0.2);
      g.pop();
    }
    g.part(S, 0.1 * s, 3.3 * s, 0.1 * s, 0.17 * s, 0.17 * s, 0.17 * s, 0.4, 0.26, 0.14, 0.3);
  }
  function island(x, z, r, j, t, dist) {
    const wy = g.env.waterY;
    g.part(S, x, wy + 0.05, z, r * 1.38, r * 0.3, r * 1.38, 0.96, 0.86, 0.62, 0.1);
    g.part(S, x, wy + r * 0.1, z, r * 0.96, r * 0.56, r * 0.96, 0.36, 0.74, 0.34, 0.2);
    if (dist < 120) {
      const n = 2 + (j % 2);
      for (let p = 0; p < n; p++) {
        const a = hash1(j * 9 + p) * TAU, rad = r * (0.25 + 0.3 * hash1(j * 5 + p));
        palm(x + Math.cos(a) * rad, wy + r * 0.52, z + Math.sin(a) * rad, 0.75 + 0.3 * hash1(j + p * 3), (hash1(j * 11 + p) - 0.5) * 0.35, t, p);
      }
    }
    if (j % 5 === 2 && dist < 150) {       // fener
      const y0 = wy + r * 0.5;
      g.part(CY, x, y0 + 2, z, 0.9, 4, 0.9, 1, 1, 1, 0.3);
      g.part(CY, x, y0 + 1.2, z, 0.93, 1.1, 0.93, 0.95, 0.2, 0.25, 0.3);
      g.part(CY, x, y0 + 3.2, z, 0.93, 1.1, 0.93, 0.95, 0.2, 0.25, 0.3);
      g.part(CY, x, y0 + 4.2, z, 1.1, 0.3, 1.1, 0.15, 0.17, 0.25, 0.4);
      g.part(S, x, y0 + 4.8, z, 0.5, 0.5, 0.5, 1, 0.95, 0.6, 0.6, 1, 0.9);
      g.part(CO, x, y0 + 5.7, z, 0.95, 1.2, 0.95, 0.95, 0.2, 0.25, 0.4);
    }
  }
  function boat(x, z, t, j) {
    const wy = g.env.waterY, bob = Math.sin(t * 1.3 + j) * 0.12;
    g.setRoot(x, wy + 0.12 + bob, z);
    const m = g.cur(); M4.RY(m, hash1(j) * 2 - 1); M4.RZ(m, Math.sin(t * 1.1 + j) * 0.05);
    const c = hsv(hash1(j * 7) , 0.6, 1);
    g.part(S, 0, 0.1, 0, 1.1, 0.36, 0.45, c[0], c[1], c[2], 0.6);
    g.part(CY, 0, 1.5, 0, 0.05, 2.8, 0.05, 0.6, 0.45, 0.3, 0.2);
    g.part(CO, 0.0, 1.55, 0.03, 0.9, 2.2, 0.06, 1, 1, 1, 0.2);
    g.part(CO, -0.5, 1.0, -0.03, 0.55, 1.4, 0.05, 1, 0.95, 0.85, 0.2);
  }
  function gull(cx, cy, cz, t, i) {
    const a = t * 0.5 + i * 1.7, x = cx + Math.cos(a) * (6 + i * 2), z = cz + Math.sin(a) * 7;
    g.setRoot(x, cy + Math.sin(t * 0.9 + i) * 0.6, z);
    const m = g.cur(); M4.RY(m, -a + Math.PI / 2); M4.RZ(m, 0.15);
    const fl = Math.sin(t * 9 + i * 2) * 0.55;
    g.part(S, 0, 0, 0, 0.17, 0.12, 0.38, 1, 1, 1, 0.3);
    g.part(S, 0, 0.02, 0.3, 0.09, 0.08, 0.1, 1, 1, 1, 0.3);
    for (let sd = -1; sd <= 1; sd += 2) {
      g.push(); const w = g.cur(); M4.T(w, sd * 0.12, 0.04, 0); M4.RZ(w, sd * fl);
      g.part(S, sd * 0.4, 0, 0, 0.45, 0.03, 0.2, 0.96, 0.97, 1, 0.2); g.pop();
    }
  }
  function cloud(x, y, z, s) {
    g.part(S, x, y, z, 3.0 * s, 1.5 * s, 2.2 * s, 1, 1, 1, 0);
    g.part(S, x + 2.3 * s, y - 0.2 * s, z + 0.3 * s, 2.2 * s, 1.2 * s, 1.8 * s, 0.98, 0.98, 1, 0);
    g.part(S, x - 2.1 * s, y - 0.1 * s, z - 0.2 * s, 2.0 * s, 1.1 * s, 1.6 * s, 0.97, 0.98, 1, 0);
  }

  function drawEnv(G, t) {
    const dc = G.cam_d;
    const j0 = Math.floor((dc - 40) / 42);
    for (let j = j0; j < j0 + 6; j++) {
      const d = j * 42 + hash1(j * 3 + 1) * 20, side = (j & 1) ? 1 : -1;
      const x = side * (15 + hash1(j * 3 + 2) * 22), r = 5 + hash1(j * 3 + 3) * 6;
      island(x, -d, r, j, t, d - dc);
    }
    const b0 = Math.floor(dc / 55);
    for (let b = b0; b < b0 + 4; b++) {
      const side = hash1(b * 2.3) > 0.5 ? 1 : -1;
      boat(side * (8 + hash1(b * 4.1) * 10) + Math.sin(t * 0.15 + b) * 2, -(b * 55 + hash1(b * 5.7) * 30), t, b);
    }
    for (let i = 0; i < 4; i++) gull(-6 + i * 4, 6 + i, -(dc + 22 + i * 14), t, i);
    const c0 = Math.floor(dc / 30);
    for (let j = c0 - 1; j < c0 + 6; j++) {
      const side = (j & 1) ? 1 : -1;
      cloud(side * (13 + hash1(j * 1.7) * 26), 4 + hash1(j * 2.9) * 9, -(j * 30 + hash1(j * 3.3) * 20), 0.9 + hash1(j) * 0.7);
    }
  }

  /* ------------------------- platform ------------------------- */
  function drawPlatform(G) {
    const L = G.L, z0 = 40, z1 = -(L + 24);
    const len = z0 - z1, cz = (z0 + z1) / 2;
    g.part(CU, 0, -0.65, cz, 5.95, 1.3, len, 0.97, 0.98, 1.0, 0.3);
    g.part(CU, 0, -1.9, cz, 3.2, 1.3, len, 0.74, 0.82, 0.96, 0.2);
    g.floor(z1, z0);
    const wy = g.env.waterY, dc = G.cam_d;
    const p0 = Math.floor((dc - 14) / 22);
    for (let p = p0; p < p0 + 9; p++) {
      const d = p * 22; if (d < -10 || d > L + 22) continue;
      g.part(CY, 1.2, (wy - 2.4) / 2 - 0.3, -d, 0.5, -wy - 2.4, 0.5, 0.88, 0.93, 1.0, 0.3);
      g.part(CY, -1.2, (wy - 2.4) / 2 - 0.3, -d, 0.5, -wy - 2.4, 0.5, 0.88, 0.93, 1.0, 0.3);
      g.part(CU, 0, -2.5, -d, 3.4, 0.45, 0.6, 0.78, 0.86, 1.0, 0.3);
      g.part(TO, 1.2, wy + 0.05, -d, 0.7, 0.12, 0.7, 1, 1, 1, 0);
      g.part(TO, -1.2, wy + 0.05, -d, 0.7, 0.12, 0.7, 1, 1, 1, 0);
    }
  }

  /* ------------------------- kapı ------------------------- */
  const GOOD = [0.16, 0.86, 0.52], BAD = [1.0, 0.30, 0.36];
  function gateFrames(it, hx) {
    const z = -it.d;
    for (let s = 0; s < 2; s++) {
      const side = s === 0 ? it.l : it.r, c = side.good ? GOOD : BAD, cx = s === 0 ? -1.38 : 1.38;
      g.part(CU, cx, 3.1, z, 2.72, 0.46, 0.26, c[0], c[1], c[2], 0.8, 1, 0.25);
      g.part(CU, cx, 0.03, z, 2.72, 0.07, 0.34, c[0] * 0.9, c[1] * 0.9, c[2] * 0.9, 0.6, 1, 0.2);
      // simge
      g.setRoot(cx, 3.1, z + 0.2); const m = g.cur(); M4.S(m, 0.5, 0.5, 0.5);
      if (side.good) { g.push(); M4.RZ(g.cur(), 0.35); this_db(); g.pop(); }
      else { g.push(); M4.S(g.cur(), 0.85, 0.85, 0.85); this_bg(); g.pop(); }
    }
    for (const px of [-2.78, 0, 2.78]) g.part(CY, px, 1.7, z, 0.18, 3.4, 0.18, 0.96, 0.97, 1.0, 1.0);
    for (const px of [-2.78, 2.78]) g.part(S, px, 3.5, z, 0.2, 0.2, 0.2, 1, 0.85, 0.3, 1.4, 1, 0.4);
  }
  // kapı üstü küçük simgeler (yığındaki matrisi kullanır)
  function this_db() {
    const m = g.cur();
    g.push(); let a = g.cur(); M4.RZ(a, Math.PI / 2); M4.S(a, 0.1, 1.1, 0.1); g.draw(CY, 0.8, 0.84, 0.9, 1.0); g.pop();
    for (let sd = -1; sd <= 1; sd += 2) {
      g.push(); a = g.cur(); M4.T(a, sd * 0.42, 0, 0); M4.RZ(a, Math.PI / 2); M4.S(a, 0.5, 0.2, 0.5); g.draw(CY, 1, 1, 1, 1.0, 1, 0.3); g.pop();
    }
  }
  function this_bg() {
    g.part(S, 0, -0.1, 0, 0.5, 0.2, 0.5, 0.95, 0.66, 0.3, 0.4);
    g.part(CY, 0, 0.1, 0, 0.5, 0.14, 0.5, 0.34, 0.17, 0.08, 0.3);
    g.part(S, 0, 0.32, 0, 0.5, 0.3, 0.5, 0.96, 0.68, 0.32, 0.5);
  }

  /* ------------------------- final kulesi ------------------------- */
  function drawFinale(G, t) {
    const F = G.fin, L = G.L, dP = F.padD, dT = F.towerD, H = F.H;
    g.setRoot(0, 0, 0);
    // bitiş kemeri
    const zf = -L;
    g.part(CY, -2.9, 2.2, zf, 0.22, 4.4, 0.22, 0.95, 0.97, 1, 1.0);
    g.part(CY, 2.9, 2.2, zf, 0.22, 4.4, 0.22, 0.95, 0.97, 1, 1.0);
    g.part(CU, 0, 4.4, zf, 6.2, 0.9, 0.35, 0.78, 1.0, 0.24, 0.8, 1, 0.12);
    for (let i = 0; i < 12; i++) g.part(CU, -2.75 + i * 0.5, 0.01, zf, 0.5, 0.02, 0.5, (i & 1) ? 0.06 : 1, (i & 1) ? 0.06 : 1, (i & 1) ? 0.1 : 1, 0);
    // kule tabanı + podyum
    g.part(CU, 0, 0.3, -dT, 2.8, 0.6, 2.8, 0.98, 0.98, 1, 0.4);
    g.part(CU, 0, 0.62, -dT, 2.5, 0.06, 2.5, 0.78, 1.0, 0.24, 0.6, 1, 0.15);
    // sütun
    g.part(CU, 0, H / 2 + 0.6, -dT, 1.5, H, 0.3, 0.97, 0.98, 1.0, 0.5);
    const N = 9, sh = H / N;
    for (let i = 0; i < N; i++) {
      const c = hsv(0.36 - i * 0.045, 0.78, 1);
      g.part(CU, 0, 0.6 + sh * (i + 0.5), -dT + 0.17, 1.22, sh - 0.07, 0.05, c[0], c[1], c[2], 0.6, 1, 0.38);
    }
    g.part(CU, 0, H / 2 + 0.6, -dT + 0.2, 0.12, H, 0.04, 0.1, 0.1, 0.2, 0.5);     // kızak
    g.part(CY, -0.78, H / 2 + 0.6, -dT, 0.1, H, 0.1, 0.85, 0.9, 1, 1.0);
    g.part(CY, 0.78, H / 2 + 0.6, -dT, 0.1, H, 0.1, 0.85, 0.9, 1, 1.0);
    // zil
    const by = H + 1.6, ring = F.ring > 0 ? Math.sin(t * 30) * 0.3 * F.ring : 0;
    g.setRoot(0, by, -dT + 0.5); const bm = g.cur(); M4.RZ(bm, ring);
    g.part(S, 0, 0, 0, 0.62, 0.55, 0.62, 1.0, 0.82, 0.22, 1.7, 1, 0.2 + 0.5 * F.ring);
    g.part(TO, 0, -0.45, 0, 0.64, 0.26, 0.64, 1.0, 0.82, 0.22, 1.7, 1, 0.2);
    g.part(S, 0, -0.62, 0, 0.12, 0.12, 0.12, 0.7, 0.5, 0.1, 1.2);
    g.part(TO, 0, 0.62, 0, 0.12, 0.2, 0.12, 0.9, 0.9, 1, 1.0);
    g.setRoot(0, 0, 0);
    // vurma pedi
    g.part(CU, 0, 0.38, -dP, 1.7, 0.76, 1.5, 0.95, 0.2, 0.28, 0.8);
    g.part(CY, 0, 0.77, -dP, 0.55, 0.03, 0.55, 1.0, 0.9, 0.3, 1.3, 1, 0.2);
    g.part(CY, 0, 0.785, -dP, 0.34, 0.03, 0.34, 0.95, 0.2, 0.28, 1.0);
    g.part(CY, 0, 0.8, -dP, 0.14, 0.03, 0.14, 1, 1, 1, 1.0);
    // top
    const py = F.puckY;
    g.part(S, 0, py, -dT + 0.34, 0.36, 0.36, 0.22, 1.0, 0.82, 0.22, 1.7, 1, 0.35);
  }

  /* ------------------------- kamera ------------------------- */
  function camTarget(G, t, out) {
    const h = G.hero, k = h.bulk, z = -h.d;
    if (G.mode === 'menu' || G.mode === 'ward') {
      if (G.view === 'hat') { out.x = 0.0; out.y = 1.95; out.z = z + 3.4; out.tx = 0; out.ty = 1.35; out.tz = z; out.fov = 60; return; }
      if (G.view === 'body') { out.x = 0.0; out.y = 1.55; out.z = z + 5.6; out.tx = 0; out.ty = 0.55; out.tz = z; out.fov = 60; return; }
      out.x = 0.55; out.y = 1.6; out.z = z + 5.4 + 0.8 * k; out.tx = 0; out.ty = 1.0; out.tz = z; out.fov = 60; return;
    }
    if (G.mode === 'finale') {
      const F = G.fin, s = sstep(0, 1, F.cam);
      const cx = lerp(h.x * 0.5, -3.6, s), cy = lerp(5.0, 3.6, s), cz = lerp(z + 8.4, z + 6.6, s);
      const ly = lerp(1.1, 3.2 + F.puckY * 0.55, s);
      out.x = cx; out.y = cy; out.z = cz; out.tx = lerp(h.x * 0.3, 0.2, s); out.ty = ly; out.tz = lerp(z - 8, -F.towerD, s); out.fov = lerp(60, 70, s); return;
    }
    if (G.mode === 'win') {
      out.x = -2.7; out.y = 2.3; out.z = z - 3.4; out.tx = 0; out.ty = 1.55; out.tz = z; out.fov = 58; return;
    }
    // koşu
    out.x = h.x * 0.5; out.y = 5.0 + 0.7 * k; out.z = z + 8.6 + 1.1 * k;
    out.tx = h.x * 0.3; out.ty = 1.1; out.tz = z - 8; out.fov = 60;
  }
  const ct = { x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0, fov: 60 };
  function updateCam(G, dt) {
    camTarget(G, G.t, ct);
    const c = g.cam;
    if (!pres.camInit) { Object.assign(c, ct); pres.camInit = true; return; }
    const fast = G.mode === 'play';
    const rate = fast ? 16 : (G.mode === 'finale' ? 5 : 3.2);
    const a = 1 - Math.exp(-dt * rate);
    c.x += (ct.x - c.x) * a; c.y += (ct.y - c.y) * a;
    c.tx += (ct.tx - c.tx) * a; c.ty += (ct.ty - c.ty) * a;
    const az = fast ? 1 - Math.exp(-dt * 30) : a;       // ileri yönde sıkı takip
    c.z += (ct.z - c.z) * az; c.tz += (ct.tz - c.tz) * az;
    c.fov += (ct.fov - c.fov) * a;
  }

  /* ------------------------- ana çizim ------------------------- */
  function angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }

  function render(G, dt) {
    const t = G.t, h = G.hero;
    G.cam_d = h.d;
    setTheme(G.themeIdx);
    updateEnv(dt);
    // poz yumuşatma
    let yawT = Math.PI, runT = 0, flexT = 0, cheerT = 0, faceT = 0, tiltT = 0;
    if (G.mode === 'menu') { yawT = 0.32 * Math.sin(t * 0.7); flexT = 0.55 + 0.45 * Math.sin(t * 1.3); faceT = 1; }
    else if (G.mode === 'ward') { yawT = G.view === 'hat' ? 0.5 * Math.sin(t * 0.9) : t * 0.9; flexT = 0.5; faceT = 0; }
    else if (G.mode === 'play') { runT = h.run; yawT = Math.PI; tiltT = 0; faceT = h.face; }
    else if (G.mode === 'finale') { runT = h.run; yawT = Math.PI; flexT = h.flex; faceT = 1; }
    else if (G.mode === 'win') { yawT = Math.PI + 0.25 * Math.sin(t * 1.2); cheerT = 1; faceT = 0; }
    else if (G.mode === 'fail') { yawT = Math.PI; faceT = 2; tiltT = -0.15; }
    const ay = 1 - Math.exp(-dt * (G.mode === 'ward' ? 20 : 6));
    pres.yaw += angDiff(pres.yaw, yawT) * ay;
    const a2 = 1 - Math.exp(-dt * 9);
    pres.run += (runT - pres.run) * a2; pres.flex += (flexT - pres.flex) * a2; pres.cheer += (cheerT - pres.cheer) * a2;
    pres.tilt += (tiltT - pres.tilt) * a2; pres.face = faceT;
    updateCam(G, dt);
    g.begin(t);

    drawPlatform(G);
    drawEnv(G, t);

    // nesneler
    const dc = h.d, items = G.items;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.d < dc - 14 || it.d > dc + 150) continue;
      if (it.type === 'gate') gateFrames.call(null, it, h.x);
      else if (it.taken) continue;
      else if (it.type === 'coin') Fig.coin(it.x, 0.9, -it.d, t, i);
      else if (it.type === 'dumb') Fig.dumbbell(it.x, 1.0, -it.d, t, i, it.big);
      else if (it.type === 'burger') Fig.burger(it.x, 0, -it.d, t, i);
      else if (it.type === 'shake') Fig.shake(it.x, 0.2, -it.d, t, i);
      else if (it.type === 'wall' && !it.broken) Fig.wall(0, -it.d, 0, t);
    }
    drawFinale(G, t);

    // kahraman
    Fig.figure({
      x: h.x, y: h.y || 0, z: -h.d, yaw: pres.yaw, sc: 1, b: h.bulk, skin: G.eq.body, hat: G.eq.hat, t: t,
      run: pres.run, flex: pres.flex, cheer: pres.cheer, face: pres.face, lean: h.lean, tilt: pres.tilt,
      mallet: h.mallet, nod: h.nod || 0
    });

    // kırık duvar parçaları
    for (let i = 0; i < G.debris.length; i++) {
      const b = G.debris[i];
      g.setRoot(b.x, b.y, b.z); const m = g.cur(); M4.RX(m, b.rx); M4.RY(m, b.ry); M4.RZ(m, b.rz);
      g.part(CU, 0, 0, 0, b.s * 1.5, b.s, b.s, b.r, b.g, b.b, 0.2);
    }

    /* ---- yarı saydam geçiş ---- */
    g.depthMask(false);
    // gölgeler
    g.groundMask(shadowTex, h.x + 0.1, 0.03, -h.d - 0.05, 1.3 + 0.9 * h.bulk, 1.0 + 0.6 * h.bulk, 0.08, 0.1, 0.25, 0.4, 0);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.type === 'gate' || it.taken || it.d < dc - 6 || it.d > dc + 70) continue;
      if (it.type === 'wall') { if (!it.broken) g.groundMask(shadowTex, 0, 0.03, -it.d, 5.8, 1.6, 0.08, 0.1, 0.25, 0.35, 0); continue; }
      const sz = it.type === 'burger' ? 1.0 : 0.6;
      g.groundMask(shadowTex, it.x, 0.03, -it.d, sz, sz * 0.8, 0.08, 0.1, 0.25, 0.28, 0);
    }
    // kapı camları ve zemin ışıması
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.type !== 'gate' || it.d < dc - 6 || it.d > dc + 150) continue;
      const z = -it.d, near = Math.abs(it.d - dc) < 16;
      for (let s = 0; s < 2; s++) {
        const side = s === 0 ? it.l : it.r, c = side.good ? GOOD : BAD, cx = s === 0 ? -1.38 : 1.38;
        const aligned = near && ((h.x < 0) === (s === 0));
        g.part(CU, cx, 1.65, z, 2.62, 2.95, 0.05, c[0], c[1], c[2], 0.7, aligned ? 0.5 : 0.34, 0.15);
        g.groundMask(shadowTex, cx, 0.035, z + 1.4, 2.7, 3.4, c[0], c[1], c[2], aligned ? 0.7 : 0.4, 0);
      }
    }
    // etiketler (billboard)
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.d < dc - 6 || it.d > dc + 120) continue;
      if (it.type === 'gate') {
        const e0 = gateLabel(g_text(it.l), it.l.good), e1 = gateLabel(g_text(it.r), it.r.good);
        g.billboard(e0, -1.38, 1.65, -it.d + 0.1, 2.3, 1.15, 1);
        g.billboard(e1, 1.38, 1.65, -it.d + 0.1, 2.3, 1.15, 1);
      } else if (it.type === 'wall' && !it.broken) {
        g.billboard(reqLabel(it.req, h.P >= it.req), 0, 3.5, -it.d + 0.2, 1.9, 1.2, 1);
      }
    }
    // güç etiketi
    if (G.mode === 'play' || G.mode === 'finale' || G.mode === 'menu') {
      if (G.mode !== 'menu') g.billboard(powerLabel(Math.floor(h.P)), h.x, 2.6 + 0.45 * h.bulk + (G.eq.hat >= 10 && G.eq.hat !== 13 ? 0.35 : 0), -h.d, 1.45, 0.72, 1);
    }
    // final çarpanları
    {
      const F = G.fin;
      if (h.d > G.L - 60) {
        const N = 9, sh = F.H / N;
        for (let i = 0; i < N; i++) {
          const m = (1 + i * 0.5).toFixed(1);
          g.billboard(multLabel('x' + m), 0, 0.6 + sh * (i + 0.5), -F.towerD + 0.3, 1.05, 0.52, 1);
        }
        g.billboard(bigLabel('FINISH', '#ffffff', '#e8ffb0', '#3a5a00'), 0, 4.4, -G.L + 0.3, 5.2, 1.6, 1);
      }
    }
    // parçacıklar
    g.ptReset();
    for (let i = 0; i < G.parts.length; i++) {
      const p = G.parts[i], a = clamp(p.life / p.max, 0, 1);
      g.ptAdd(p.x, p.y, p.z, p.r, p.g, p.b, Math.min(1, a * 1.6), p.sq ? -p.size : p.size);
    }
    g.ptFlush();
    g.depthMask(true);
  }
  function g_text(side) { return { ADD: '+', MUL: '×', SUB: '-', DIV: '÷' }[side.op] + side.v; }

  /* üstteki ekranlar için: dünya noktasını ekrana çevir (0..1) */
  function screenOf(x, y, z) { const p = g.project(x, y, z); return { x: p.x, y: 1 - p.y }; }

  return { init, render, setTheme, screenOf, pres };
})();
