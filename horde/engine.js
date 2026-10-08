/* Horde Arcade engine: shared core for the 20 mobile horde-survival games.
   A game is a plain definition object passed to Horde.register(); the engine
   handles the canvas, touch/keyboard movement, enemies, XP, level-up cards,
   HUD, pause and game over. See games-*.js for examples. */
(() => {
'use strict';

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (a) => a[Math.random() * a.length | 0];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => ((b - a + Math.PI * 3) % TAU) - Math.PI;

const Horde = window.Horde = { games: {}, order: [], TAU, U: { rand, randInt, pick, clamp, lerp, angDiff, TAU } };
Horde.register = (def) => { Horde.games[def.id] = def; Horde.order.push(def.id); };

/* ---------------------------------------------------------------- storage */
const store = {
  get(k, d) { try { const v = localStorage.getItem('horde-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('horde-' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};
Horde.store = store;
Horde.fmtTime = (s) => { s = Math.floor(s); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

/* ---------------------------------------------------------- emoji sprites */
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
const spriteCache = new Map();
function sprite(emoji, size) {
  size = Math.max(6, Math.round(size));
  const k = emoji + '|' + size;
  let c = spriteCache.get(k);
  if (!c) {
    const pad = Math.ceil(size * 0.3), dpr = Math.min(2, window.devicePixelRatio || 1);
    c = document.createElement('canvas');
    c.logical = size + pad * 2;
    c.width = c.height = Math.ceil(c.logical * dpr);
    const x = c.getContext('2d');
    x.scale(dpr, dpr);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = size + 'px ' + EMOJI_FONT;
    x.fillText(emoji, c.logical / 2, c.logical / 2 + size * 0.07);
    spriteCache.set(k, c);
  }
  return c;
}
function drawEmoji(ctx, emoji, x, y, size, flip, rot) {
  const s = sprite(emoji, size), L = s.logical;
  if (!flip && !rot) { ctx.drawImage(s, x - L / 2, y - L / 2, L, L); return; }
  ctx.save(); ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(s, -L / 2, -L / 2, L, L);
  ctx.restore();
}
Horde.drawEmoji = drawEmoji;

/* ------------------------------------------------------------------ audio */
let AC = null, muted = store.get('muted', false);
const lastSfx = {};
const SFX = {
  hit: [320, 0.05, 'square', 0.025, 50], kill: [520, 0.07, 'triangle', 0.04, 40], pick: [880, 0.05, 'sine', 0.03, 35],
  hurt: [140, 0.2, 'sawtooth', 0.07, 120], boom: [90, 0.25, 'sawtooth', 0.06, 90], shoot: [660, 0.04, 'square', 0.015, 70],
  level: [740, 0.35, 'triangle', 0.07, 0], shield: [1200, 0.15, 'sine', 0.05, 80], power: [440, 0.3, 'square', 0.04, 0],
};
function sfx(name) {
  if (muted) return;
  const d = SFX[name]; if (!d) return;
  const now = performance.now();
  if (now - (lastSfx[name] || 0) < d[4]) return;
  lastSfx[name] = now;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
    o.type = d[2]; o.frequency.setValueAtTime(d[0], t);
    if (name === 'level' || name === 'power') o.frequency.exponentialRampToValueAtTime(d[0] * 2, t + d[1]);
    if (name === 'hurt' || name === 'boom') o.frequency.exponentialRampToValueAtTime(d[0] * 0.4, t + d[1]);
    g.gain.setValueAtTime(d[3], t); g.gain.exponentialRampToValueAtTime(0.0001, t + d[1]);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d[1] + 0.02);
  } catch (e) { /* audio unavailable */ }
}

/* ------------------------------------------------------------ module state */
let cv, ctx, W = 0, H = 0, DPR = 1, safeT = 0, safeB = 0, safeEl;
let def = null, G = null, last = 0;
const keys = new Set();
const joy = { on: false, id: null, sx: 0, sy: 0, x: 0, y: 0, lx: 0 };
const $ = (id) => document.getElementById(id);

/* ---------------------------------------------------------- spatial grid */
const CELL = 64, grid = new Map();
const cellKey = (cx, cy) => (cx + 512) * 2048 + (cy + 512);
function buildGrid() {
  grid.clear();
  for (const e of G.enemies) {
    if (e.dead) continue;
    const k = cellKey(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
    let a = grid.get(k); if (!a) grid.set(k, a = []);
    a.push(e);
  }
}
/* Calls fn(e, dist) for every live enemy whose circle overlaps (x, y, r). */
function query(x, y, r, fn) {
  const R = r + 40;
  const x0 = Math.floor((x - R) / CELL), x1 = Math.floor((x + R) / CELL);
  const y0 = Math.floor((y - R) / CELL), y1 = Math.floor((y + R) / CELL);
  for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
    const a = grid.get(cellKey(cx, cy)); if (!a) continue;
    for (let i = 0; i < a.length; i++) {
      const e = a[i]; if (e.dead) continue;
      const dx = e.x - x, dy = e.y - y, rr = r + e.r;
      if (dx * dx + dy * dy < rr * rr) fn(e, Math.sqrt(dx * dx + dy * dy));
    }
  }
}

/* ------------------------------------------------------------- game API */
const API = {
  query,
  sfx,
  emoji: drawEmoji,
  every(key, interval, fn) {
    const t = (G.tm[key] || 0) + G.dt;
    if (t >= interval) { G.tm[key] = Math.min(t - interval, interval); fn(); } else G.tm[key] = t;
  },
  nearest(x, y, maxR = 1e9, filter) {
    let best = null, bd = maxR * maxR;
    for (const e of G.enemies) {
      if (e.dead || (filter && !filter(e))) continue;
      const dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy;
      if (d < bd && G.onScreen(e, 10)) { bd = d; best = e; }
    }
    return best;
  },
  nearestN(x, y, n, maxR = 1e9) {
    const out = [], m2 = maxR * maxR;
    for (const e of G.enemies) {
      if (e.dead || !G.onScreen(e, 10)) continue;
      const dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy;
      if (d < m2) out.push([d, e]);
    }
    out.sort((a, b) => a[0] - b[0]);
    return out.slice(0, n).map((a) => a[1]);
  },
  randomEnemy(x, y, maxR = 1e9) {
    const c = G.enemies.filter((e) => !e.dead && G.onScreen(e, 0) && Math.hypot(e.x - x, e.y - y) < maxR);
    return c.length ? pick(c) : null;
  },
  onScreen(e, m = 0) { return e.x > -m && e.x < G.w + m && e.y > G.top - m && e.y < G.h + m; },
  damage(e, amt, kb = 0, ang = 0, quiet = false) {
    if (e.dead) return;
    amt *= G.dmgMul;
    e.hp -= amt;
    if (!quiet) { e.flash = 0.08; sfx('hit'); }
    if (kb) {
      const k = kb * (e.elite ? 0.25 : 1) * (e.type.kbRes == null ? 1 : e.type.kbRes);
      e.kx += Math.cos(ang) * k; e.ky += Math.sin(ang) * k;
    }
    if (e.hp <= 0) G.kill(e);
  },
  kill(e, noDrop) {
    if (e.dead) return;
    e.dead = true; e.hp = 0;
    G.kills++;
    sfx('kill');
    G.burst(e.x, e.y, e.color || e.type.color || '#fff', e.elite ? 26 : 7, e.elite ? 220 : 130);
    if (!noDrop && e.xp > 0) {
      if (e.elite) {
        for (let i = 0; i < 6; i++) G.gem(e.x + rand(-20, 20), e.y + rand(-20, 20), e.xp / 6);
        G.gems.push({ x: e.x, y: e.y, v: 0, heal: 30, vx: 0, vy: 0, mag: false });
      } else G.gem(e.x, e.y, e.xp);
    }
    if (def.onKill) def.onKill(G, e);
  },
  gem(x, y, v) {
    if (G.gems.length > 320) { const g = G.gems[Math.random() * G.gems.length | 0]; if (!g.heal) { g.v += v; return; } }
    G.gems.push({ x, y, v, vx: rand(-50, 50), vy: rand(-50, 50), mag: !!def.autoMagnet });
  },
  addXp(v) {
    G.xp += v * G.xpMul;
    while (G.xp >= G.xpNext) { G.xp -= G.xpNext; G.level++; G.pending++; G.xpNext = Math.floor(G.xpNext * 1.13 + 4); }
  },
  hurt(dmg, force) {
    const p = G.p;
    if (G.state !== 'play') return;
    if (!force && p.invuln > 0) return;
    if (p.shield > 0) {
      p.shield--; p.invuln = 0.7;
      G.ring(p.x, p.y, p.r + 18, '#9ef', 0.4); sfx('shield');
      return;
    }
    p.hp -= dmg;
    if (!force) p.invuln = 0.8;
    G.shake = Math.max(G.shake, 7); G.hurtFlash = 0.3; sfx('hurt');
    if (def.onHurt) def.onHurt(G, dmg);
    if (p.hp <= 0) { p.hp = 0; gameOver(); }
  },
  heal(n) { const p = G.p; p.hp = Math.min(p.maxHp, p.hp + n); G.float(p.x, p.y - p.r - 10, '+' + Math.round(n), '#6f6'); },
  shoot(o) {
    const b = Object.assign({ x: 0, y: 0, vx: 0, vy: 0, r: 4, dmg: 10, pierce: 0, life: 2, kb: 60, color: '#fff', ricochet: 0, homing: 0, bounce: false, spin: 0, rot: 0, rehit: 0 }, o);
    b.hit = new Map(); b.max = b.life;
    if (!b.rot && !b.spin) b.rot = Math.atan2(b.vy, b.vx);
    G.bullets.push(b);
    return b;
  },
  /* Lobbed projectile: arcs from (x,y) to (tx,ty) over `time` seconds then calls onLand. */
  lob(o) {
    const b = G.shoot(Object.assign({ noHit: true, life: o.time || 0.6, h: 60 }, o));
    b.sx = o.x; b.sy = o.y; b.lob = true;
    return b;
  },
  zone(o) {
    const z = Object.assign({ x: 0, y: 0, r: 30, life: 2, dps: 0, slow: 0, color: 'rgba(255,255,255,0.25)' }, o);
    z.max = z.life; G.zones.push(z); return z;
  },
  explode(x, y, r, dmg, color = '#ffb347', kb = 260) {
    query(x, y, r, (e) => G.damage(e, dmg, kb, Math.atan2(e.y - y, e.x - x), true));
    G.ring(x, y, r, color, 0.35, r * 0.2);
    G.fx.push({ kind: 'disc', x, y, r, color, life: 0.18, max: 0.18 });
    G.burst(x, y, color, 10, r * 3);
    G.shake = Math.max(G.shake, Math.min(8, r / 15)); sfx('boom');
  },
  ring(x, y, r, color = '#fff', life = 0.35, r0 = 0, width = 3) { G.fx.push({ kind: 'ring', x, y, r, r0, color, life, max: life, width }); },
  line(pts, color = '#fff', width = 3, life = 0.12) { G.fx.push({ kind: 'line', pts, color, width, life, max: life }); },
  bolt(x1, y1, x2, y2, color = '#aef', width = 2, life = 0.14) {
    const pts = [[x1, y1]], n = Math.max(3, Math.hypot(x2 - x1, y2 - y1) / 18 | 0);
    for (let i = 1; i < n; i++) { const t = i / n; pts.push([lerp(x1, x2, t) + rand(-8, 8), lerp(y1, y2, t) + rand(-8, 8)]); }
    pts.push([x2, y2]);
    G.line(pts, color, width, life);
  },
  fxDraw(life, draw) { G.fx.push({ kind: 'custom', draw, life, max: life }); },
  burst(x, y, color, n = 8, spd = 140, size = 3) {
    if (G.parts.length > 500) return;
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(0.3, 1) * spd;
      G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.25, 0.55), color, size: rand(size * 0.6, size * 1.3) });
    }
  },
  float(x, y, text, color = '#fff', size = 16, life = 0.8) {
    if (G.floats.length > 60) G.floats.shift();
    G.floats.push({ x, y, text, color, size, life, max: life });
  },
  banner(text, color = '#fff') { G.ban = { text, color, t: 2.2 }; },
  spawn(typeId, x, y, elite) { return spawnEnemy(def.enemies.find((t) => t.id === typeId) || def.enemies[0], x, y, elite); },
  edgePos,
  segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  },
  /* Melee hit with a per-enemy cooldown so a sweeping weapon hits once per pass. */
  melee(x, y, r, dmg, kb, cd = 0.35, key = 'm') {
    let n = 0;
    query(x, y, r, (e) => {
      const k = 'icd_' + key;
      if ((e[k] || 0) > G.time) return;
      e[k] = G.time + cd; n++;
      G.damage(e, dmg, kb, Math.atan2(e.y - G.p.y, e.x - G.p.x));
    });
    return n;
  },
  aura(x, y, r, dps, fn) {
    query(x, y, r, (e, d) => { const m = fn ? fn(e, d) : 1; if (m) G.damage(e, dps * G.dt * m, 0, 0, true); });
  },
};

