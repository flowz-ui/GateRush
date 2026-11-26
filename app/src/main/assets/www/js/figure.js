'use strict';
/* ============================================================
   FLEX RUSH  -  figure.js
   Kaslı karakter (iskelet + kas büyümesi), şapkalar ve nesneler
   Yerel eksen: ön = +z, yukarı = +y. Açı + ise bacak/kol geriye gider.
   ============================================================ */

const Fig = (() => {
  const g = GLX, M = GLX.meshes;
  let S, CU, CY, CO, TO, FR;
  function bindMeshes() { S = M.sphere; CU = M.cube; CY = M.cyl; CO = M.cone; TO = M.torus; FR = M.frust; }

  /* --------------------------- şapkalar --------------------------- */
  // başın merkezinde (0,0,0), baş yarıçapı 0.30, ön = +z
  function hat(id, t) {
    switch (id) {
      case 1: { // bandana
        g.part(TO, 0, 0.1, 0, 0.30, 0.34, 0.30, 0.95, 0.20, 0.28, 0.4);
        g.part(S, 0, 0.1, -0.31, 0.06, 0.07, 0.05, 0.95, 0.20, 0.28, 0.4);
        g.push(); let m = g.cur(); M4.T(m, 0.02, 0.1, -0.33); M4.RZ(m, -0.5); M4.S(m, 0.035, 0.16, 0.02); g.draw(S, 0.95, 0.2, 0.28, 0.3); g.pop();
        g.push(); m = g.cur(); M4.T(m, -0.02, 0.1, -0.33); M4.RZ(m, 0.5); M4.S(m, 0.035, 0.16, 0.02); g.draw(S, 0.95, 0.2, 0.28, 0.3); g.pop();
        break;
      }
      case 2: { // kep
        g.part(S, 0, 0.06, -0.01, 0.325, 0.29, 0.325, 0.22, 0.46, 0.96, 0.6);
        g.part(S, 0, 0.05, 0.27, 0.2, 0.028, 0.19, 0.12, 0.30, 0.78, 0.6);
        g.part(S, 0, 0.35, -0.01, 0.04, 0.04, 0.04, 0.95, 0.95, 1.0, 0.5);
        g.part(S, 0, 0.17, 0.31, 0.06, 0.06, 0.02, 0.78, 1.0, 0.24, 0.5, 1, 0.2);
        break;
      }
      case 3: { // kovboy
        g.part(CY, 0, 0.10, 0, 0.56, 0.03, 0.50, 0.95, 0.76, 0.30, 0.3);
        g.part(FR, 0, 0.23, 0, 0.27, 0.22, 0.27, 0.95, 0.76, 0.30, 0.3);
        g.part(S, 0, 0.34, 0, 0.15, 0.04, 0.15, 0.80, 0.60, 0.20, 0.2);
        g.part(TO, 0, 0.15, 0, 0.27, 0.22, 0.27, 0.45, 0.24, 0.12, 0.3);
        g.part(S, -0.52, 0.14, 0, 0.12, 0.035, 0.2, 0.95, 0.76, 0.30, 0.3);
        g.part(S, 0.52, 0.14, 0, 0.12, 0.035, 0.2, 0.95, 0.76, 0.30, 0.3);
        break;
      }
      case 4: { // kaptan
        g.part(CY, 0, 0.20, 0, 0.34, 0.15, 0.34, 0.98, 0.98, 1.0, 0.4);
        g.part(CY, 0, 0.29, 0, 0.37, 0.03, 0.37, 0.98, 0.98, 1.0, 0.4);
        g.part(TO, 0, 0.12, 0, 0.31, 0.22, 0.31, 0.10, 0.14, 0.40, 0.5);
        g.part(S, 0, 0.13, 0.30, 0.2, 0.022, 0.16, 0.05, 0.05, 0.08, 1.2);
        g.part(S, 0, 0.22, 0.34, 0.05, 0.05, 0.02, 1.0, 0.8, 0.2, 1.5, 1, 0.2);
        break;
      }
      case 5: { // çiçek tacı
        g.part(TO, 0, 0.1, 0, 0.31, 0.3, 0.31, 0.25, 0.70, 0.30, 0.3);
        for (let i = 0; i < 6; i++) {
          const a = i * TAU / 6 + 0.4, cr = i % 3 === 0 ? [1, 0.5, 0.72] : i % 3 === 1 ? [1, 1, 1] : [1, 0.85, 0.3];
          g.part(S, Math.cos(a) * 0.31, 0.13, Math.sin(a) * 0.31, 0.075, 0.075, 0.075, cr[0], cr[1], cr[2], 0.5);
          g.part(S, Math.cos(a) * 0.345, 0.13, Math.sin(a) * 0.345, 0.03, 0.03, 0.03, 1, 0.8, 0.2, 0.3);
        }
        break;
      }
      case 6: { // trafik konisi
        g.part(CU, 0, 0.27, 0, 0.58, 0.04, 0.58, 1.0, 0.42, 0.08, 0.4);
        g.part(CO, 0, 0.48, 0, 0.27, 0.42, 0.27, 1.0, 0.42, 0.08, 0.5);
        g.part(TO, 0, 0.38, 0, 0.19, 0.16, 0.19, 1, 1, 1, 0.5);
        g.part(TO, 0, 0.52, 0, 0.115, 0.16, 0.115, 1, 1, 1, 0.5);
        break;
      }
      case 7: { // parti şapkası
        g.push(); const m = g.cur(); M4.T(m, 0, 0.30, 0); M4.RZ(m, 0.14);
        g.part(CO, 0, 0.2, 0, 0.21, 0.46, 0.21, 1.0, 0.35, 0.70, 0.5);
        g.part(TO, 0, 0.12, 0, 0.17, 0.2, 0.17, 0.3, 0.8, 1.0, 0.5);
        g.part(TO, 0, 0.27, 0, 0.11, 0.2, 0.11, 1.0, 0.9, 0.3, 0.5);
        g.part(S, 0, 0.45, 0, 0.07, 0.07, 0.07, 1.0, 0.9, 0.3, 0.5);
        g.pop();
        break;
      }
      case 8: { // güneş gözlüğü
        g.part(S, -0.115, 0.03, 0.268, 0.105, 0.078, 0.03, 0.04, 0.05, 0.09, 2.0);
        g.part(S, 0.115, 0.03, 0.268, 0.105, 0.078, 0.03, 0.04, 0.05, 0.09, 2.0);
        g.part(S, -0.14, 0.06, 0.29, 0.03, 0.015, 0.01, 1, 1, 1, 0, 1, 0.8);
        g.part(S, 0.09, 0.06, 0.29, 0.03, 0.015, 0.01, 1, 1, 1, 0, 1, 0.8);
        g.part(CU, 0, 0.045, 0.285, 0.06, 0.022, 0.02, 0.04, 0.05, 0.09, 1);
        g.part(CU, -0.255, 0.04, 0.15, 0.02, 0.022, 0.26, 0.04, 0.05, 0.09, 1);
        g.part(CU, 0.255, 0.04, 0.15, 0.02, 0.022, 0.26, 0.04, 0.05, 0.09, 1);
        break;
      }
      case 9: { // şef
        g.part(CY, 0, 0.13, 0, 0.31, 0.16, 0.31, 0.98, 0.98, 0.98, 0.3);
        g.part(S, 0, 0.42, 0, 0.27, 0.22, 0.27, 1, 1, 1, 0.3);
        for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + 0.78; g.part(S, Math.cos(a) * 0.2, 0.33, Math.sin(a) * 0.2, 0.15, 0.15, 0.15, 1, 1, 1, 0.3); }
        break;
      }
      case 10: { // silindir şapka
        g.part(CY, 0, 0.08, 0, 0.44, 0.03, 0.44, 0.10, 0.12, 0.36, 1.0);
        for (let i = 0; i < 4; i++) g.part(CY, 0, 0.16 + i * 0.105, 0, 0.26, 0.105, 0.26, i % 2 ? 1 : 0.92, i % 2 ? 1 : 0.16, i % 2 ? 1 : 0.22, 0.6);
        g.part(CY, 0, 0.6, 0, 0.265, 0.03, 0.265, 0.10, 0.12, 0.36, 1.0);
        break;
      }
      case 11: { // viking
        g.part(S, 0, 0.06, 0, 0.33, 0.28, 0.33, 0.62, 0.66, 0.72, 1.3);
        g.part(TO, 0, 0.08, 0, 0.33, 0.22, 0.33, 1.0, 0.8, 0.2, 1.4);
        g.part(CU, 0, -0.02, 0.315, 0.045, 0.18, 0.03, 0.62, 0.66, 0.72, 1.3);
        for (let s = -1; s <= 1; s += 2) {
          g.push(); let m = g.cur(); M4.T(m, s * 0.31, 0.13, 0); M4.RZ(m, -s * 0.95);
          g.push(); m = g.cur(); M4.T(m, 0, 0.14, 0); M4.S(m, 0.085, 0.3, 0.085); g.draw(CO, 0.98, 0.93, 0.80, 0.5); g.pop();
          M4.T(m, 0, 0.27, 0); M4.RZ(m, s * 0.75);
          g.push(); m = g.cur(); M4.T(m, 0, 0.11, 0); M4.S(m, 0.06, 0.24, 0.06); g.draw(CO, 0.98, 0.93, 0.80, 0.5); g.pop();
          g.pop();
        }
        break;
      }
      case 12: { // taç
        g.part(CY, 0, 0.18, 0, 0.275, 0.10, 0.275, 1.0, 0.80, 0.20, 1.6);
        for (let i = 0; i < 5; i++) {
          const a = i * TAU / 5 + 0.3, x = Math.cos(a) * 0.245, z = Math.sin(a) * 0.245;
          g.part(CO, x, 0.31, z, 0.075, 0.18, 0.075, 1.0, 0.80, 0.20, 1.6);
          g.part(S, x, 0.41, z, 0.035, 0.035, 0.035, i % 2 ? 0.3 : 1, i % 2 ? 0.8 : 0.2, i % 2 ? 1 : 0.3, 1, 1, 0.5);
        }
        g.part(S, 0, 0.18, 0.275, 0.055, 0.055, 0.03, 1, 0.15, 0.25, 1.5, 1, 0.5);
        break;
      }
      case 13: { // hale
        const bob = Math.sin(t * 2.2) * 0.03;
        g.part(TO, 0, 0.58 + bob, 0, 0.27, 0.45, 0.27, 1.0, 0.86, 0.3, 1.2, 1, 0.85);
        break;
      }
    }
  }

  /* --------------------------- ana figür --------------------------- */
  const dk = [0, 0, 0];
  function figure(f) {
    const k = clamp(f.b, 0, 1.2), kk = sstep(0.04, 0.55, k);
    const sk = SKINS[f.skin] || SKINS[0], sc = skinColor(sk, f.t);
    const C = sc.c, gl = sc.gloss, em = sc.emit;
    const cr = C[0], cg = C[1], cb = C[2];
    const dr = cr * 0.82, dg = cg * 0.8, db = cb * 0.82;           // gölge tonu
    const SHc = sk.anim === 'rainbow' ? hsv(f.t * 0.22 + 0.5, 0.8, 0.9) : sk.shorts;
    const HR = sk.hair;
    const run = f.run || 0, flex = f.flex || 0, cheer = f.cheer || 0;
    const ph = f.t * 11.5;
    const hasMal = f.mallet !== null && f.mallet !== undefined;
    const pump = 1 + 0.05 * flex * Math.sin(f.t * 7);

    // ölçüler
    const hipY = 0.80, thL = 0.36, shL = 0.36;
    const hipW = 0.09 + 0.065 * k, rt = 0.062 + 0.072 * k, rs = 0.048 + 0.052 * k;
    const waistW = 0.115 + 0.075 * k, waistD = 0.09 + 0.07 * k;
    const chestW = (0.14 + 0.22 * k) * pump, chestD = 0.10 + 0.10 * k;
    const chestY = hipY + 0.44, shY = hipY + 0.62;
    const armX = chestW + 0.02 + 0.055 * k;
    const ra = 0.052 + 0.068 * k, rf = 0.044 + 0.052 * k;
    const headR = 0.30, headY = shY + 0.36;
    const bob = run * Math.abs(Math.sin(ph)) * 0.07 + flex * Math.sin(f.t * 7) * 0.012;

    g.setRoot(f.x, f.y + bob, f.z);
    const root = g.cur();
    M4.RY(root, f.yaw);
    M4.RZ(root, (f.lean || 0) * 0.28);
    M4.RX(root, run * 0.10 + (f.tilt || 0));
    const s = f.sc * (1 + 0.1 * k);
    M4.S(root, s, s, s);

    /* ---- bacaklar ---- */
    for (let sd = -1; sd <= 1; sd += 2) {
      const p = ph + (sd > 0 ? Math.PI : 0);
      const th = run * 0.72 * Math.sin(p);
      const kn = run * (0.25 + 0.65 * Math.max(0, Math.cos(p + 0.5))) + flex * 0.05;
      g.push(); let m = g.cur();
      M4.T(m, sd * hipW, hipY, 0); M4.RX(m, th); M4.RZ(m, sd * (0.04 + 0.13 * k + flex * 0.1));
      g.part(S, 0, -thL * 0.5, 0, rt, thL * 0.56, rt * 1.08, cr, cg, cb, gl, 1, em);
      g.part(S, 0, -thL * 0.26, 0, rt * 1.15, thL * 0.32, rt * 1.2, SHc[0], SHc[1], SHc[2], 0.4);
      M4.T(m, 0, -thL, 0); M4.RX(m, kn);
      g.part(S, 0, -shL * 0.48, 0, rs, shL * 0.55, rs, cr, cg, cb, gl, 1, em);
      if (kk > 0.05) g.part(S, 0, -shL * 0.3, -rs * 0.7, rs * 0.95 * kk + 0.01, shL * 0.22 * kk + 0.01, rs * 0.8 * kk + 0.01, dr, dg, db, gl, 1, em);
      // ayakkabı
      g.part(S, 0, -shL - 0.015, 0.06, 0.082 + 0.03 * k, 0.062, 0.15, 0.97, 0.97, 1.0, 0.6);
      g.part(S, 0, -shL - 0.06, 0.06, 0.088 + 0.03 * k, 0.02, 0.155, 0.78, 1.0, 0.24, 0.3);
      g.pop();
    }

    /* ---- gövde ---- */
    g.part(S, 0, hipY - 0.03, 0, hipW * 1.8 + rt * 0.7, 0.17, 0.15 + 0.07 * k, SHc[0], SHc[1], SHc[2], 0.4);
    g.part(S, 0, hipY + 0.17, 0, waistW, 0.2, waistD, cr, cg, cb, gl, 1, em);
    g.part(S, 0, hipY + 0.085, 0, waistW * 1.06 + 0.01, 0.03, waistD * 1.1 + 0.01, 0.78, 1.0, 0.24, 0.5);
    g.part(S, 0, chestY, 0, chestW, 0.24, chestD, cr, cg, cb, gl, 1, em);
    if (kk > 0.02) {
      // göğüs kasları + karın kasları (ön)
      for (let sd = -1; sd <= 1; sd += 2) {
        g.part(S, sd * chestW * 0.46, chestY + 0.05, chestD * 0.74, chestW * 0.52, 0.12 + 0.06 * kk, chestD * 0.5, cr, cg, cb, gl, 1, em);
        for (let r = 0; r < 3; r++)
          g.part(S, sd * 0.055 * (0.8 + 0.5 * k), hipY + 0.31 - r * 0.075, waistD * 0.93, 0.05 * kk + 0.01, 0.034 * kk + 0.005, 0.03 * kk + 0.005, dr, dg, db, gl, 1, em);
        // sırt kasları (arka)
        g.part(S, sd * chestW * 0.6, chestY - 0.05, -chestD * 0.72, chestW * 0.44 * kk + 0.02, 0.22, chestD * 0.5, cr, cg, cb, gl, 1, em);
        g.part(S, sd * (0.11 + 0.05 * k), shY + 0.02, -0.01, (0.05 + 0.1 * kk), 0.05 + 0.05 * kk, 0.09, cr, cg, cb, gl, 1, em);
      }
      g.part(S, 0, chestY + 0.05, -chestD * 0.8, chestW * 0.5, 0.22, 0.04 + 0.03 * kk, dr, dg, db, gl, 1, em);
    }
    // boyun
    g.part(CY, 0, shY + 0.1, 0, 0.075 + 0.035 * k, 0.12, 0.075 + 0.035 * k, cr, cg, cb, gl, 1, em);

    /* ---- kollar ---- */
    for (let sd = -1; sd <= 1; sd += 2) {
      const p = ph + (sd > 0 ? Math.PI : 0);
      let swing = -run * 0.8 * Math.sin(p);
      let abd = sd * (0.10 + 0.32 * k + 0.06 * run);
      let elb = -(0.35 + run * (0.8 + 0.25 * Math.sin(p * 2)));
      let fz = 0;
      abd = lerp(abd, sd * 1.32, flex); swing = lerp(swing, -0.15, flex); elb = lerp(elb, -0.25, flex); fz = flex * sd * 1.75;
      abd = lerp(abd, sd * 2.7, cheer); swing = lerp(swing, 0, cheer); elb = lerp(elb, -0.1, cheer); fz = lerp(fz, sd * 0.15, cheer);
      if (hasMal) { swing = f.mallet; abd = sd * 0.08; elb = 0; fz = 0; }
      g.push(); const m = g.cur();
      M4.T(m, sd * armX, shY, 0);
      g.part(S, 0, 0, 0, 0.075 + 0.1 * k, 0.075 + 0.09 * k, 0.075 + 0.09 * k, cr, cg, cb, gl, 1, em);   // omuz
      M4.RZ(m, abd); M4.RX(m, swing);
      g.part(S, 0, -0.15, 0, ra, 0.19, ra, cr, cg, cb, gl, 1, em);
      if (kk > 0.03) {
        g.part(S, 0, -0.14, ra * 0.5, ra * (0.95 + 0.4 * kk), 0.12 + 0.05 * kk, ra * (0.9 + 0.55 * kk), cr, cg, cb, gl, 1, em);      // pazı
        g.part(S, 0, -0.16, -ra * 0.5, ra * (0.9 + 0.3 * kk), 0.12 + 0.04 * kk, ra * (0.85 + 0.4 * kk), dr, dg, db, gl, 1, em);     // arka kol
      }
      M4.T(m, 0, -0.30, 0); M4.RX(m, elb); M4.RZ(m, fz);
      g.part(S, 0, -0.15, 0, rf * (1 + 0.1 * kk), 0.18, rf * (1 + 0.1 * kk), cr, cg, cb, gl, 1, em);
      g.part(S, 0, -0.33, 0, 0.062 + 0.045 * k, 0.062 + 0.045 * k, 0.062 + 0.045 * k, cr, cg, cb, gl, 1, em);   // yumruk
      g.pop();
    }

    /* ---- çekiç ---- */
    if (hasMal) {
      g.push(); let m = g.cur();
      M4.T(m, 0, shY, 0.02); M4.RX(m, f.mallet); M4.T(m, 0, -0.62, 0);
      g.part(CY, 0, -0.62, 0, 0.05, 1.5, 0.05, 0.75, 0.5, 0.28, 0.5);
      g.part(CU, 0, -1.42, 0, 1.0, 0.55, 0.55, 0.95, 0.20, 0.28, 0.9);
      g.part(CU, -0.42, -1.42, 0, 0.12, 0.6, 0.6, 1.0, 0.82, 0.2, 1.4);
      g.part(CU, 0.42, -1.42, 0, 0.12, 0.6, 0.6, 1.0, 0.82, 0.2, 1.4);
      g.pop();
    }

    /* ---- baş ---- */
    g.push(); const hm = g.cur();
    M4.T(hm, 0, headY, 0);
    if (f.nod) M4.RX(hm, f.nod);
    g.part(S, 0, 0, 0, headR, headR * 1.02, headR, cr, cg, cb, gl, 1, em);
    g.part(S, -headR * 0.97, -0.02, 0, 0.05, 0.07, 0.04, cr, cg, cb, gl, 1, em);
    g.part(S, headR * 0.97, -0.02, 0, 0.05, 0.07, 0.04, cr, cg, cb, gl, 1, em);
    g.part(S, 0, 0.045, -0.055, headR * 1.045, headR * 1.0, headR * 1.0, HR[0], HR[1], HR[2], 0.5);       // saç
    // yüz
    const ang = f.face === 1 ? 0.45 : f.face === 2 ? -0.35 : 0.1;
    for (let sd = -1; sd <= 1; sd += 2) {
      g.part(S, sd * 0.115, 0.01, 0.255, 0.078, 0.092, 0.05, 1, 1, 1, 0.8);
      g.part(S, sd * 0.115, 0.005, 0.292, 0.042, 0.052, 0.025, 0.06, 0.06, 0.12, 1.2);
      g.part(S, sd * 0.125, 0.025, 0.31, 0.014, 0.014, 0.01, 1, 1, 1, 0, 1, 0.6);
      g.push(); const bm = g.cur();
      M4.T(bm, sd * 0.115, 0.135, 0.265); M4.RZ(bm, sd * ang); M4.S(bm, 0.12, 0.028, 0.035);
      g.draw(CU, HR[0] * 0.9, HR[1] * 0.9, HR[2] * 0.9, 0.3); g.pop();
      g.part(S, sd * 0.19, -0.08, 0.2, 0.06, 0.035, 0.03, 1, 0.55, 0.58, 0.2);      // yanak
    }
    if (f.face === 2) { g.part(S, 0, -0.14, 0.275, 0.05, 0.06, 0.03, 0.35, 0.05, 0.1, 0.5); }
    else {
      const open = f.face === 1 ? 0.05 : 0.035;
      g.part(S, 0, -0.135, 0.272, 0.085, open, 0.03, 0.40, 0.05, 0.10, 0.5);
      g.part(S, 0, -0.118, 0.285, 0.07, 0.016, 0.02, 1, 1, 1, 0.6);
    }
    if (f.hat) hat(f.hat, f.t);
    g.pop();
  }

  /* --------------------------- nesneler --------------------------- */
  function coin(x, y, z, t, i) {
    g.setRoot(x, y + Math.sin(t * 3 + i) * 0.1, z);
    const m = g.cur(); M4.RY(m, t * 3 + i); M4.RX(m, Math.PI / 2);
    g.part(CY, 0, 0, 0, 0.3, 0.06, 0.3, 1.0, 0.78, 0.18, 1.4, 1, 0.18);
    g.part(CY, 0, 0, 0, 0.22, 0.085, 0.22, 1.0, 0.9, 0.45, 1.4, 1, 0.22);
    g.part(CY, 0, 0, 0, 0.1, 0.1, 0.1, 1.0, 0.7, 0.12, 1.4, 1, 0.15);
  }
  function dumbbell(x, y, z, t, i, big) {
    g.setRoot(x, y + Math.sin(t * 2.6 + i) * 0.1, z);
    const m = g.cur(); M4.RY(m, t * 1.8 + i); M4.RZ(m, 0.4);
    const c = big ? [1.0, 0.8, 0.2] : [0.78, 1.0, 0.24], sc = big ? 1.35 : 1;
    M4.S(m, sc, sc, sc);
    g.push(); let mm = g.cur(); M4.RZ(mm, Math.PI / 2); M4.S(mm, 0.07, 0.85, 0.07); g.draw(CY, 0.72, 0.76, 0.82, 1.2); g.pop();
    for (let sd = -1; sd <= 1; sd += 2) {
      g.push(); mm = g.cur(); M4.T(mm, sd * 0.3, 0, 0); M4.RZ(mm, Math.PI / 2); M4.S(mm, 0.27, 0.13, 0.27); g.draw(CY, c[0], c[1], c[2], 1.0, 1, 0.1); g.pop();
      g.push(); mm = g.cur(); M4.T(mm, sd * 0.43, 0, 0); M4.RZ(mm, Math.PI / 2); M4.S(mm, 0.2, 0.1, 0.2); g.draw(CY, 0.13, 0.15, 0.22, 1.0); g.pop();
    }
  }
  function burger(x, y, z, t, i) {
    g.setRoot(x, y, z);
    const m = g.cur(); M4.RZ(m, Math.sin(t * 4 + i) * 0.1); M4.T(m, 0, Math.abs(Math.sin(t * 3 + i)) * 0.08, 0);
    g.part(S, 0, 0.17, 0, 0.44, 0.17, 0.44, 0.95, 0.66, 0.30, 0.4);
    g.part(CY, 0, 0.33, 0, 0.45, 0.11, 0.45, 0.34, 0.17, 0.08, 0.3);
    g.part(TO, 0, 0.42, 0, 0.42, 0.28, 0.42, 0.35, 0.8, 0.25, 0.3);
    g.part(S, 0, 0.62, 0, 0.45, 0.32, 0.45, 0.96, 0.68, 0.32, 0.5);
    for (let sd = -1; sd <= 1; sd += 2) {
      g.part(S, sd * 0.15, 0.62, 0.37, 0.09, 0.1, 0.05, 1, 1, 1, 0.5);
      g.part(S, sd * 0.15, 0.6, 0.41, 0.045, 0.05, 0.03, 0.1, 0.05, 0.05, 1);
      g.push(); const bm = g.cur(); M4.T(bm, sd * 0.15, 0.76, 0.36); M4.RZ(bm, sd * 0.5); M4.S(bm, 0.17, 0.04, 0.04); g.draw(CU, 0.25, 0.12, 0.05, 0.2); g.pop();
    }
    g.part(S, 0, 0.5, 0.42, 0.09, 0.04, 0.03, 0.6, 0.1, 0.12, 0.3);
  }
  function shake(x, y, z, t, i) {
    g.setRoot(x, y + 0.2 + Math.sin(t * 2.4 + i) * 0.1, z);
    const m = g.cur(); M4.RY(m, t * 1.5 + i); M4.RZ(m, 0.15);
    g.part(CY, 0, 0.25, 0, 0.2, 0.5, 0.2, 0.96, 0.96, 1.0, 0.9);
    g.part(CY, 0, 0.25, 0, 0.205, 0.22, 0.205, 0.78, 1.0, 0.24, 0.8, 1, 0.1);
    g.part(CY, 0, 0.55, 0, 0.22, 0.09, 0.22, 0.95, 0.2, 0.3, 0.9);
    g.part(CY, 0.04, 0.78, 0, 0.025, 0.3, 0.025, 1.0, 0.8, 0.2, 0.9);
  }
  function wall(x, z, len, t, brokenFlash) {
    g.setRoot(x, 0, z);
    g.part(CU, 0, 1.2, 0, 5.4, 2.4, 0.7, 0.42, 0.22, 0.2, 0.2);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const bx = -1.98 + c * 1.32;
      const v = 0.8 + 0.2 * hash1(r * 7 + c * 3);
      g.part(CU, bx, 0.4 + r * 0.8, 0.38, 1.24, 0.72, 0.16, 0.82 * v, 0.34 * v, 0.28 * v, 0.35);
    }
    g.part(CU, 0, 2.5, 0, 5.6, 0.2, 0.8, 0.95, 0.95, 1.0, 0.3);
  }

  return { figure, hat, coin, dumbbell, burger, shake, wall, bindMeshes };
})();
