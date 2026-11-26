'use strict';
/* FLEX RUSH - main.js : açılış, döngü, dokunma kontrolü */
(function () {
  const $ = id => document.getElementById(id);
  const t0 = performance.now();
  let scaleQ = 1, slow = 0, fast = 0, last = 0, booted = false, canvas;
  const QBASE = [0.6, 0.8, 1.0];

  function fail(msg) { $('errm').textContent = msg; $('err').style.display = 'flex'; $('splash').style.display = 'none'; }
  window.onerror = (m, s, l) => { try { console.log('ERR', m, s, l); } catch (e) { } };
  window.applyQuality = function () { scaleQ = QBASE[Save.d.set.quality] || 1; GLX.resize(scaleQ); };
  window.__back = () => UI.back();

  function bar(p) { const b = $('lbar'); if (b) b.style.width = Math.round(p * 100) + '%'; }

  function boot() {
    Save.load();
    canvas = $('gl');
    bar(0.15); $('ltip').textContent = UI.tip();
    const fonts = Promise.race([
      Promise.all(['20px Anton', '20px "Archivo Black"', '600 20px Poppins', '500 20px Poppins'].map(f => document.fonts.load(f, 'ĞÜŞİÖÇığüşöç0123456789'))),
      new Promise(r => setTimeout(r, 2500))
    ]);
    fonts.then(() => {
      bar(0.5);
      try { GLX.init(canvas); Scene.init(); } catch (e) { fail(T('Your device does not support WebGL.', 'Cihazın WebGL desteklemiyor.')); return; }
      applyQuality(); Game.applyEquip(); Game.toMenu(Save.d.level);
      UI.init(); bar(0.8);
      booted = true; requestAnimationFrame(loop);
      const tipIv = setInterval(() => { $('ltip').textContent = UI.tip(); }, 1100);
      const wait = Math.max(0, 2800 - (performance.now() - t0));
      setTimeout(() => {
        bar(1); clearInterval(tipIv);
        setTimeout(() => { $('splash').classList.add('out'); UI.welcome(); setTimeout(() => $('splash').remove(), 700); }, 350);
      }, wait);
    });
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    const dtRaw = Math.min((ts - last) / 1000, 0.1); last = ts;
    if (dtRaw <= 0) return;
    // dinamik çözünürlük
    const ms = dtRaw * 1000;
    if (ms > 26) { slow++; fast = 0; } else if (ms < 19) { fast++; slow = Math.max(0, slow - 1); }
    if (slow > 45 && scaleQ > 0.55) { scaleQ = Math.max(0.55, scaleQ - 0.1); slow = 0; GLX.resize(scaleQ); }
    else if (fast > 400 && scaleQ < (QBASE[Save.d.set.quality] || 1) - 0.01) { scaleQ = Math.min(QBASE[Save.d.set.quality] || 1, scaleQ + 0.1); fast = 0; GLX.resize(scaleQ); }
    else GLX.resize();
    Game.update(dtRaw);
    Scene.render(Game.G, Math.min(dtRaw, 0.05));
    UI.frame(Math.min(dtRaw, 0.05));
  }

  /* ---- kaydırma: parmak hareketi + hızlanma ---- */
  let dragId = null, lx = 0, lt = 0;
  window.addEventListener('pointerdown', e => {
    Snd.unlock();
    if (Game.G.mode !== 'play') return;
    dragId = e.pointerId; lx = e.clientX; lt = e.timeStamp;
  });
  window.addEventListener('pointermove', e => {
    if (e.pointerId !== dragId || Game.G.mode !== 'play') return;
    const dx = e.clientX - lx; lx = e.clientX;
    const dtm = Math.max(1, e.timeStamp - lt); lt = e.timeStamp;
    const v = Math.abs(dx) / dtm;                       // px/ms
    const gain = 1 + clamp(v * 0.35, 0, 0.7);           // hızlı kaydırma = biraz daha fazla
    Game.drag(dx / window.innerWidth * 6.2 * gain);
  });
  const end = e => { if (e.pointerId === dragId) dragId = null; };
  window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
  window.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'a') Game.setKey(-1); if (e.key === 'ArrowRight' || e.key === 'd') Game.setKey(1); });
  window.addEventListener('keyup', e => { if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) Game.setKey(0); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) Snd.music(false); else if (booted) Snd.music(true); });
  document.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('resize', () => { if (booted) GLX.resize(); });

  boot();
})();