/* ---------------------------------------------------------------- spawn */
function edgePos(m = 30) {
  switch (Math.random() * 4 | 0) {
    case 0: return [rand(-m, W + m), G.top - m];
    case 1: return [W + m, rand(G.top - m, H + m)];
    case 2: return [rand(-m, W + m), H + m];
    default: return [-m, rand(G.top - m, H + m)];
  }
}
function chooseType() {
  const list = def.enemies.filter((t) => (t.from || 0) <= G.time && !t.noSpawn);
  let tot = 0; for (const t of list) tot += t.w || 1;
  let r = Math.random() * tot;
  for (const t of list) { r -= t.w || 1; if (r <= 0) return t; }
  return list[0];
}
function spawnEnemy(T, x, y, elite) {
  if (x == null) [x, y] = edgePos(T.r * 2 + 10);
  const t = G.time;
  const hpMul = def.hpScale ? def.hpScale(t) : 1 + t / 70 + Math.pow(t / 200, 2);
  let hp = (def.enemyHp ? def.enemyHp(G, T) : T.hp * hpMul) * (elite ? 14 : 1);
  if (elite && def.enemyHp) hp = Math.ceil(hp * 0.6);
  const e = {
    type: T, x, y, r: T.r * (elite ? 1.7 : 1), hp, maxHp: hp,
    speed: T.speed * rand(0.88, 1.12) * (1 + Math.min(0.45, t / 500)) * (elite ? 0.8 : 1),
    dmg: (T.dmg || 10) * 0.7 * (elite ? 1.6 : 1), xp: (T.xp || 1) * (elite ? 15 : 1),
    kx: 0, ky: 0, slowT: 0, slowF: 1, flash: 0, elite: !!elite, beh: T.beh || 'chase',
    ph: Math.random() * TAU, cd: rand(0.5, 2.5), st: 0, stT: 0, dx: 0, dy: 0, color: T.color, face: 1,
  };
  if (T.init) T.init(e, G);
  G.enemies.push(e);
  return e;
}
function spawnTick(dt) {
  const sp = def.spawn || {}, t = G.time;
  const rate = Math.min(sp.max || 14, (sp.base || 1) * (0.55 + t / 28) * (sp.mul || 1));
  G.spawnAcc += rate * dt;
  const cap = sp.cap || 260;
  while (G.spawnAcc >= 1) { G.spawnAcc--; if (G.enemies.length < cap) spawnEnemy(chooseType()); }
  if (t >= G.nextWave && sp.waves !== false) {
    G.nextWave += 38;
    const T = chooseType(), side = Math.random() * 4 | 0, n = Math.min(60, 12 + t / 5 | 0);
    for (let i = 0; i < n && G.enemies.length < cap + 40; i++) {
      const m = T.r * 2 + rand(10, 80);
      const p = side === 0 ? [rand(0, W), G.top - m] : side === 1 ? [W + m, rand(G.top, H)] : side === 2 ? [rand(0, W), H + m] : [-m, rand(G.top, H)];
      spawnEnemy(T, p[0], p[1]);
    }
    G.banner(sp.waveText || 'A HORDE APPROACHES!', '#ffdd57');
  }
  if (t >= G.nextElite) {
    G.nextElite += 60;
    const list = def.enemies.filter((x) => (x.from || 0) <= t && !x.noSpawn);
    spawnEnemy(list[list.length - 1], undefined, undefined, true);
    G.banner(sp.eliteText || 'ELITE INCOMING', '#ff8a65');
  }
}

