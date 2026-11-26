'use strict';
/* ============================================================
   FLEX RUSH  -  ui.js   (menüler, HUD, mağaza, dolap, ayarlar)
   ============================================================ */
const UI = (() => {
  const $ = id => document.getElementById(id);
  const ic = (n, c) => '<svg class="ico ' + (c || '') + '"><use href="#i-' + n + '"/></svg>';
  const fmt = n => { n = Math.floor(n); return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : String(n); };
  const rgb = c => 'rgb(' + c.map(v => Math.round(clamp(v, 0, 1) * 255)).join(',') + ')';
  const G = () => Game.G;
  let greetT = 0, cur = 'splash', modalOn = null, sel = 0, kind = 'body', greeted = false, tipN = 0, shownPower = 10, lastTier = 0, adBusy = false, verTaps = 0, doubled = false;
  const SCR = ['menu', 'hud', 'ward', 'result', 'fail'];

  const HAT = {
    1: '<path d="M6 26c6-8 30-8 36 0v7c-6-8-30-8-36 0z" fill="#E8344E"/><path d="M38 28l7 4-2 6-7-5z" fill="#C0203A"/>',
    2: '<path d="M8 30c0-12 8-18 17-18s16 6 16 18z" fill="#2F6BFF"/><path d="M26 30h20c0 3-5 5-12 5-6 0-8-2-8-5z" fill="#1A47C2"/><circle cx="25" cy="12" r="2.5" fill="#fff"/>',
    3: '<ellipse cx="24" cy="32" rx="21" ry="6" fill="#A86B34"/><path d="M12 31c0-10 4-18 8-14 3 3 5 3 8 0 4-4 8 4 8 14z" fill="#C98A4A"/><path d="M12 29h24v3H12z" fill="#5A3416"/>',
    4: '<path d="M8 28c0-10 7-16 16-16s16 6 16 16z" fill="#F4F6FF"/><path d="M6 28h36v5c-6 3-30 3-36 0z" fill="#1A2350"/><circle cx="24" cy="22" r="4" fill="#FFC83D"/>',
    5: '<circle cx="14" cy="28" r="6" fill="#FF6FA8"/><circle cx="14" cy="28" r="2.5" fill="#FFE14D"/><circle cx="26" cy="20" r="7" fill="#FFD84D"/><circle cx="26" cy="20" r="3" fill="#FF7A3D"/><circle cx="36" cy="30" r="6" fill="#B26BFF"/><circle cx="36" cy="30" r="2.5" fill="#fff"/><path d="M8 38h32" stroke="#3DBB5A" stroke-width="4" stroke-linecap="round"/>',
    6: '<path d="M24 5l13 34H11z" fill="#FF8A1F"/><path d="M19 20h10l2.5 7h-15z" fill="#fff"/><rect x="8" y="38" width="32" height="5" rx="2" fill="#E06A00"/>',
    7: '<path d="M24 10l12 30H12z" fill="#FF4FA3"/><circle cx="21" cy="27" r="2.5" fill="#FFE14D"/><circle cx="28" cy="33" r="2.5" fill="#3DE0FF"/><circle cx="23" cy="36" r="2" fill="#fff"/><circle cx="24" cy="9" r="5" fill="#FFE14D"/>',
    8: '<rect x="4" y="18" width="18" height="13" rx="5" fill="#111A3A"/><rect x="26" y="18" width="18" height="13" rx="5" fill="#111A3A"/><path d="M22 22h4" stroke="#111A3A" stroke-width="3"/><path d="M8 22h6" stroke="#7FA8FF" stroke-width="2"/>',
    9: '<circle cx="14" cy="18" r="8" fill="#fff"/><circle cx="24" cy="14" r="9" fill="#fff"/><circle cx="34" cy="18" r="8" fill="#fff"/><rect x="12" y="22" width="24" height="16" rx="3" fill="#F1F4FF"/><rect x="12" y="34" width="24" height="4" fill="#D5DCF5"/>',
    10: '<rect x="13" y="8" width="22" height="26" rx="2" fill="#1C2145"/><rect x="13" y="26" width="22" height="5" fill="#C026D3"/><rect x="5" y="33" width="38" height="6" rx="3" fill="#1C2145"/>',
    11: '<path d="M9 34c0-12 6-18 15-18s15 6 15 18z" fill="#9AA6C0"/><rect x="9" y="29" width="30" height="5" fill="#6B778F"/><path d="M10 26C2 24 2 14 6 9c1 7 5 9 8 10z" fill="#F5E8C8"/><path d="M38 26c8-2 8-12 4-17-1 7-5 9-8 10z" fill="#F5E8C8"/>',
    12: '<path d="M7 36L5 14l11 10 8-14 8 14 11-10-2 22z" fill="#FFC83D"/><rect x="7" y="34" width="34" height="6" rx="2" fill="#E09A00"/><circle cx="24" cy="29" r="3" fill="#FF4F6E"/><circle cx="14" cy="30" r="2" fill="#3DE0FF"/><circle cx="34" cy="30" r="2" fill="#3DE0FF"/>',
    13: '<ellipse cx="24" cy="26" rx="17" ry="7" fill="none" stroke="#FFE14D" stroke-width="6"/><ellipse cx="24" cy="25" rx="17" ry="7" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>'
  };

  /* ---------------- genel ---------------- */
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 1900); }
  function shake(el) { if (!el) return; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = 'shake .4s'; }
  function refreshCoins() { document.querySelectorAll('.cv').forEach(e => { e.textContent = fmt(Save.d.coins); }); }
  function show(name) {
    cur = name;
    SCR.forEach(s => $(s).classList.toggle('on', s === name));
    if (name === 'menu') Snd.intensity(0); else if (name === 'hud') Snd.intensity(1);
  }
  function modal(html, id) {
    const m = $('modal'); modalOn = id; m.innerHTML = html; m.classList.add('on');
  }
  function closeModal() { $('modal').classList.remove('on'); modalOn = null; }
  const coinPill = (plus, act) => '<div class="pill glass" ' + (act ? 'data-act="' + act + '" style="cursor:pointer"' : '') + '>' + ic('coin') + '<span class="cv">' + fmt(Save.d.coins) + '</span>' + (plus ? '<span class="plus">+</span>' : '') + '</div>';

  function adShow(cb) {
    if (adBusy) return; adBusy = true;
    const a = $('ad'); let n = 3; Snd.music(false);
    const draw = () => { a.innerHTML = '<div class="box">' + T('DEMO AD', 'DEMO REKLAM') + '</div><div class="cnt">' + T('Reward in ', 'Ödül: ') + n + ' s</div>'; };
    draw(); a.classList.add('on');
    const iv = setInterval(() => {
      n--; if (n > 0) { draw(); return; }
      clearInterval(iv); a.classList.remove('on'); adBusy = false; Snd.music(true); try { cb && cb(); } catch (e) { }
    }, 1000);
  }

  /* ---------------- açılış / karşılama ---------------- */
  function greeting() {
    const h = new Date().getHours();
    return h < 5 ? T('Late night grind,', 'Gece antrenmanı,') : h < 12 ? T('Good morning,', 'Günaydın,') : h < 18 ? T('Welcome back,', 'Tekrar hoş geldin,') : T('Good evening,', 'İyi akşamlar,');
  }
  function dayStr(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  const DAILY = [50, 75, 100, 150, 200, 300, 600];
  function dailyPending() {
    const d = Save.d.daily, today = Save.todayStr();
    if (d.last === today) return -1;
    const y = dayStr(new Date(Date.now() - 864e5));
    const streak = d.last === y ? d.streak : 0;
    return streak % 7;
  }

  function welcome() {
    Game.toMenu(Save.d.level); renderMenu(); show('menu');
    Snd.music(true);
    setTimeout(() => {
      if (!Save.d.tut) {
        Save.d.tut = 1; Save.addCoins(250); Save.save(); refreshCoins(); Snd.play('win');
        modal('<div class="card glass" style="text-align:center"><h2>' + T('WELCOME!', 'HOŞ GELDİN!') + '</h2><div class="sub">' + T('Every champion starts somewhere. Here is a gift from the Kinetic team.', 'Her şampiyon bir yerden başlar. Kinetic ekibinden sana bir hediye.') + '</div><div style="font:400 64px Anton;color:#FFC83D;display:flex;justify-content:center;align-items:center;gap:10px">' + ic('coin') + '+250</div><div style="height:12px"></div><button class="btn btn-lime" style="width:100%;font-size:22px" data-act="close">' + T('LET\'S GO!', 'BAŞLAYALIM!') + '</button></div>', 'gift');
      } else if (dailyPending() >= 0) openDaily();
    }, 700);
  }

  function openDaily() {
    const p = dailyPending(); if (p < 0) { toast(T('Come back tomorrow for your next gift!', 'Sıradaki hediye için yarın gel!')); return; }
    let h = '<div class="card glass"><div class="x" data-act="close">' + ic('x') + '</div><h2>' + T('DAILY GIFT', 'GÜNLÜK HEDİYE') + '</h2><div class="sub">' + T('Come back every day — rewards keep growing.', 'Her gün gel, ödüller büyüyor.') + '</div><div class="days">';
    DAILY.forEach((v, i) => { h += '<div class="day ' + (i < p ? 'done' : i === p ? 'cur' : '') + (i === 6 ? ' d7' : '') + '">' + T('DAY ', 'GÜN ') + (i + 1) + ic(i === 6 ? 'gift' : 'coin') + '<b>' + v + '</b>' + (i < p ? '<span style="position:absolute;top:2px;right:4px;color:#7DDB00">' + ic('check', 's') + '</span>' : '') + '</div>'; });
    h += '</div><button class="btn btn-lime" style="width:100%;font-size:22px" data-act="claim">' + T('CLAIM ', 'AL ') + DAILY[p] + ' ' + ic('coin') + '</button></div>';
    modal(h, 'daily');
  }

  /* ---------------- ana menü ---------------- */
  function renderMenu() {
    const d = Save.d, p = dailyPending();
    let ups = '';
    UPGRADES.forEach(u => {
      const lv = d.up[u.id], max = lv >= u.max, c = upCost(lv), can = d.coins >= c;
      const icn = u.id === 'power' ? 'dumb' : u.id === 'income' ? 'coin' : 'heart';
      ups += '<div class="up glass ' + (max ? 'max' : can ? '' : 'no') + '" data-act="up" data-id="' + u.id + '">' + ic(icn) + '<b>' + T(u.en, u.tr) + '</b><small>' + T('Lv ', 'Sv ') + lv + (max ? ' MAX' : '') + '</small><div class="cost">' + (max ? 'MAX' : ic('coin') + c) + '</div></div>';
    });
    $('menu').innerHTML =
      '<div class="top">' + coinPill(true, 'shop') + '<div class="chip glass">' + T('LEVEL ', 'BÖLÜM ') + d.level + '</div><button class="btn btn-ghost round" data-act="settings">' + ic('gear') + '</button></div>' +
      '<div class="logo">FLEX RUSH<small>KINETIC STUDIO</small></div>' +
      (greeted ? '' : '<div class="greet glass" id="greet"><small>' + greeting() + '</small><b>' + T('CHAMPION', 'ŞAMPİYON') + '</b><small>' + (d.daily.streak > 1 ? T('🔥 ' + d.daily.streak + ' day streak', '🔥 ' + d.daily.streak + ' gün seri') : T('Level ' + d.level + ' is waiting for you', d.level + '. bölüm seni bekliyor')) + '</small></div>') +
      '<div class="offer glass" data-act="shop"><small>' + T('LIMITED', 'SINIRLI') + '</small><b>-70%</b><small>' + T('STARTER PACK', 'BAŞLANGIÇ PAKETİ') + '</small><span class="tag">' + T('TAP!', 'DOKUN!') + '</span></div>' +
      '<div class="bottom"><div class="ups">' + ups + '</div>' +
      '<div class="playrow"><button class="btn btn-lime playbtn" data-act="play">' + ic('play') + T('PLAY', 'OYNA') + '</button></div>' +
      '<div class="dock"><div class="dk" data-act="ward"><button class="btn btn-aqua">' + ic('shirt') + '</button>' + T('WARDROBE', 'DOLAP') + '</div>' +
      '<div class="dk" data-act="shop"><button class="btn btn-gold">' + ic('bag') + '</button>' + T('SHOP', 'MAĞAZA') + '<span class="badge">!</span></div>' +
      '<div class="dk" data-act="daily"><button class="btn btn-lime">' + ic('gift') + '</button>' + T('DAILY', 'GÜNLÜK') + (p >= 0 ? '<span class="badge">1</span>' : '') + '</div></div></div>';
    if (!greeted && !greetT) { greetT = setTimeout(() => { greeted = true; const g = $('greet'); if (g) { g.style.transition = 'opacity .6s'; g.style.opacity = 0; } }, 4200); }
  }

  /* ---------------- HUD ---------------- */
  function renderHud() {
    $('hud').innerHTML =
      '<div class="hudtop"><div class="lvl">' + T('LEVEL ', 'BÖLÜM ') + G().level + '</div><div class="prog"><i id="pbar"></i><em>🏁</em></div></div>' +
      '<div class="power glass">' + ic('dumb') + '<div><b id="pw">10</b><small id="tier"></small></div></div>' +
      '<div class="hcoin pill glass" id="hc">' + ic('coin') + '<span id="hcv">0</span></div>' +
      '<div class="banner" id="bn"></div>' +
      (Save.d.runs <= 1 ? '<div class="hint" id="hint"><span>👆</span>' + T('SWIPE TO MOVE', 'KAYDIRARAK HAREKET ET') + '</div>' : '');
    shownPower = G().hero.P; lastTier = tierOf(G().hero.P);
  }
  function banner(txt, cls) { const b = $('bn'); if (!b) return; b.textContent = txt; b.className = 'banner go ' + (cls || ''); b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; }
  function floatTxt(txt, col, sz) {
    const g = G(), h = g.hero; let x = innerWidth / 2, y = innerHeight * 0.45;
    try { const p = Scene.screenOf(h.x, 2.3, -h.d); if (isFinite(p.x) && isFinite(p.y)) { x = p.x * innerWidth; y = p.y * innerHeight; } } catch (e) { }
    const e = document.createElement('div'); e.className = 'fl'; e.textContent = txt; e.style.color = col; e.style.left = x + 'px'; e.style.top = y + 'px'; if (sz) e.style.fontSize = sz + 'px';
    $('fx').appendChild(e); setTimeout(() => e.remove(), 1000);
  }

  function frame(dt) {
    const g = G();
    if (cur !== 'hud') return;
    const h = g.hero, pb = $('pbar'); if (!pb) return;
    pb.style.width = (clamp(h.d / g.L, 0, 1) * 100).toFixed(1) + '%';
    shownPower += (h.P - shownPower) * Math.min(1, dt * 10);
    $('pw').textContent = Math.round(shownPower);
    const ti = tierOf(h.P);
    $('tier').textContent = T(TIERS[ti].en, TIERS[ti].tr);
    if (ti > lastTier && g.mode === 'play') { banner(T(TIERS[ti].en, TIERS[ti].tr) + '!', 'good'); Snd.play('flex'); }
    lastTier = ti;
    $('hcv').textContent = g.run.coins;
    const hi = $('hint'); if (hi && h.d > 7) { hi.remove(); }
  }

  /* ---------------- sonuç / başarısız ---------------- */
  function countUp(el, to, ms) {
    const t0 = performance.now();
    (function s(t) { const k = clamp((t - t0) / ms, 0, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(s); })(t0);
  }
  function renderResult(d) {
    doubled = false;
    $('result').innerHTML =
      '<div class="big" style="color:#C6FF3D">' + T('LEVEL COMPLETE', 'BÖLÜM TAMAM') + '</div>' +
      '<div class="mult">×' + d.mult.toFixed(1) + '</div>' +
      (d.bell ? '<div class="ab" style="color:#FFC83D;letter-spacing:2px">' + ic('star') + ' ' + T('PERFECT HIT', 'MÜKEMMEL VURUŞ') + ' ' + ic('star') + '</div>' : '') +
      '<div class="rows glass"><div><span>' + ic('coin') + ' ' + T('Collected', 'Toplanan') + '</span><span id="r1">0</span></div><div><span>' + ic('dumb') + ' ' + T('Strike bonus', 'Vuruş bonusu') + '</span><span id="r2">0</span></div><div class="tot"><span>' + T('TOTAL', 'TOPLAM') + '</span><span id="r3">0</span></div></div>' +
      '<div class="stack"><button class="btn btn-lime" style="font-size:22px" data-act="next">' + T('NEXT LEVEL', 'SONRAKİ BÖLÜM') + '</button>' +
      '<button class="btn btn-gold" id="dbl" data-act="double">' + T('×2 COINS', '×2 PARA') + ' ' + ic('play') + ' ' + T('WATCH AD', 'REKLAM İZLE') + '</button></div>';
    countUp($('r1'), d.coins, 700); countUp($('r2'), d.bonus, 900); countUp($('r3'), d.total, 1300);
    show('result');
  }
  function renderFail(d) {
    const g = G(), h = g.hero, w = g.run.failWall;
    const need = w ? w.req : 0;
    $('fail').innerHTML =
      '<div class="big" style="color:#FF5A6E">' + (w ? T('TOO WEAK!', 'ÇOK ZAYIFSIN!') : T('OUT OF MUSCLE!', 'KAS KALMADI!')) + '</div>' +
      (w ? '<div class="rows glass" style="animation-delay:.2s"><div><span>' + T('Wall needs', 'Duvar için gerekli') + '</span><b class="ac" style="font-size:26px;color:#FFC83D">' + need + '</b></div><div><span>' + T('You had', 'Sende olan') + '</span><b class="ac" style="font-size:26px">' + Math.floor(h.P) + '</b></div></div>' : '') +
      '<div class="rows glass" style="padding:12px 18px"><div style="font-size:12px"><span>' + T('Progress', 'İlerleme') + '</span><span>' + Math.round(d.progress * 100) + '%</span></div><div class="bar2"><i style="width:' + Math.round(d.progress * 100) + '%"></i></div></div>' +
      '<div class="stack">' + (g.run.revived ? '' : '<button class="btn btn-lime" data-act="revive">' + ic('play') + ' ' + T('REVIVE · WATCH AD', 'DEVAM ET · REKLAM') + '</button>') +
      '<button class="btn btn-aqua" data-act="retry">' + T('TRY AGAIN', 'TEKRAR DENE') + '</button><button class="btn btn-ghost" data-act="home">' + ic('home') + ' ' + T('MENU', 'MENÜ') + '</button></div>';
    show('fail');
  }

  /* ---------------- dolap ---------------- */
  function swatch(s) {
    let bg;
    if (s.anim === 'rainbow') bg = 'conic-gradient(#ff5a6e,#ffd84d,#5aff8a,#3de0ff,#b26bff,#ff5a6e)';
    else if (s.anim === 'galaxy') bg = 'radial-gradient(circle at 30% 30%,#fff 0 2px,transparent 3px),radial-gradient(circle at 70% 60%,#fff 0 1.5px,transparent 2.5px),radial-gradient(circle,#7B3FE4,#1A0B4D)';
    else if (s.metal) bg = 'linear-gradient(135deg,#fff,' + rgb(s.c) + ' 45%,' + rgb(s.c.map(v => v * 0.55)) + ')';
    else bg = 'radial-gradient(circle at 35% 30%,' + rgb(s.c.map(v => Math.min(1, v + 0.25))) + ',' + rgb(s.c) + ' 60%,' + rgb(s.c.map(v => v * 0.7)) + ')';
    return '<div class="sw2" style="background:' + bg + '"></div>';
  }
  const catalog = k => k === 'body' ? SKINS : HATS;
  function renderWard() {
    const list = catalog(kind), eq = Save.d.eq[kind];
    let cards = '';
    list.forEach(it => {
      const owned = Save.owns(kind, it.id);
      const visual = kind === 'body' ? swatch(it) : (it.id === 0 ? '<div class="sw2" style="background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font-size:20px">' + ic('x') + '</div>' : '<svg class="hat" viewBox="0 0 48 48">' + HAT[it.id] + '</svg>');
      cards += '<div class="it ' + (sel === it.id ? 'sel' : '') + '" data-act="pick" data-id="' + it.id + '">' + visual + '<span>' + T(it.en, it.tr) + '</span>' +
        (eq === it.id ? '<i class="eq">' + T('ON', 'AKTİF') + '</i>' : '') + (!owned && it.ad ? '<i class="ad">AD</i>' : '') +
        (owned ? '<span class="ok">' + ic('check', 's') + '</span>' : it.ad ? '<span class="pr" style="color:#3DE0FF">' + ic('play') + '</span>' : '<span class="pr">' + ic('coin') + it.price + '</span>') + '</div>';
    });
    $('ward').innerHTML =
      '<div class="top"><button class="btn btn-ghost round" data-act="wback">' + ic('back', 's') + '</button>' + coinPill(true, 'shop') + '</div>' +
      '<div class="tabs"><button class="btn ' + (kind === 'body' ? 'btn-lime' : 'btn-ghost') + '" data-act="tab" data-id="body">' + T('BODY', 'BEDEN') + '</button><button class="btn ' + (kind === 'hat' ? 'btn-lime' : 'btn-ghost') + '" data-act="tab" data-id="hat">' + T('HEAD', 'KAFA') + '</button></div>' +
      '<div class="sheet glass"><div class="grid" id="grid">' + cards + '</div><div class="actrow" id="actrow"></div></div>';
    renderAct();
  }
  function renderAct() {
    const it = catalog(kind)[sel], owned = Save.owns(kind, sel), eq = Save.d.eq[kind] === sel;
    let b;
    if (eq) b = '<button class="btn btn-ghost off">' + ic('check', 's') + ' ' + T('EQUIPPED', 'KUŞANILDI') + '</button>';
    else if (owned) b = '<button class="btn btn-lime" data-act="equip">' + T('EQUIP', 'KUŞAN') + '</button>';
    else if (it.ad) b = '<button class="btn btn-aqua" data-act="adunlock">' + ic('play') + ' ' + T('WATCH AD TO UNLOCK', 'REKLAMLA AÇ') + '</button>';
    else b = '<button class="btn btn-gold" data-act="buy">' + T('BUY ', 'AL ') + ic('coin') + ' ' + it.price + '</button>';
    $('actrow').innerHTML = b + '<button class="btn btn-ghost" data-act="lucky" title="Surprise">' + ic('dice') + ' <span style="font-size:13px">400</span></button>';
  }
  function preview() { Game.G.eq[kind] = sel; }
  function openWard() { kind = 'body'; sel = Save.d.eq.body; Game.setView('body'); preview(); renderWard(); show('ward'); }
  function closeWard() { Game.applyEquip(); Game.setView('home'); renderMenu(); show('menu'); }
  function equip(k, id) { Save.d.eq[k] = id; Save.save(); Game.applyEquip(); Game.G.eq[k] = id; }

  /* ---------------- mağaza ---------------- */
  function openShop() {
    const soon = 'soon';
    modal('<div class="card glass"><div class="x" data-act="close">' + ic('x') + '</div><h2>' + T('SHOP', 'MAĞAZA') + '</h2><div class="sub">' + T('Special offers just for you', 'Sadece sana özel fırsatlar') + '</div>' +
      '<div class="pack" data-act="' + soon + '"><span class="rib">' + T('BEST VALUE', 'EN İYİ') + '</span><h3>' + T('CHAMPION PACK', 'ŞAMPİYON PAKETİ') + '</h3><ul><li>' + ic('coin') + ' 5,000 ' + T('coins', 'para') + '</li><li>' + ic('shirt') + ' ' + T('Gold body + Crown', 'Altın beden + Taç') + '</li><li>' + ic('star') + ' ' + T('No ads forever', 'Sonsuza dek reklamsız') + '</li></ul><button class="btn btn-lime" style="width:100%;font-size:20px"><s style="opacity:.6;font-size:14px">$9.99</s> $2.99</button></div>' +
      '<div class="sec">' + T('COIN PACKS', 'PARA PAKETLERİ') + '</div><div class="row2">' +
      '<div class="sp glass" data-act="' + soon + '">' + ic('coin', 'big') + '<b>1,000</b><small>' + T('Handful', 'Avuç dolusu') + '</small><button class="btn btn-gold">$0.99</button></div>' +
      '<div class="sp glass" data-act="' + soon + '"><span class="tag">+10%</span>' + ic('coin', 'big') + '<b>5,500</b><small>' + T('Sack', 'Kese') + '</small><button class="btn btn-gold">$3.99</button></div>' +
      '<div class="sp glass" data-act="' + soon + '"><span class="tag" style="background:#7DDB00;color:#0B1B3F">' + T('BEST', 'EN İYİ') + '</span>' + ic('coin', 'big') + '<b>12,000</b><small>' + T('Chest', 'Sandık') + '</small><button class="btn btn-gold">$7.99</button></div>' +
      '<div class="sp glass" data-act="' + soon + '">' + ic('star', 'big') + '<b style="color:#3DE0FF">' + T('NO ADS', 'REKLAMSIZ') + '</b><small>' + T('Play uninterrupted', 'Kesintisiz oyna') + '</small><button class="btn btn-aqua">$2.99</button></div></div>' +
      '<div class="sec">' + T('FREE', 'ÜCRETSİZ') + '</div><button class="btn btn-lime" style="width:100%" data-act="freegift">' + ic('gift') + ' +100 ' + ic('coin') + ' · ' + T('WATCH AD', 'REKLAM İZLE') + '</button></div>', 'shop');
  }

  /* ---------------- ayarlar ---------------- */
  function openSettings() {
    const s = Save.d.set, sw = (k) => '<div class="sw ' + (s[k] ? 'on' : '') + '" data-act="tog" data-id="' + k + '"></div>';
    const seg = (k, labels) => '<div class="seg">' + labels.map((l, i) => '<i class="' + (s[k] === i ? 'on' : '') + '" data-act="seg" data-k="' + k + '" data-id="' + i + '">' + l + '</i>').join('') + '</div>';
    modal('<div class="card glass"><div class="x" data-act="close">' + ic('x') + '</div><h2>' + T('SETTINGS', 'AYARLAR') + '</h2><div class="sub">' + T('Make it yours', 'Kendine göre ayarla') + '</div>' +
      '<div class="set"><span>' + T('Music', 'Müzik') + '</span>' + sw('music') + '</div><div class="set"><span>' + T('Sound effects', 'Ses efektleri') + '</span>' + sw('sfx') + '</div><div class="set"><span>' + T('Vibration', 'Titreşim') + '</span>' + sw('vib') + '</div>' +
      '<div class="set"><span>' + T('Graphics', 'Grafik') + '</span>' + seg('quality', [T('LOW', 'DÜŞÜK'), T('MED', 'ORTA'), T('HIGH', 'YÜKSEK')]) + '</div>' +
      '<div class="set"><span>' + T('Swipe sensitivity', 'Kaydırma hassasiyeti') + '</span>' + seg('sens', ['−', '●', '+']) + '</div>' +
      '<div class="set"><span>' + T('Language', 'Dil') + '</span><div class="seg"><i class="' + (I18N.lang === 'en' ? 'on' : '') + '" data-act="lang" data-id="en">EN</i><i class="' + (I18N.lang === 'tr' ? 'on' : '') + '" data-act="lang" data-id="tr">TR</i></div></div>' +
      '<div style="height:12px"></div><button class="btn btn-ghost" style="width:100%" data-act="reset" id="rst">' + T('RESET PROGRESS', 'İLERLEMEYİ SIFIRLA') + '</button>' +
      '<div data-act="ver" style="text-align:center;font-size:11px;color:#8FA2E8;margin-top:12px">FLEX RUSH v1.0 · Kinetic Studio</div></div>', 'settings');
  }

  /* ---------------- tıklama dağıtıcı ---------------- */
  function act(a, el) {
    const id = el.dataset.id;
    Snd.unlock(); if (!Snd.isMusic() && Save.d.set.music && cur !== 'splash') Snd.music(true);
    if (a !== 'play') Snd.play('click');
    switch (a) {
      case 'play': Game.start(); renderHud(); show('hud'); Snd.play('whoosh'); break;
      case 'close': closeModal(); renderMenu(); break;
      case 'settings': openSettings(); break;
      case 'shop': openShop(); break;
      case 'daily': openDaily(); break;
      case 'soon': toast(T('The store opens soon!', 'Mağaza yakında açılıyor!')); break;
      case 'freegift': adShow(() => { Save.addCoins(100); Save.save(); refreshCoins(); Snd.play('coin', 5); toast('+100'); }); break;
      case 'claim': {
        const p = dailyPending(); if (p < 0) { closeModal(); break; }
        const y = dayStr(new Date(Date.now() - 864e5)); const st = Save.d.daily.last === y ? Save.d.daily.streak : 0;
        Save.d.daily.streak = st + 1; Save.d.daily.last = Save.todayStr(); Save.addCoins(DAILY[p]); Save.save();
        Snd.play('win'); closeModal(); renderMenu(); toast('+' + DAILY[p]); break;
      }
      case 'up': {
        const u = UPGRADES.find(x => x.id === id), lv = Save.d.up[id], c = upCost(lv);
        if (lv >= u.max) { toast(T('Maxed out!', 'Maksimum seviye!')); break; }
        if (Save.d.coins < c) { Snd.play('back'); toast(T('Not enough coins', 'Yeterli para yok')); shake(el); break; }
        Save.d.coins -= c; Save.d.up[id] = lv + 1; Save.save(); Snd.play('buy'); Haptic.buzz(20);
        Game.toMenu(Save.d.level); renderMenu(); break;
      }
      case 'ward': openWard(); break;
      case 'wback': closeWard(); break;
      case 'tab': kind = id; sel = Save.d.eq[kind]; Game.setView(kind); Game.applyEquip(); preview(); renderWard(); break;
      case 'pick': sel = +id; preview(); renderWard(); { const g = $('grid'); const n = g && g.children[sel]; if (n) n.scrollIntoView({ inline: 'center', block: 'nearest' }); } break;
      case 'equip': equip(kind, sel); Snd.play('pop'); renderWard(); break;
      case 'buy': {
        const it = catalog(kind)[sel];
        if (Save.d.coins < it.price) { Snd.play('back'); toast(T('Not enough coins', 'Yeterli para yok')); shake(el); break; }
        Save.d.coins -= it.price; Save.give(kind, sel); equip(kind, sel); Snd.play('buy'); Haptic.buzz(25); renderWard(); break;
      }
      case 'adunlock': adShow(() => { Save.give(kind, sel); equip(kind, sel); Snd.play('buy'); renderWard(); }); break;
      case 'lucky': {
        const pool = catalog(kind).filter(i => !Save.owns(kind, i.id));
        if (!pool.length) { toast(T('You own everything here!', 'Hepsine sahipsin!')); break; }
        if (Save.d.coins < 400) { Snd.play('back'); toast(T('Not enough coins', 'Yeterli para yok')); shake(el); break; }
        const it = pool[Math.floor(Math.random() * pool.length)];
        Save.d.coins -= 400; Save.give(kind, it.id); sel = it.id; equip(kind, it.id); Snd.play('win'); Haptic.buzz(40); toast(T('You got: ', 'Kazandın: ') + T(it.en, it.tr)); renderWard(); break;
      }
      case 'tog': Save.d.set[id] = Save.d.set[id] ? 0 : 1; Save.save(); if (id === 'music') Snd.music(!!Save.d.set.music); openSettings(); break;
      case 'seg': Save.d.set[el.dataset.k] = +id; Save.save(); if (el.dataset.k === 'quality' && window.applyQuality) window.applyQuality(); openSettings(); break;
      case 'lang': Save.d.set.lang = id; I18N.lang = id; Save.save(); openSettings(); renderMenu(); break;
      case 'reset': if (el.dataset.arm) { Save.reset(); I18N.lang = Save.d.set.lang || detectLang(); closeModal(); greeted = false; Game.toMenu(1); Game.applyEquip(); renderMenu(); toast(T('Progress reset', 'İlerleme sıfırlandı')); } else { el.dataset.arm = 1; el.textContent = T('TAP AGAIN TO CONFIRM', 'ONAYLAMAK İÇİN TEKRAR DOKUN'); el.style.color = '#FF5A6E'; } break;
      case 'ver': if (++verTaps >= 7) { verTaps = 0; Save.addCoins(100000); Save.save(); refreshCoins(); toast('DEV +100000'); } break;
      case 'next': Game.nextLevel(); renderMenu(); show('menu'); break;
      case 'double': { if (doubled) break; adShow(() => { doubled = true; const tot = G().run.total; Save.addCoins(tot); Save.save(); Snd.play('coin', 7); const r = $('r3'); if (r) countUp(r, tot * 2, 600); const b = $('dbl'); if (b) { b.classList.add('off'); b.innerHTML = ic('check', 's') + ' ×2'; } }); break; }
      case 'revive': adShow(() => { Game.revive(); renderHud(); show('hud'); }); break;
      case 'retry': Game.retry(); renderHud(); show('hud'); break;
      case 'home': Game.nextLevel(); renderMenu(); show('menu'); break;
    }
    refreshCoins();
  }

  function back() {
    if ($('ad').classList.contains('on')) return true;
    if (modalOn) { closeModal(); if (cur === 'menu') renderMenu(); return true; }
    if (cur === 'ward') { closeWard(); return true; }
    if (cur === 'hud') { Game.toMenu(Save.d.level); renderMenu(); show('menu'); return true; }
    if (cur === 'result' || cur === 'fail') { Game.nextLevel(); renderMenu(); show('menu'); return true; }
    return false;
  }

  function onEvent(ev, d) {
    switch (ev) {
      case 'gate': floatTxt((d.delta >= 0 ? '+' : '') + d.delta, d.good ? '#C6FF3D' : '#FF5A6E', 40); break;
      case 'pow': floatTxt('+' + d.v, '#C6FF3D'); break;
      case 'junk': floatTxt(String(d.v), '#FF5A6E'); break;
      case 'smash': banner(T('SMASH!', 'KIR!'), 'good'); break;
      case 'finale': banner(T('FINAL!', 'FİNAL!'), 'good'); break;
      case 'rise_done': banner(d.bell ? T('PERFECT!', 'MÜKEMMEL!') : '×' + d.mult.toFixed(1), 'good'); break;
      case 'win': setTimeout(() => renderResult(d), 150); break;
      case 'fail': setTimeout(() => { if (G().mode === 'fail') renderFail(d); }, 650); break;
      case 'coin': { const h = $('hc'); if (h) { h.classList.remove('bump'); void h.offsetWidth; h.classList.add('bump'); } break; }
    }
  }

  function init() {
    document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (el) { e.stopPropagation(); act(el.dataset.act, el); } });
    Game.G.on = onEvent;
  }
  function relang() { if (cur === 'menu') renderMenu(); }

  return { init, welcome, show, frame, toast, back, relang, tip: () => { const tips = [T('Pick the gate that adds muscle!', 'Kas katan kapıyı seç!'), T('Burgers make you weaker. Dodge them!', 'Hamburger seni zayıflatır. Kaç!'), T('Smash walls with enough power', 'Yeterli güçle duvarları kır'), T('Hit the bell for a ×5 bonus!', 'Zili vur, ×5 bonus kazan!'), T('Try new hats in the wardrobe', 'Dolaptan yeni şapkalar dene')]; return tips[tipN++ % tips.length]; }, get cur() { return cur; } };
})();
