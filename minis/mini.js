/* Mini-game framework: full-screen canvas, pointer + keyboard input, start / pause / game-over screens,
   best scores, sounds and cached emoji sprites. Each game calls Mini.game({...}) with its own logic. */
(() => {
'use strict';
const M = window.Mini = {};
const TAU = Math.PI * 2;
M.TAU = TAU;
M.rand = (a, b) => a + Math.random() * (b - a);
M.randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
M.pick = (a) => a[Math.floor(Math.random() * a.length)];
M.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
M.lerp = (a, b, t) => a + (b - a) * t;
M.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

/* ------------------------------------------------------------- storage */
M.store = {
  get(k, d) { try { const v = localStorage.getItem('mini-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('mini-' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};

/* --------------------------------------------------------------- audio */
let AC = null;
M.muted = M.store.get('muted', false);
M.sfx = (kind) => {
  if (M.muted) return;
  const S = {
    tap: [[700, 0.04, 'triangle']], jump: [[420, 0.08, 'square'], [640, 0.08, 'square']], coin: [[988, 0.06, 'square'], [1319, 0.12, 'square']],
    hit: [[180, 0.12, 'sawtooth']], boom: [[110, 0.3, 'sawtooth']], win: [[523, 0.1, 'triangle'], [659, 0.1, 'triangle'], [784, 0.2, 'triangle']],
    lose: [[392, 0.15, 'triangle'], [262, 0.3, 'triangle']], pop: [[880, 0.05, 'sine']], shoot: [[900, 0.05, 'square']], swoosh: [[300, 0.12, 'sine']],
  }[kind];
  if (!S) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    let t = AC.currentTime;
    for (const [f, d, type] of S) {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (kind === 'boom' || kind === 'hit' || kind === 'swoosh') o.frequency.exponentialRampToValueAtTime(f * 0.4, t + d);
      g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
      t += d * 0.85;
    }
  } catch (e) { /* no audio */ }
};

/* -------------------------------------------------------------- emoji */
const FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const cache = new Map();
M.emoji = (ctx, e, x, y, size, rot = 0, flip = false) => {
  size = Math.max(6, Math.round(size));
  const k = e + '|' + size;
  let c = cache.get(k);
  if (!c) {
    const pad = Math.ceil(size * 0.3), d = Math.min(2, window.devicePixelRatio || 1);
    c = document.createElement('canvas'); c.L = size + pad * 2; c.width = c.height = Math.ceil(c.L * d);
    const x2 = c.getContext('2d'); x2.scale(d, d); x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.font = size + 'px ' + FONT;
    x2.fillText(e, c.L / 2, c.L / 2 + size * 0.07); cache.set(k, c);
  }
  if (!rot && !flip) { ctx.drawImage(c, x - c.L / 2, y - c.L / 2, c.L, c.L); return; }
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (flip) ctx.scale(-1, 1); ctx.drawImage(c, -c.L / 2, -c.L / 2, c.L, c.L); ctx.restore();
};
M.text = (ctx, t, x, y, size, color = '#fff', align = 'center', stroke = 'rgba(0,0,0,.6)') => {
  ctx.font = '800 ' + size + 'px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = Math.max(2, size / 7); ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(t, x, y); }
  ctx.fillStyle = color; ctx.fillText(t, x, y);
};
M.rrect = (ctx, x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); };

/* ----------------------------------------------------------- particles */
M.particles = () => {
  const list = [];
  return {
    list,
    burst(x, y, color, n = 10, spd = 160, size = 4, grav = 300) {
      for (let i = 0; i < n && list.length < 400; i++) {
        const a = Math.random() * TAU, s = M.rand(0.3, 1) * spd;
        list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - spd * 0.3, life: M.rand(0.4, 0.8), color, size: M.rand(size * 0.5, size * 1.3), grav });
      }
    },
    update(dt) { for (let i = list.length - 1; i >= 0; i--) { const p = list[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.grav * dt; if (p.life <= 0) list.splice(i, 1); } },
    draw(ctx) { for (const p of list) { ctx.globalAlpha = Math.min(1, p.life * 2.5); ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); } ctx.globalAlpha = 1; },
    clear() { list.length = 0; },
  };
};

/* ------------------------------------------------------------- the game shell */
const css = `
  *{box-sizing:border-box} html,body{margin:0;height:100%;overflow:hidden;background:#111;color:#fff;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  body{overscroll-behavior:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
  #mcv{position:fixed;inset:0;display:block;touch-action:none}
  #msafe{position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}
  .mtop{position:fixed;top:calc(env(safe-area-inset-top) + 8px);right:10px;display:flex;gap:6px;z-index:5}
  .mtop button{width:40px;height:36px;border:none;border-radius:10px;background:rgba(0,0,0,.45);color:#fff;font-size:15px;cursor:pointer}
  .mov{position:fixed;inset:0;z-index:10;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(6,6,14,.7)}
  .mov.show{display:flex}
  .mpanel{width:100%;max-width:400px;max-height:100%;overflow-y:auto;background:#1c1d2b;border:2px solid #3a3d58;border-radius:20px;padding:22px;text-align:center;box-shadow:0 14px 40px rgba(0,0,0,.5)}
  .mpanel .big{font-size:68px;line-height:1}
  .mpanel h1{margin:8px 0 4px;font-size:27px} .mpanel h2{margin:0 0 6px;font-size:28px;color:#ffd54f}
  .mpanel p{margin:6px 0;color:#c8cad8;font-size:14px;line-height:1.45}
  .mpanel .how{background:#262839;border-radius:12px;padding:10px;margin:12px 0;font-size:14px;color:#e8e9f2;text-align:left}
  .mpanel .score{font-size:44px;font-weight:900;color:#ffd54f;margin:4px 0}
  .mbtn{display:block;width:100%;margin-top:10px;padding:14px;border:none;border-radius:13px;font:800 17px system-ui,sans-serif;cursor:pointer;background:#ffd54f;color:#2a1f00;text-decoration:none;text-align:center;touch-action:manipulation}
  .mbtn.alt{background:#34364c;color:#fff}
  .mbest{color:#ffd54f;font-weight:700;min-height:1em;margin-top:6px}`;

M.game = (G) => {
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
  document.title = G.title + ' · Mini Games';
  document.body.insertAdjacentHTML('beforeend',
    '<canvas id="mcv"></canvas><div id="msafe"></div><div class="mtop"><button id="mpause" aria-label="Pause">❚❚</button></div>' +
    '<div class="mov" id="mstart"><div class="mpanel"><div class="big">' + G.icon + '</div><h1>' + G.title + '</h1><p>' + G.tagline + '</p><div class="how">' + G.how + '</div>' +
    '<div class="mbest" id="mbest0"></div><button class="mbtn" id="mplay">▶ Play</button><a class="mbtn alt" href="../index.html">← All games</a></div></div>' +
    '<div class="mov" id="mpauseov"><div class="mpanel"><h2>PAUSED</h2><button class="mbtn" id="mresume">▶ Resume</button><button class="mbtn alt" id="mrestart">↻ Restart</button>' +
    '<button class="mbtn alt" id="mmute"></button><a class="mbtn alt" href="../index.html">← All games</a></div></div>' +
    '<div class="mov" id="mover"><div class="mpanel"><h2 id="movt">GAME OVER</h2><p id="movsub"></p><div class="score" id="movscore"></div><div class="mbest" id="mbest1"></div>' +
    '<button class="mbtn" id="mretry">↻ Play again</button><a class="mbtn alt" href="../index.html">← All games</a></div></div>');
  const $ = (id) => document.getElementById(id);
  const cv = $('mcv'), ctx = cv.getContext('2d');
  const S = { W: 0, H: 0, top: 0, bot: 0, state: 'start', time: 0, ctx, cv };
  M.S = S;
  function resize() {
    const d = Math.min(2, window.devicePixelRatio || 1);
    S.W = window.innerWidth; S.H = window.innerHeight;
    cv.width = Math.round(S.W * d); cv.height = Math.round(S.H * d); cv.style.width = S.W + 'px'; cv.style.height = S.H + 'px';
    ctx.setTransform(d, 0, 0, d, 0, 0);
    const cs = getComputedStyle($('msafe'));
    S.top = parseFloat(cs.paddingTop) || 0; S.bot = S.H - (parseFloat(cs.paddingBottom) || 0);
    if (G.resize) G.resize(S);
  }
  window.addEventListener('resize', resize);
  resize();
  const bestKey = 'best-' + G.id;
  const fmt = G.fmtScore || ((v) => String(Math.floor(v)));
  const bestText = () => { const b = M.store.get(bestKey, null); return b == null ? '' : 'Best: ' + fmt(b); };
  const show = (id, on) => $(id).classList.toggle('show', on);

  S.start = () => {
    ['mstart', 'mover', 'mpauseov'].forEach((id) => show(id, false));
    S.state = 'play'; S.time = 0;
    G.init(S);
    M.sfx('tap');
  };
  /* Ends the run. `score` decides the best score (higher is better unless G.lowerIsBetter). */
  S.over = (score, title, sub) => {
    if (S.state !== 'play') return;
    S.state = 'over';
    const prev = M.store.get(bestKey, null);
    const better = prev == null || (G.lowerIsBetter ? score < prev : score > prev);
    if (better && (score > 0 || G.lowerIsBetter)) M.store.set(bestKey, score);
    setTimeout(() => {
      $('movt').textContent = title || 'GAME OVER';
      $('movsub').textContent = sub || '';
      $('movscore').textContent = fmt(score);
      $('mbest1').textContent = better && (score > 0 || G.lowerIsBetter) ? '★ New best!' : bestText();
      show('mover', true);
    }, 650);
  };
  const pause = () => { if (S.state === 'play') { S.state = 'pause'; show('mpauseov', true); } };
  const resume = () => { if (S.state === 'pause') { S.state = 'play'; show('mpauseov', false); last = 0; } };
  $('mplay').onclick = S.start; $('mretry').onclick = S.start; $('mrestart').onclick = S.start;
  $('mpause').onclick = pause; $('mresume').onclick = resume;
  const ml = () => { $('mmute').textContent = M.muted ? '🔇 Sound off' : '🔊 Sound on'; };
  $('mmute').onclick = () => { M.muted = !M.muted; M.store.set('muted', M.muted); ml(); }; ml();
  window.addEventListener('blur', pause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  // input: pointer (first finger) + keyboard
  const P = { down: false, x: 0, y: 0, sx: 0, sy: 0, id: null, t0: 0 };
  S.pointer = P;
  cv.addEventListener('pointerdown', (e) => {
    if (P.down) return;
    Object.assign(P, { down: true, id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t0: performance.now() });
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (AC && AC.state === 'suspended') AC.resume();
    if (S.state === 'play' && G.down) G.down(P.x, P.y, S);
  });
  cv.addEventListener('pointermove', (e) => { if (!P.down || e.pointerId !== P.id) return; P.x = e.clientX; P.y = e.clientY; if (S.state === 'play' && G.move) G.move(P.x, P.y, S); });
  const up = (e) => {
    if (!P.down || e.pointerId !== P.id) return;
    P.down = false;
    if (S.state !== 'play') return;
    const dx = P.x - P.sx, dy = P.y - P.sy, dt = performance.now() - P.t0;
    if (G.up) G.up(P.x, P.y, S);
    if (G.swipe && Math.hypot(dx, dy) > 30 && dt < 600) G.swipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'), S);
    else if (G.tap && Math.hypot(dx, dy) < 12) G.tap(P.x, P.y, S);
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  const keys = new Set(); S.keys = keys;
  window.addEventListener('keydown', (e) => {
    if (e.repeat && !G.keyRepeat) { if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); return; }
    keys.add(e.code);
    if (e.code === 'Escape' || e.code === 'KeyP') { if (S.state === 'play') pause(); else if (S.state === 'pause') resume(); return; }
    if ((e.code === 'Space' || e.code === 'Enter') && (S.state === 'start' || $('mover').classList.contains('show'))) { e.preventDefault(); S.start(); return; }
    if (S.state === 'play' && G.key) G.key(e.code, S);
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys.delete(e.code); if (S.state === 'play' && G.keyUp) G.keyUp(e.code, S); });

  let last = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    if (S.state === 'play' && dt > 0) { S.time += dt; G.update(dt, S); }
    else if (S.state === 'over' && dt > 0 && G.idle) G.idle(dt, S);
    ctx.save(); G.draw(ctx, S); ctx.restore();
  }
  $('mbest0').textContent = bestText();
  show('mstart', true);
  G.init(S); S.state = 'start';
  requestAnimationFrame(frame);
  M._test = { S, G, step: (dt) => { if (S.state === 'play') { S.time += dt; G.update(dt, S); } } };
};
})();