/* ---------------------------------------------------------------- update */
function inputVec() {
  let ix = 0, iy = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) ix -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) ix += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) iy -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) iy += 1;
  if (ix || iy) { const l = Math.hypot(ix, iy); return [ix / l, iy / l, 1]; }
  if (joy.on) {
    const dx = joy.x - joy.sx, dy = joy.y - joy.sy, l = Math.hypot(dx, dy), R = 48;
    if (l > R) { joy.sx = joy.x - dx / l * R; joy.sy = joy.y - dy / l * R; }
    if (l < 5) return [0, 0, 0];
    const m = Math.min(1, l / R);
    return [dx / l * m, dy / l * m, m];
  }
  return [0, 0, 0];
}

function movePlayer(dt) {
  const p = G.p, mode = def.move || 'joy';
  const [ix, iy, m] = inputVec();
  const spd = p.speed * p.boost;
  if (mode === 'paddle') {
    p.y = G.bot - 64;
    if (joy.on) { p.x += (joy.x - joy.lx) * 1.4; joy.lx = joy.x; }
    p.x += ix * 460 * dt;
    const hw = p.hw || p.r;
    p.x = clamp(p.x, hw, W - hw);
    p.moving = Math.abs(ix) > 0 || joy.on;
    return;
  }
  if (mode === 'steer') {
    if (m > 0.25) {
      const ta = Math.atan2(iy, ix);
      p.ang += clamp(angDiff(p.ang, ta), -(p.turn || 5) * dt, (p.turn || 5) * dt);
    }
    p.vx = Math.cos(p.ang) * spd; p.vy = Math.sin(p.ang) * spd;
  } else {
    const tx = ix * spd, ty = iy * spd, k = Math.min(1, dt * 14);
    p.vx += (tx - p.vx) * k; p.vy += (ty - p.vy) * k;
    if (m > 0.1) p.ang = Math.atan2(iy, ix);
  }
  p.x += (p.vx + p.kx) * dt; p.y += (p.vy + p.ky) * dt;
  p.kx *= Math.max(0, 1 - dt * 8); p.ky *= Math.max(0, 1 - dt * 8);
  p.moving = Math.hypot(p.vx, p.vy) > 20;
  if (Math.abs(p.vx) > 15) p.face = p.vx > 0 ? 1 : -1;
  const minY = G.top + p.r, maxY = G.bot - p.r;
  if (mode === 'steer') {
    if (p.x < p.r || p.x > W - p.r) p.ang = Math.PI - p.ang;
    if (p.y < minY || p.y > maxY) p.ang = -p.ang;
  }
  p.x = clamp(p.x, p.r, W - p.r); p.y = clamp(p.y, minY, maxY);
}

function updateEnemies(dt) {
  const p = G.p, decay = Math.max(0, 1 - dt * 7);
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (e.flash > 0) e.flash -= dt;
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowF = 1; }
    let tx, ty;
    if (e.lure && e.lure.t > G.time) { tx = e.lure.x; ty = e.lure.y; } else {
      const tg = def.enemyTarget ? def.enemyTarget(G, e) : p; tx = tg.x; ty = tg.y;
    }
    let dx = tx - e.x, dy = ty - e.y;
    const d = Math.hypot(dx, dy) || 1;
    let ux = dx / d, uy = dy / d, spd = e.speed * e.slowF;
    if (G.flee && !e.elite) { ux = -ux; uy = -uy; spd *= 0.55; }
    if (e.beh === 'zigzag') {
      const w = Math.sin(G.time * 5 + e.ph) * 0.9;
      const zx = ux - uy * w, zy = uy + ux * w, l = Math.hypot(zx, zy);
      ux = zx / l; uy = zy / l;
    } else if (e.beh === 'dash') {
      e.cd -= dt;
      if (e.st === 0 && d < 220 && e.cd <= 0 && G.onScreen(e)) { e.st = 1; e.stT = 0.45; e.dx = ux; e.dy = uy; }
      if (e.st === 1) { spd = 0; e.stT -= dt; if (e.stT <= 0) { e.st = 2; e.stT = 0.5; } }
      else if (e.st === 2) { ux = e.dx; uy = e.dy; spd = e.speed * 4.2 * e.slowF; e.stT -= dt; if (e.stT <= 0) { e.st = 0; e.cd = rand(1.8, 3.2); } }
    } else if (e.beh === 'orbit' && d < 140) {
      const zx = ux * 0.35 - uy, zy = uy * 0.35 + ux, l = Math.hypot(zx, zy);
      ux = zx / l; uy = zy / l;
    }
    if (e.type.move) e.type.move(e, G, dt);
    else {
      e.x += (ux * spd + e.kx) * dt; e.y += (uy * spd + e.ky) * dt;
    }
    if (Math.abs(ux) > 0.2) e.face = ux > 0 ? 1 : -1;
    e.kx *= decay; e.ky *= decay;
  }
  // separation so the horde spreads out instead of stacking
  buildGrid();
  for (const e of G.enemies) {
    if (e.dead || e.type.ghost) continue;
    query(e.x, e.y, e.r * 0.8, (o) => {
      if (o === e || o.type.ghost) return;
      let dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy);
      if (d < 0.01) { dx = rand(-1, 1); dy = rand(-1, 1); d = 1; }
      const push = (e.r + o.r - d) * 0.25;
      if (push > 0) { e.x += dx / d * push; e.y += dy / d * push; }
    });
  }
  // contact
  if (!def.noContact) {
    for (const e of G.enemies) {
      if (e.dead) continue;
      const rr = e.r + p.r * 0.8, dx = e.x - p.x, dy = e.y - p.y;
      if (dx * dx + dy * dy < rr * rr) {
        if (def.onContact && def.onContact(G, e)) continue;
        G.hurt(e.dmg);
      }
    }
  }
}

function updateBullets(dt) {
  const arr = G.bullets;
  for (let i = arr.length - 1; i >= 0; i--) {
    const b = arr[i];
    b.life -= dt;
    if (b.lob) {
      const t = 1 - b.life / b.max;
      b.x = lerp(b.sx, b.tx, t); b.y = lerp(b.sy, b.ty, t); b.z = Math.sin(Math.PI * clamp(t, 0, 1)) * b.h;
    } else {
      if (b.homing) {
        if (!b.tgt || b.tgt.dead) b.tgt = G.nearest(b.x, b.y, 400);
        if (b.tgt) {
          const sp = Math.hypot(b.vx, b.vy), a = Math.atan2(b.vy, b.vx);
          const na = a + clamp(angDiff(a, Math.atan2(b.tgt.y - b.y, b.tgt.x - b.x)), -b.homing * dt, b.homing * dt);
          b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
        }
      }
      if (b.drag) { const k = Math.max(0, 1 - b.drag * dt); b.vx *= k; b.vy *= k; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.spin) b.rot += b.spin * dt; else if (!b.fixedRot) b.rot = Math.atan2(b.vy, b.vx);
      if (b.bounce) {
        if (b.x < b.r && b.vx < 0) { b.vx = -b.vx; b.bounces = (b.bounces || 0) + 1; }
        if (b.x > W - b.r && b.vx > 0) { b.vx = -b.vx; b.bounces = (b.bounces || 0) + 1; }
        if (b.y < G.top + b.r && b.vy < 0) { b.vy = -b.vy; b.bounces = (b.bounces || 0) + 1; }
        if (b.y > G.bot - b.r && b.vy > 0) { b.vy = -b.vy; b.bounces = (b.bounces || 0) + 1; }
      } else if (b.x < -80 || b.x > W + 80 || b.y < -80 || b.y > H + 80) b.life = 0;
    }
    if (b.update) b.update(b, G, dt);
    if (!b.noHit && b.life > 0 && !b.done) {
      query(b.x, b.y, b.r, (e) => {
        if (b.done) return;
        const h = b.hit.get(e);
        if (h != null && (!b.rehit || G.time - h < b.rehit)) return;
        b.hit.set(e, G.time);
        G.damage(e, b.dmg, b.kb, Math.atan2(b.vy, b.vx), b.quiet);
        if (b.slow) { e.slowT = b.slowT || 1.2; e.slowF = Math.min(e.slowF, 1 - b.slow); }
        if (b.onHit) b.onHit(b, e, G);
        if (b.ricochet > 0) {
          b.ricochet--;
          const n = G.nearest(b.x, b.y, 320, (x) => !b.hit.has(x));
          if (n) {
            const sp = Math.hypot(b.vx, b.vy), a = Math.atan2(n.y - b.y, n.x - b.x);
            b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.life = Math.max(b.life, 0.8);
            return;
          }
        }
        if (b.pierce-- <= 0) b.done = true;
      });
    }
    if (b.life <= 0 || b.done) {
      if (b.onExpire) b.onExpire(b, G);
      arr[i] = arr[arr.length - 1]; arr.pop();
    }
  }
}

function updateZones(dt) {
  const z = G.zones;
  for (let i = z.length - 1; i >= 0; i--) {
    const o = z[i];
    o.life -= dt;
    if (o.follow) { o.x = o.follow.x; o.y = o.follow.y; }
    if (o.dps || o.slow || o.block || o.lure || o.onTick) {
      query(o.x, o.y, o.r, (e) => {
        if (o.dps) G.damage(e, o.dps * dt, 0, 0, true);
        if (o.slow) { e.slowT = 0.15; e.slowF = Math.min(e.slowF, 1 - o.slow); }
        if (o.lure && !e.elite) e.lure = { x: o.x, y: o.y, t: G.time + o.lure };
        if (o.block) {
          const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy) || 1, need = o.block + e.r;
          if (d < need) { e.x = o.x + dx / d * need; e.y = o.y + dy / d * need; }
        }
        if (o.onTick) o.onTick(o, e, G, dt);
      });
    }
    if (o.life <= 0) { if (o.onExpire) o.onExpire(o, G); z[i] = z[z.length - 1]; z.pop(); }
  }
}

function updateGems(dt) {
  const p = G.p, arr = G.gems;
  for (let i = arr.length - 1; i >= 0; i--) {
    const g = arr[i];
    const dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy) || 1;
    if (!g.mag && d < p.magnet) g.mag = true;
    if (g.mag) {
      g.sp = (g.sp || 120) + 1100 * dt;
      g.x += dx / d * g.sp * dt; g.y += dy / d * g.sp * dt;
    } else {
      g.x += g.vx * dt; g.y += g.vy * dt; g.vx *= 0.9; g.vy *= 0.9;
    }
    if (d < p.r + 10) {
      if (g.heal) G.heal(g.heal); else G.addXp(g.v);
      sfx('pick');
      arr[i] = arr[arr.length - 1]; arr.pop();
    }
  }
}

function updateFx(dt) {
  for (let i = G.fx.length - 1; i >= 0; i--) { const f = G.fx[i]; f.life -= dt; if (f.life <= 0) { G.fx[i] = G.fx[G.fx.length - 1]; G.fx.pop(); } }
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const q = G.parts[i]; q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.92; q.vy *= 0.92;
    if (q.life <= 0) { G.parts[i] = G.parts[G.parts.length - 1]; G.parts.pop(); }
  }
  for (let i = G.floats.length - 1; i >= 0; i--) { const f = G.floats[i]; f.life -= dt; f.y -= 30 * dt; if (f.life <= 0) G.floats.splice(i, 1); }
  if (G.ban) { G.ban.t -= dt; if (G.ban.t <= 0) G.ban = null; }
  G.shake = Math.max(0, G.shake - dt * 30);
  G.hurtFlash = Math.max(0, (G.hurtFlash || 0) - dt);
}

function step(dt) {
  G.dt = dt; G.time += dt;
  const p = G.p;
  p.invuln = Math.max(0, p.invuln - dt);
  if (G.regen) p.hp = Math.min(p.maxHp, p.hp + G.regen * dt);
  p.boost = 1;
  if (def.preUpdate) def.preUpdate(G, dt);
  movePlayer(dt);
  buildGrid();
  if (def.update) def.update(G, dt);
  if (!def.custom) {
    spawnTick(dt);
    updateEnemies(dt);
  }
  buildGrid();
  updateBullets(dt);
  updateZones(dt);
  updateGems(dt);
  updateFx(dt);
  if (G.enemies.some((e) => e.dead)) G.enemies = G.enemies.filter((e) => !e.dead);
  if (G.pending > 0 && G.state === 'play') openLevelUp();
}

/* ---------------------------------------------------------------- render */
function drawDefaultBg() {
  ctx.fillStyle = def.bg || '#222'; ctx.fillRect(0, 0, W, H);
  if (def.grid) {
    ctx.strokeStyle = def.grid; ctx.lineWidth = 1; ctx.beginPath();
    const s = def.gridSize || 40;
    for (let x = 0; x < W; x += s) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
    for (let y = 0; y < H; y += s) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
  }
}
function drawEnemy(e) {
  const T = e.type;
  if (T.draw) T.draw(ctx, e, G);
  else if (def.drawEnemy) def.drawEnemy(ctx, e, G);
  else if (T.emoji) {
    const sz = (T.size || e.r * 2.3) * (e.elite ? 1.7 : 1);
    drawEmoji(ctx, T.emoji, e.x, e.y, sz, T.faceLeft ? e.face > 0 : T.faceRight ? e.face < 0 : false, Math.sin(G.time * 9 + e.ph) * 0.12);
  } else {
    ctx.fillStyle = e.color || '#c33'; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, TAU); ctx.fill();
  }
  if (e.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, TAU); ctx.fill(); }
  if (e.st === 1) { ctx.strokeStyle = 'rgba(255,60,60,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 4, 0, TAU); ctx.stroke(); }
  if (e.elite) {
    ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 5, 0, TAU); ctx.stroke();
    const w = e.r * 2.2;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(e.x - w / 2, e.y - e.r - 14, w, 5);
    ctx.fillStyle = '#ff5252'; ctx.fillRect(e.x - w / 2, e.y - e.r - 14, w * Math.max(0, e.hp / e.maxHp), 5);
  }
}
function drawBullet(b) {
  if (b.draw) { b.draw(ctx, b, G); return; }
  if (b.lob) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * 1.2, b.r * 0.6, 0, 0, TAU); ctx.fill();
    if (b.emoji) drawEmoji(ctx, b.emoji, b.x, b.y - (b.z || 0), b.size || b.r * 2.6, false, G.time * 8);
    else { ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y - (b.z || 0), b.r, 0, TAU); ctx.fill(); }
    return;
  }
  if (b.emoji) drawEmoji(ctx, b.emoji, b.x, b.y, b.size || b.r * 2.6, false, b.rot + (b.rotOff || 0));
  else { ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); }
}
function drawZone(z) {
  if (z.draw) { z.draw(ctx, z, G); return; }
  const a = Math.min(1, z.life / Math.min(0.5, z.max) );
  ctx.globalAlpha = a * (z.alpha || 0.45);
  ctx.fillStyle = z.color; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
}
function drawGem(g) {
  if (g.heal) { drawEmoji(ctx, '❤️', g.x, g.y, 18, false, Math.sin(G.time * 6) * 0.2); return; }
  if (def.drawGem) { def.drawGem(ctx, g, G); return; }
  const s = g.v > 4 ? 7 : 5;
  if (def.gemEmoji) { drawEmoji(ctx, def.gemEmoji, g.x, g.y, s * 2.6); return; }
  ctx.fillStyle = def.xpColor || '#5cf';
  ctx.beginPath(); ctx.moveTo(g.x, g.y - s); ctx.lineTo(g.x + s * 0.7, g.y); ctx.lineTo(g.x, g.y + s); ctx.lineTo(g.x - s * 0.7, g.y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke();
}
function drawFx(f) {
  const k = f.life / f.max;
  if (f.kind === 'ring') {
    ctx.globalAlpha = k; ctx.strokeStyle = f.color; ctx.lineWidth = f.width;
    ctx.beginPath(); ctx.arc(f.x, f.y, lerp(f.r, f.r0, k), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
  } else if (f.kind === 'disc') {
    ctx.globalAlpha = k * 0.5; ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  } else if (f.kind === 'line') {
    ctx.globalAlpha = Math.min(1, k * 1.5); ctx.strokeStyle = f.color; ctx.lineWidth = f.width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(f.pts[0][0], f.pts[0][1]);
    for (let i = 1; i < f.pts.length; i++) ctx.lineTo(f.pts[i][0], f.pts[i][1]);
    ctx.stroke(); ctx.globalAlpha = 1;
  } else if (f.kind === 'custom') f.draw(ctx, k, G);
}
function drawPlayer() {
  const p = G.p;
  if (p.invuln > 0 && Math.floor(G.time * 20) % 2) ctx.globalAlpha = 0.45;
  if (def.player.draw) def.player.draw(ctx, G, p);
  else drawEmoji(ctx, def.player.emoji, p.x, p.y, def.player.size || p.r * 2.4, def.player.faceLeft ? p.face > 0 : false, p.moving ? Math.sin(G.time * 16) * 0.08 : 0);
  ctx.globalAlpha = 1;
  if (p.shield > 0) {
    ctx.strokeStyle = 'rgba(150,230,255,0.8)'; ctx.lineWidth = 2;
    for (let i = 0; i < p.shield; i++) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 7 + i * 4, 0, TAU); ctx.stroke(); }
  }
}
function hpBar() {
  const p = G.p, at = def.hpAt ? def.hpAt(G) : p, w = def.hpAt ? 64 : 40;
  const y = at.y + (at.r || p.r) + 10;
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(at.x - w / 2 - 1, y - 1, w + 2, 7);
  ctx.fillStyle = p.hp / p.maxHp > 0.35 ? '#4ade80' : '#f87171';
  ctx.fillRect(at.x - w / 2, y, w * p.hp / p.maxHp, 5);
}
function text(t, x, y, size, color, align = 'left') {
  ctx.font = 'bold ' + size + 'px system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(t, x, y);
  ctx.fillStyle = color; ctx.fillText(t, x, y);
}
Horde.text = (c, t, x, y, size, color, align) => { const o = ctx; ctx = c; text(t, x, y, size, color, align); ctx = o; };
function drawHud() {
  const top = safeT + 6;
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(8, top, W - 16, 9);
  ctx.fillStyle = def.xpBar || def.xpColor || '#5cf'; ctx.fillRect(9, top + 1, (W - 18) * Math.min(1, G.xp / G.xpNext), 7);
  text('LV ' + G.level, 12, top + 24, 16, '#fff');
  text(Horde.fmtTime(G.time), W / 2, top + 24, 18, '#fff', 'center');
  text('☠ ' + G.kills, W - 58, top + 24, 15, '#fff', 'right');
  if (def.hud) def.hud(ctx, G, top + 46);
  if (G.ban) {
    ctx.globalAlpha = Math.min(1, G.ban.t);
    text(G.ban.text, W / 2, top + 70, 22, G.ban.color, 'center');
    ctx.globalAlpha = 1;
  }
}
function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (!G) { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H); return; }
  ctx.save();
  if (G.shake > 0) ctx.translate(rand(-G.shake, G.shake), rand(-G.shake, G.shake));
  if (def.drawBg) def.drawBg(ctx, G); else drawDefaultBg();
  for (const z of G.zones) drawZone(z);
  if (def.drawUnder) def.drawUnder(ctx, G);
  for (const g of G.gems) drawGem(g);
  for (const e of G.enemies) drawEnemy(e);
  for (const b of G.bullets) drawBullet(b);
  if (G.state !== 'over' || G.p.hp > 0) drawPlayer();
  if (def.drawOver) def.drawOver(ctx, G);
  for (const f of G.fx) drawFx(f);
  for (const q of G.parts) { ctx.globalAlpha = Math.min(1, q.life * 3); ctx.fillStyle = q.color; ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); }
  ctx.globalAlpha = 1;
  for (const f of G.floats) { ctx.globalAlpha = Math.min(1, f.life / f.max * 2); text(f.text, f.x, f.y, f.size, f.color, 'center'); }
  ctx.globalAlpha = 1;
  if (!def.noHpBar) hpBar();
  ctx.restore();
  if (G.hurtFlash > 0) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, 'rgba(255,0,0,' + (G.hurtFlash * 1.4) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (joy.on && G.state === 'play' && (def.move || 'joy') !== 'paddle') {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(joy.sx, joy.sy, 48, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(joy.x, joy.y, 18, 0, TAU); ctx.fill();
  }
  if (G.state !== 'start') drawHud();
}

/* -------------------------------------------------------------- upgrades */
const GENERIC = [
  { id: 'g_vit', name: 'Vitality', icon: '❤️', max: 5, desc: '+20 max HP and heal 20', apply: (G) => { G.p.maxHp += 20; G.heal(20); } },
  { id: 'g_spd', name: 'Swift Feet', icon: '👟', max: 5, desc: 'Move speed +10%', apply: (G) => { G.p.speed *= 1.1; } },
  { id: 'g_mag', name: 'Magnet', icon: '🧲', max: 4, desc: 'Pickup radius +40%', apply: (G) => { G.p.magnet *= 1.4; } },
  { id: 'g_reg', name: 'Recovery', icon: '🩹', max: 3, desc: 'Regenerate 0.6 HP per second', apply: (G) => { G.regen += 0.6; } },
  { id: 'g_dmg', name: 'Might', icon: '💪', max: 5, desc: 'All damage +12%', apply: (G) => { G.dmgMul *= 1.12; } },
];
function upgradePool() {
  const own = def.upgrades.filter((u) => (G.up[u.id] || 0) < (u.max || 5) && (!u.req || u.req(G)));
  const ex = def.noGeneric || [];
  const gen = GENERIC.filter((u) => !ex.includes(u.id.slice(2)) && (G.up[u.id] || 0) < u.max).map((u) => {
    const o = def.genericNames && def.genericNames[u.id.slice(2)];
    return o ? Object.assign({}, u, o) : u;
  });
  const pool = own.map((u) => [u, 3]).concat(gen.map((u) => [u, 1]));
  const out = [];
  while (out.length < 3 && pool.length) {
    let tot = 0; for (const x of pool) tot += x[1];
    let r = Math.random() * tot, i = 0;
    for (; i < pool.length; i++) { r -= pool[i][1]; if (r <= 0) break; }
    out.push(pool.splice(Math.min(i, pool.length - 1), 1)[0][0]);
  }
  if (!out.length) out.push({ id: 'snack', name: 'Snack Break', icon: '🍰', max: 999, desc: 'Heal 30 HP', apply: (G) => G.heal(30) });
  return out;
}
function openLevelUp() {
  G.state = 'level';
  sfx('level');
  joy.on = false;
  const opts = upgradePool();
  const box = $('cards'); box.innerHTML = '';
  $('lvlTitle').textContent = 'LEVEL ' + (G.level - G.pending + 1) + '!';
  opts.forEach((u, i) => {
    const lv = G.up[u.id] || 0;
    const b = document.createElement('button');
    b.className = 'card';
    const desc = typeof u.desc === 'function' ? u.desc(lv, G) : u.desc;
    b.innerHTML = '<span class="ci">' + u.icon + '</span><span class="cb"><b>' + u.name + '</b><small>' + (lv ? 'Lv ' + lv + ' → ' + (lv + 1) : 'NEW') +
      '</small><span>' + desc + '</span></span><kbd>' + (i + 1) + '</kbd>';
    b.onclick = () => choose(u);
    box.appendChild(b);
  });
  $('lvl').classList.add('show');
}
function choose(u) {
  if (G.state !== 'level') return;
  G.up[u.id] = (G.up[u.id] || 0) + 1;
  u.apply(G, G.up[u.id]);
  G.pending--;
  $('lvl').classList.remove('show');
  G.state = 'play';
  if (G.pending > 0) setTimeout(() => { if (G.state === 'play') openLevelUp(); }, 120);
}

/* ------------------------------------------------------------- lifecycle */
function newGame() {
  const pd = def.player || {};
  G = Object.assign({
    def, w: W, h: H, top: safeT, bot: H - safeB, time: 0, dt: 0, state: 'start', level: 1, xp: 0, xpNext: def.xpStart || 5, pending: 0,
    kills: 0, enemies: [], bullets: [], zones: [], gems: [], fx: [], parts: [], floats: [], tm: {}, up: {},
    s: JSON.parse(JSON.stringify(def.stats || {})), spawnAcc: 0, nextWave: 45, nextElite: 70, shake: 0, dmgMul: 1, xpMul: 1,
    flee: false, regen: 0, hurtFlash: 0, ban: null,
  }, API);
  G.p = {
    x: W / 2, y: (G.top + G.bot) / 2, r: pd.r || 16, hp: pd.hp || 100, maxHp: pd.hp || 100, speed: pd.speed || 150, boost: 1,
    vx: 0, vy: 0, kx: 0, ky: 0, ang: -Math.PI / 2, face: 1, moving: false, invuln: 0, shield: 0, magnet: pd.magnet || 70,
  };
  if (def.init) def.init(G);
}
function startGame() {
  newGame();
  G.state = 'play';
  hideAll();
  $('pauseBtn').style.display = 'block';
  sfx('power');
}
function gameOver() {
  G.state = 'over';
  joy.on = false;
  const best = store.get('best-' + def.id, 0), isBest = G.time > best;
  if (isBest) store.set('best-' + def.id, G.time);
  store.set('stats-' + def.id, { level: Math.max(G.level, (store.get('stats-' + def.id, {}).level || 0)) });
  G.burst(G.p.x, G.p.y, '#fff', 30, 260);
  setTimeout(() => {
    $('overStats').innerHTML = '<div><b>' + Horde.fmtTime(G.time) + '</b><small>survived</small></div><div><b>' + G.level + '</b><small>level</small></div><div><b>' + G.kills + '</b><small>' + (def.killWord || 'defeated') + '</small></div>';
    $('overBest').textContent = isBest ? '★ New best time!' : 'Best: ' + Horde.fmtTime(Math.max(best, G.time));
    $('overTitle').textContent = def.overText || 'OVERRUN!';
    $('over').classList.add('show');
    $('pauseBtn').style.display = 'none';
  }, 700);
}
function pause() {
  if (!G || G.state !== 'play') return;
  G.state = 'pause'; joy.on = false;
  const list = Object.keys(G.up).map((id) => {
    const u = def.upgrades.find((x) => x.id === id) || GENERIC.find((x) => x.id === id) || { icon: '🍰' };
    return '<span title="' + (u.name || '') + '">' + u.icon + '<sub>' + G.up[id] + '</sub></span>';
  }).join('');
  $('pauseUps').innerHTML = list || '<i>No upgrades yet</i>';
  $('pause').classList.add('show');
}
function resume() { if (G && G.state === 'pause') { G.state = 'play'; $('pause').classList.remove('show'); last = 0; } }
function hideAll() { for (const id of ['start', 'lvl', 'pause', 'over']) $(id).classList.remove('show'); }
function showStart() {
  newGame();
  $('sEmoji').textContent = def.icon;
  $('sTitle').textContent = def.name;
  $('sHook').textContent = def.hook;
  $('sHow').innerHTML = def.how;
  $('sUps').innerHTML = def.upgrades.map((u) => '<span>' + u.icon + ' ' + u.name + '</span>').join('');
  const best = store.get('best-' + def.id, 0);
  $('sBest').textContent = best ? 'Best: ' + Horde.fmtTime(best) : '';
  $('start').classList.add('show');
  $('pauseBtn').style.display = 'none';
}

function frame(ts) {
  requestAnimationFrame(frame);
  const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
  last = ts;
  if (G && G.state === 'play' && dt > 0) step(dt);
  else if (G && G.state === 'over' && dt > 0) updateFx(dt);
  render();
}

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const cs = getComputedStyle(safeEl);
  safeT = parseFloat(cs.paddingTop) || 0; safeB = parseFloat(cs.paddingBottom) || 0;
  if (G) {
    G.w = W; G.h = H; G.top = safeT; G.bot = H - safeB;
    G.p.x = clamp(G.p.x, G.p.r, W - G.p.r); G.p.y = clamp(G.p.y, G.top + G.p.r, G.bot - G.p.r);
    if (def.onResize) def.onResize(G);
  }
}

/* Hooks for automated smoke tests. */
Horde._test = { get G() { return G; }, step: (dt) => { if (G.state === 'play') step(dt); }, render: () => render(), start: () => startGame() };

Horde.boot = function () {
  const id = new URLSearchParams(location.search).get('g');
  def = Horde.games[id];
  if (!def) { location.replace('index.html'); return; }
  document.title = def.name + ' · Horde Arcade';
  cv = $('cv'); ctx = cv.getContext('2d'); safeEl = $('safe');
  resize();
  window.addEventListener('resize', resize);
  document.body.style.background = def.bg || '#111';

  cv.addEventListener('pointerdown', (e) => {
    if (joy.on) return;
    joy.on = true; joy.id = e.pointerId; joy.sx = joy.x = joy.lx = e.clientX; joy.sy = joy.y = e.clientY;
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (AC && AC.state === 'suspended') AC.resume();
  });
  cv.addEventListener('pointermove', (e) => { if (joy.on && e.pointerId === joy.id) { joy.x = e.clientX; joy.y = e.clientY; } });
  const up = (e) => { if (e.pointerId === joy.id) joy.on = false; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (e.code === 'Escape' || e.code === 'KeyP') { if (G.state === 'play') pause(); else if (G.state === 'pause') resume(); }
    if ((e.code === 'Space' || e.code === 'Enter') && (G.state === 'start' || $('over').classList.contains('show'))) { e.preventDefault(); startGame(); }
    if (G.state === 'level' && /^Digit[1-3]$/.test(e.code)) { const c = $('cards').children[+e.code.slice(5) - 1]; if (c) c.click(); }
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  $('playBtn').onclick = startGame;
  $('retryBtn').onclick = startGame;
  $('restartBtn').onclick = startGame;
  $('resumeBtn').onclick = resume;
  $('pauseBtn').onclick = pause;
  const muteLbl = () => { $('muteBtn').textContent = muted ? '🔇 Sound off' : '🔊 Sound on'; };
  $('muteBtn').onclick = () => { muted = !muted; store.set('muted', muted); muteLbl(); };
  muteLbl();

  showStart();
  requestAnimationFrame(frame);
};
})();
