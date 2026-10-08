/* Category 1: Everyday Chaos (games 1–5) */
(() => {
'use strict';
const { rand, randInt, pick, TAU } = Horde.U;
const CAT = 'Everyday Chaos';

/* Random decorations placed in screen fractions so they survive resizes. */
const decor = (n, emojis) => Array.from({ length: n }, () => ({ fx: Math.random(), fy: Math.random(), e: pick(emojis), s: rand(18, 30) }));
const drawDecor = (ctx, G, list, alpha = 0.55) => {
  ctx.globalAlpha = alpha;
  for (const d of list) Horde.drawEmoji(ctx, d.e, d.fx * G.w, G.top + d.fy * (G.bot - G.top), d.s);
  ctx.globalAlpha = 1;
};

/* =============================== 1. LAWNMOWER VS. WILD =============================== */
function makeLawn(G) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, G.w); c.height = Math.max(1, G.h);
  G.lawn = c; G.lawnCtx = c.getContext('2d');
}
const fireZoneDraw = (ctx, z, G) => {
  const k = Math.min(1, z.life / z.max * 1.5);
  const r = z.r * (0.85 + Math.sin(G.time * 30 + z.x) * 0.15);
  const g = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, r);
  g.addColorStop(0, 'rgba(255,240,120,' + 0.9 * k + ')');
  g.addColorStop(0.5, 'rgba(255,120,20,' + 0.7 * k + ')');
  g.addColorStop(1, 'rgba(200,30,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(z.x, z.y, r, 0, TAU); ctx.fill();
};
Horde.fireZoneDraw = fireZoneDraw;

Horde.register({
  id: 'lawnmower', cat: CAT, name: 'Lawnmower vs. Wild', icon: '🌿',
  hook: 'Total satisfaction from clearing clutter. Mow down aggressive weeds and giant mutant flowers. Your blades shred anything in reach.',
  how: 'Drag anywhere to drive. Your blades cut automatically. Collect <b>Mulch</b> to level up.',
  bg: '#4c9a3f', xpColor: '#a0662d', xpBar: '#d39b52', killWord: 'weeds shredded',
  noGeneric: ['spd'],
  stats: { blade: 42, dps: 30, exhaust: 0, whack: 0, nitro: 0 },
  enemies: [
    { id: 'weed', emoji: '🌿', r: 12, hp: 14, speed: 52, dmg: 8, xp: 1, w: 10, color: '#2e7d32' },
    { id: 'clover', emoji: '☘️', r: 10, hp: 10, speed: 78, dmg: 6, xp: 1, w: 5, from: 20, beh: 'zigzag', color: '#43a047' },
    { id: 'flower', emoji: '🌻', r: 16, hp: 45, speed: 40, dmg: 14, xp: 3, w: 4, from: 35, color: '#fdd835' },
    { id: 'shroom', emoji: '🍄', r: 12, hp: 24, speed: 70, dmg: 10, xp: 2, w: 3, from: 90, beh: 'dash', color: '#e53935' },
    { id: 'cactus', emoji: '🌵', r: 17, hp: 90, speed: 34, dmg: 16, xp: 5, w: 2, from: 140, color: '#558b2f' },
  ],
  upgrades: [
    { id: 'deck', name: 'Wider Cutting Deck', icon: '📏', max: 6, desc: 'Blade radius +18%', apply: (G) => { G.s.blade *= 1.18; } },
    { id: 'sharp', name: 'Sharpened Blades', icon: '🔪', max: 5, desc: 'Blade damage +30%', apply: (G) => { G.s.dps *= 1.3; } },
    { id: 'exhaust', name: 'Flaming Exhaust', icon: '🔥', max: 5, desc: (l) => (l ? 'Hotter, longer-lasting fire trail' : 'Leave a burning trail behind the mower'), apply: (G) => { G.s.exhaust++; } },
    { id: 'whack', name: 'Weed-Whacker Arms', icon: '🌀', max: 4, desc: (l) => (l ? 'One more spinning trimmer arm' : 'Two spinning string trimmers orbit the mower'), apply: (G) => { G.s.whack++; } },
    { id: 'nitro', name: 'Nitro Boost', icon: '🚀', max: 4, desc: (l) => (l ? 'Nitro recharges faster and lasts longer' : 'Every few seconds: double speed and ram damage'), apply: (G) => { G.s.nitro++; } },
    { id: 'speed', name: 'Speed Boost', icon: '⚡', max: 5, desc: 'Drive speed +12%', apply: (G) => { G.p.speed *= 1.12; } },
  ],
  init(G) { makeLawn(G); },
  onResize(G) { makeLawn(G); },
  update(G, dt) {
    const p = G.p, s = G.s;
    G.aura(p.x, p.y, s.blade, s.dps);
    // mowed stripes slowly grow back
    const L = G.lawnCtx;
    L.fillStyle = 'rgba(200,240,150,0.55)'; L.beginPath(); L.arc(p.x, p.y, s.blade * 0.75, 0, TAU); L.fill();
    G.every('regrow', 0.5, () => { L.globalCompositeOperation = 'destination-out'; L.fillStyle = 'rgba(0,0,0,0.04)'; L.fillRect(0, 0, G.w, G.h); L.globalCompositeOperation = 'source-over'; });
    if (s.exhaust) G.every('exhaust', 0.11, () => {
      if (!p.moving) return;
      G.zone({ x: p.x - Math.cos(p.ang) * p.r * 1.3, y: p.y - Math.sin(p.ang) * p.r * 1.3, r: 13 + s.exhaust * 3, life: 0.9 + s.exhaust * 0.35, dps: 12 + s.exhaust * 9, draw: fireZoneDraw });
    });
    if (s.whack) {
      const n = s.whack + 1, R = s.blade + 24;
      G.tm.wa = (G.tm.wa || 0) + dt * 6;
      for (let i = 0; i < n; i++) {
        const a = G.tm.wa + i * TAU / n;
        G.melee(p.x + Math.cos(a) * R, p.y + Math.sin(a) * R, 14, 16, 160, 0.3, 'wh' + i);
      }
    }
    if (s.nitro) {
      G.every('nitro', 7 - s.nitro, () => { G.tm.nitroT = 1 + s.nitro * 0.25; G.ring(p.x, p.y, 60, '#4fc3f7', 0.3); G.sfx('power'); });
      if (G.tm.nitroT > 0) {
        G.tm.nitroT -= dt; p.boost = 2;
        G.melee(p.x, p.y, p.r + 10, 35, 420, 0.45, 'ram');
        G.burst(p.x - Math.cos(p.ang) * 20, p.y - Math.sin(p.ang) * 20, '#4fc3f7', 1, 60);
      }
    }
  },
  drawBg(ctx, G) {
    for (let x = 0, i = 0; x < G.w; x += 36, i++) { ctx.fillStyle = i % 2 ? '#4c9a3f' : '#55a647'; ctx.fillRect(x, 0, 36, G.h); }
    if (G.lawn) ctx.drawImage(G.lawn, 0, 0, G.w, G.h);
  },
  drawOver(ctx, G) {
    const p = G.p, s = G.s;
    if (s.whack) {
      const n = s.whack + 1, R = s.blade + 24;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
      for (let i = 0; i < n; i++) {
        const a = G.tm.wa + i * TAU / n, x = p.x + Math.cos(a) * R, y = p.y + Math.sin(a) * R;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = '#ff9800'; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - 10 * Math.cos(G.time * 30), y - 10 * Math.sin(G.time * 30)); ctx.lineTo(x + 10 * Math.cos(G.time * 30), y + 10 * Math.sin(G.time * 30)); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      }
    }
  },
  player: {
    r: 17, hp: 100, speed: 150,
    draw(ctx, G, p) {
      const s = G.s;
      // spinning blade field
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.arc(p.x, p.y, s.blade, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(G.time * 14);
      ctx.strokeStyle = 'rgba(230,240,255,0.55)'; ctx.lineWidth = 3; ctx.setLineDash([10, 14]);
      ctx.beginPath(); ctx.arc(0, 0, s.blade - 2, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
      ctx.fillStyle = '#222'; for (const [x, y] of [[-12, -15], [-12, 11], [9, -15], [9, 11]]) ctx.fillRect(x, y, 9, 5);
      ctx.fillStyle = G.tm.nitroT > 0 ? '#29b6f6' : '#e53935';
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-16, -12, 30, 24, 6) : ctx.rect(-16, -12, 30, 24); ctx.fill();
      ctx.fillStyle = '#b71c1c'; ctx.fillRect(-6, -7, 12, 14);
      ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-16, -9); ctx.lineTo(-30, -11); ctx.lineTo(-30, 11); ctx.lineTo(-16, 9); ctx.stroke();
      if (G.s.exhaust) { ctx.fillStyle = '#ff7043'; ctx.beginPath(); ctx.arc(-20, 0, 3 + Math.random() * 3, 0, TAU); ctx.fill(); }
      ctx.restore();
    },
  },
});

/* =============================== 2. SHOPPING CART CHAOS =============================== */
const cerealDraw = (ctx, z) => {
  const k = Math.min(1, z.life / z.max * 2);
  ctx.globalAlpha = k * 0.9;
  const cols = ['#ffca28', '#ef5350', '#66bb6a', '#42a5f5'];
  for (let i = 0; i < 6; i++) {
    const a = z.seed + i * 1.7, d = (i * 37 % 10) / 10 * z.r;
    ctx.fillStyle = cols[i % 4];
    ctx.beginPath(); ctx.arc(z.x + Math.cos(a) * d, z.y + Math.sin(a) * d, 3, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
};
Horde.register({
  id: 'cart', cat: CAT, name: 'Shopping Cart Chaos', icon: '🛒',
  hook: 'Pure grocery store panic. Sprint the aisles while angry shoppers and rogue security guards chase you. Groceries launch out of your cart automatically.',
  how: 'Drag anywhere to push the cart. Soda cans fire at the nearest shopper. Grab <b>Coupons</b> to level up.',
  bg: '#ebe5d6', grid: 'rgba(160,145,120,0.25)', gridSize: 44, xpColor: '#26a69a', killWord: 'shoppers stopped',
  player: { r: 17, hp: 100, speed: 155, emoji: '🛒', size: 40 },
  noGeneric: ['spd'],
  stats: { rate: 0.6, cans: 1, dmg: 13, turkey: 0, cereal: 0, melon: 0 },
  enemies: [
    { id: 'shopper', emoji: '👨', r: 13, hp: 16, speed: 55, dmg: 9, xp: 1, w: 8, color: '#8d6e63' },
    { id: 'shopper2', emoji: '👩', r: 13, hp: 16, speed: 60, dmg: 9, xp: 1, w: 8, color: '#a1887f' },
    { id: 'guard', emoji: '👮', r: 14, hp: 32, speed: 65, dmg: 12, xp: 2, w: 4, from: 40, beh: 'dash', color: '#1e88e5' },
    { id: 'kid', emoji: '👦', r: 11, hp: 12, speed: 95, dmg: 6, xp: 1, w: 3, from: 70, beh: 'zigzag', color: '#ffb74d' },
    { id: 'granny', emoji: '👵', r: 15, hp: 80, speed: 36, dmg: 16, xp: 4, w: 2, from: 110, color: '#bdbdbd' },
  ],
  upgrades: [
    { id: 'soda', name: 'High-Velocity Soda', icon: '🥤', max: 5, desc: 'Cans fire 20% faster and hit harder', apply: (G) => { G.s.rate *= 0.8; G.s.dmg += 3; } },
    { id: 'multi', name: 'Six-Pack', icon: '🍻', max: 3, desc: 'Fire one extra can per volley', apply: (G) => { G.s.cans++; } },
    { id: 'turkey', name: 'Frozen Turkeys', icon: '🍗', max: 4, desc: (l) => (l ? 'Turkeys fly more often and hit harder' : 'Hurl a frozen turkey with massive knockback'), apply: (G) => { G.s.turkey++; } },
    { id: 'cereal', name: 'Cereal Trail', icon: '🥣', max: 4, desc: (l) => (l ? 'Wider, longer-lasting cereal' : 'Spill cereal behind you that slows enemies'), apply: (G) => { G.s.cereal++; } },
    { id: 'melon', name: 'Watermelon Bombs', icon: '🍉', max: 5, desc: (l) => (l ? 'Bigger, more frequent explosions' : 'Lob watermelons that explode on impact'), apply: (G) => { G.s.melon++; } },
    { id: 'wheels', name: 'Faster Wheels', icon: '🛞', max: 5, desc: 'Cart speed +12%', apply: (G) => { G.p.speed *= 1.12; } },
  ],
  update(G, dt) {
    const p = G.p, s = G.s;
    G.every('soda', s.rate, () => {
      const t = G.nearestN(p.x, p.y, s.cans, 420);
      t.forEach((e, i) => {
        const a = Math.atan2(e.y - p.y, e.x - p.x) + (i ? rand(-0.05, 0.05) : 0);
        G.shoot({ x: p.x, y: p.y, vx: Math.cos(a) * 460, vy: Math.sin(a) * 460, r: 6, dmg: s.dmg, emoji: '🥤', size: 20, spin: 12, kb: 90 });
      });
      if (t.length) G.sfx('shoot');
    });
    if (s.turkey) G.every('turkey', 2.6 - s.turkey * 0.3, () => {
      const e = G.nearest(p.x, p.y, 400); if (!e) return;
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      G.shoot({ x: p.x, y: p.y, vx: Math.cos(a) * 320, vy: Math.sin(a) * 320, r: 13, dmg: 28 + s.turkey * 10, kb: 750, pierce: 2 + s.turkey, emoji: '🍗', size: 32, spin: 9, life: 2.5 });
    });
    if (s.cereal) G.every('cereal', 0.12, () => {
      if (!p.moving) return;
      G.zone({ x: p.x - Math.cos(p.ang) * 18, y: p.y - Math.sin(p.ang) * 18, r: 15 + s.cereal * 3, life: 2 + s.cereal * 0.6, slow: 0.45 + s.cereal * 0.06, dps: 3 * s.cereal, seed: rand(0, TAU), draw: cerealDraw });
    });
    if (s.melon) G.every('melon', 3.4 - s.melon * 0.35, () => {
      const e = G.randomEnemy(p.x, p.y, 320); if (!e) return;
      const R = 60 + s.melon * 12, dmg = 40 + s.melon * 12;
      G.lob({ x: p.x, y: p.y, tx: e.x, ty: e.y, time: 0.6, h: 80, r: 10, emoji: '🍉', size: 28, onExpire: (b) => { G.explode(b.x, b.y, R, dmg, '#ff5a6e', 300); G.burst(b.x, b.y, '#43a047', 8, 160); } });
    });
  },
});

/* =============================== 3. ANGRY GRANDMA =============================== */
const crumbDraw = (ctx, z) => {
  const k = Math.min(1, z.life / z.max * 3);
  ctx.globalAlpha = k * 0.25; ctx.fillStyle = '#ffe0b2'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
  ctx.globalAlpha = k; ctx.fillStyle = '#d7a86e';
  for (let i = 0; i < 10; i++) { const a = z.seed + i * 2.4, d = (i * 13 % 10) / 10 * 22; ctx.fillRect(z.x + Math.cos(a) * d - 2, z.y + Math.sin(a) * d - 2, 4, 4); }
  ctx.globalAlpha = 1;
};
Horde.register({
  id: 'grandma', cat: CAT, name: 'Angry Grandma', icon: '👵',
  hook: 'Crowd control with physics. Infinite swarms of aggressive pigeons, one heavy handbag spinning in a continuous circle to swat them away.',
  how: 'Drag anywhere to walk. Your purse spins automatically. Pigeons drop <b>Yarn</b>.',
  bg: '#7cb85a', xpColor: '#e91e63', killWord: 'pigeons swatted',
  player: { r: 16, hp: 110, speed: 135, emoji: '👵', size: 38 },
  stats: { reach: 60, purses: 1, spin: 3.4, dmg: 18, kb: 260, brick: 0, crumbs: 0 },
  enemies: [
    { id: 'pigeon', emoji: '🐦', r: 11, hp: 12, speed: 70, dmg: 7, xp: 1, w: 10, faceLeft: true, color: '#90a4ae' },
    { id: 'dove', emoji: '🕊️', r: 12, hp: 18, speed: 88, dmg: 8, xp: 1, w: 5, from: 30, beh: 'zigzag', color: '#eceff1' },
    { id: 'duck', emoji: '🦆', r: 13, hp: 30, speed: 62, dmg: 11, xp: 2, w: 3, from: 70, beh: 'dash', color: '#8d6e63' },
    { id: 'turkey', emoji: '🦃', r: 18, hp: 100, speed: 38, dmg: 16, xp: 5, w: 2, from: 130, color: '#6d4c41' },
  ],
  upgrades: [
    { id: 'strap', name: 'Longer Purse Strap', icon: '📿', max: 6, desc: 'Purse orbit radius +15%', apply: (G) => { G.s.reach *= 1.15; } },
    { id: 'brick', name: 'Brick in the Purse', icon: '🧱', max: 5, desc: 'Purse damage +8 and knockback +35%', apply: (G) => { G.s.brick++; G.s.dmg += 8; G.s.kb *= 1.35; } },
    { id: 'crumbs', name: 'Throw Breadcrumbs', icon: '🍞', max: 5, desc: (l) => (l ? 'Crumbs thrown more often, lure a bigger area' : 'Toss crumbs that distract and group pigeons'), apply: (G) => { G.s.crumbs++; } },
    { id: 'twin', name: 'Second Handbag', icon: '👜', max: 3, desc: 'Add another spinning purse', apply: (G) => { G.s.purses++; } },
    { id: 'spin', name: 'Spin Class', icon: '🌪️', max: 5, desc: 'Purse spins 22% faster', apply: (G) => { G.s.spin *= 1.22; } },
  ],
  init(G) { G.decor = decor(10, ['🌳', '🌷', '🪑', '🌳', '🌼']); },
  update(G, dt) {
    const p = G.p, s = G.s;
    G.tm.pa = (G.tm.pa || 0) + s.spin * dt;
    for (let i = 0; i < s.purses; i++) {
      const a = G.tm.pa + i * TAU / s.purses;
      G.melee(p.x + Math.cos(a) * s.reach, p.y + Math.sin(a) * s.reach, 16 + s.brick * 1.5, s.dmg, s.kb, 0.3, 'purse' + i);
    }
    if (s.crumbs) G.every('crumbs', 4.5 - s.crumbs * 0.5, () => {
      const a = rand(0, TAU), d = rand(120, 190);
      const tx = Math.max(20, Math.min(G.w - 20, p.x + Math.cos(a) * d)), ty = Math.max(G.top + 20, Math.min(G.bot - 20, p.y + Math.sin(a) * d));
      G.lob({ x: p.x, y: p.y, tx, ty, time: 0.5, h: 50, r: 8, emoji: '🍞', size: 20,
        onExpire: () => G.zone({ x: tx, y: ty, r: 120 + s.crumbs * 25, life: 3 + s.crumbs * 0.6, lure: 2.5, seed: rand(0, 6), draw: crumbDraw }) });
    });
  },
  drawBg(ctx, G) {
    ctx.fillStyle = '#7cb85a'; ctx.fillRect(0, 0, G.w, G.h);
    ctx.strokeStyle = '#e6d3a3'; ctx.lineWidth = 46; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-20, G.h * 0.3); ctx.quadraticCurveTo(G.w * 0.5, G.h * 0.75, G.w + 20, G.h * 0.45); ctx.stroke();
    drawDecor(ctx, G, G.decor);
  },
  drawOver(ctx, G) {
    const p = G.p, s = G.s;
    for (let i = 0; i < s.purses; i++) {
      const a = G.tm.pa + i * TAU / s.purses, x = p.x + Math.cos(a) * s.reach, y = p.y + Math.sin(a) * s.reach;
      ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y - 4); ctx.lineTo(x, y); ctx.stroke();
      Horde.drawEmoji(ctx, '👜', x, y, 26 + s.brick * 2, false, a + Math.PI / 2);
    }
  },
});

/* =============================== 4. VAMPIRE GARLIC =============================== */
Horde.register({
  id: 'garlic', cat: CAT, name: 'Vampire Garlic', icon: '🧄',
  hook: 'Stay alive behind heavy, stinky armor. You are one clove of garlic. Your Stench Aura melts vampires, and the closer they get, the faster they melt.',
  how: 'Drag anywhere to roll. Your odor ring damages anything inside it. Vampires drop <b>Cloves</b>.',
  bg: '#1a1530', xpColor: '#f5f5dc', xpBar: '#c5e1a5', killWord: 'vampires melted',
  player: { r: 16, hp: 100, speed: 140, emoji: '🧄', size: 38 },
  stats: { ring: 70, dps: 24, juice: 0, peel: 0, slow: 0 },
  enemies: [
    { id: 'vamp', emoji: '🧛', r: 13, hp: 22, speed: 58, dmg: 10, xp: 1, w: 8, color: '#b71c1c' },
    { id: 'bat', emoji: '🦇', r: 10, hp: 10, speed: 105, dmg: 6, xp: 1, w: 6, from: 15, beh: 'zigzag', color: '#4a148c' },
    { id: 'ghoul', emoji: '🧟', r: 14, hp: 50, speed: 42, dmg: 14, xp: 3, w: 3, from: 60, color: '#558b2f' },
    { id: 'wolf', emoji: '🐺', r: 14, hp: 40, speed: 70, dmg: 12, xp: 3, w: 2, from: 100, beh: 'dash', color: '#757575' },
    { id: 'lord', emoji: '🦹', r: 16, hp: 130, speed: 50, dmg: 18, xp: 6, w: 1, from: 160, color: '#880e4f' },
  ],
  upgrades: [
    { id: 'ring', name: 'Expand Odor Ring', icon: '💨', max: 6, desc: 'Stench aura radius +16%', apply: (G) => { G.s.ring *= 1.16; } },
    { id: 'pungent', name: 'Extra Pungent', icon: '🤢', max: 5, desc: 'Stench damage +30%', apply: (G) => { G.s.dps *= 1.3; } },
    { id: 'juice', name: 'Garlic Juice Spray', icon: '💦', max: 5, desc: (l) => (l ? 'One more droplet, faster spray' : 'Spray piercing garlic juice at vampires'), apply: (G) => { G.s.juice++; } },
    { id: 'peel', name: 'Double Layer Peel', icon: '🛡️', max: 4, desc: (l) => (l ? '+1 peel layer, regrows faster' : 'Gain 2 peel shields that block hits and regrow'), apply: (G, l) => { G.s.peel = l + 1; G.p.shield = Math.min(G.p.shield + 1, G.s.peel); } },
    { id: 'cling', name: 'Clinging Fumes', icon: '🌫️', max: 3, desc: 'Vampires in the ring move 18% slower', apply: (G) => { G.s.slow += 0.18; } },
  ],
  init(G) { G.stars = Array.from({ length: 60 }, () => [Math.random(), Math.random(), rand(0.5, 1.8)]); },
  update(G, dt) {
    const p = G.p, s = G.s;
    G.aura(p.x, p.y, s.ring, s.dps, (e, d) => {
      if (s.slow) { e.slowT = 0.15; e.slowF = Math.min(e.slowF, 1 - s.slow); }
      return 1 + 1.6 * Math.max(0, 1 - d / s.ring);
    });
    if (s.juice) G.every('juice', 1.2 - s.juice * 0.1, () => {
      const e = G.nearest(p.x, p.y, 360); if (!e) return;
      const n = s.juice + 1, base = Math.atan2(e.y - p.y, e.x - p.x);
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * 0.16;
        G.shoot({ x: p.x, y: p.y, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, r: 5, dmg: 12 + s.juice * 3, pierce: 1, color: '#e6ee9c', life: 1.2 });
      }
      G.sfx('shoot');
    });
    if (s.peel) G.every('peel', 9 - s.peel, () => { if (p.shield < s.peel) { p.shield++; G.ring(p.x, p.y, p.r + 14, '#e6ee9c', 0.4); } });
  },
  drawBg(ctx, G) {
    ctx.fillStyle = '#1a1530'; ctx.fillRect(0, 0, G.w, G.h);
    ctx.fillStyle = '#fff';
    for (const [x, y, s] of G.stars) { ctx.globalAlpha = 0.3 + 0.3 * Math.sin(G.time * 2 + x * 50); ctx.fillRect(x * G.w, y * G.h, s, s); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff8e1'; ctx.beginPath(); ctx.arc(G.w - 60, G.top + 110, 26, 0, TAU); ctx.fill();
  },
  drawUnder(ctx, G) {
    const p = G.p, R = G.s.ring;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
    g.addColorStop(0, 'rgba(200,230,100,0.35)'); g.addColorStop(1, 'rgba(160,210,60,0.08)');
    ctx.fillStyle = g; ctx.strokeStyle = 'rgba(200,240,120,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const a = i / 48 * TAU, rr = R + Math.sin(a * 7 + G.time * 3) * 4;
      i ? ctx.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr) : ctx.moveTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr);
    }
    ctx.fill(); ctx.stroke();
  },
});

/* =============================== 5. SLIPPER THROWER =============================== */
Horde.register({
  id: 'slipper', cat: CAT, name: 'Slipper Thrower', icon: '🥿',
  hook: 'Relentless projectile tracking. Chaotic household clutter swarms you, and you hurl house slippers at it with perfect accuracy.',
  how: 'Drag anywhere to move. A slipper flies at the closest clutter every 0.4s. Collect <b>Gold Stars</b>.',
  bg: '#b98a5a', xpColor: '#ffd600', killWord: 'chores done',
  player: { r: 16, hp: 100, speed: 150, emoji: '🙋', size: 38 },
  stats: { rate: 0.4, count: 1, dmg: 13, bounce: 0, boot: 0 },
  enemies: [
    { id: 'sock', emoji: '🧦', r: 11, hp: 14, speed: 66, dmg: 7, xp: 1, w: 8, beh: 'zigzag', color: '#e91e63' },
    { id: 'teddy', emoji: '🧸', r: 13, hp: 24, speed: 54, dmg: 9, xp: 1, w: 7, color: '#a1887f' },
    { id: 'broom', emoji: '🧹', r: 13, hp: 24, speed: 60, dmg: 11, xp: 2, w: 4, from: 40, beh: 'dash', color: '#ffb74d' },
    { id: 'basket', emoji: '🧺', r: 16, hp: 70, speed: 38, dmg: 14, xp: 3, w: 3, from: 80, color: '#8d6e63' },
    { id: 'box', emoji: '📦', r: 18, hp: 120, speed: 30, dmg: 18, xp: 5, w: 2, from: 140, color: '#a1887f', kbRes: 0.5 },
  ],
  upgrades: [
    { id: 'extra', name: 'Extra Slipper', icon: '🥿', max: 4, desc: 'Throw one more slipper each volley', apply: (G) => { G.s.count++; } },
    { id: 'bounce', name: 'Bouncing Slippers', icon: '↩️', max: 4, desc: 'Slippers ricochet to another target and pierce', apply: (G) => { G.s.bounce++; } },
    { id: 'boot', name: 'Flying Boot', icon: '👢', max: 5, desc: (l) => (l ? 'Boot flies more often and crushes harder' : 'A giant boot periodically flattens a whole line of clutter'), apply: (G) => { G.s.boot++; } },
    { id: 'arm', name: 'Rapid Throw', icon: '💪', max: 5, desc: 'Throw 15% faster', apply: (G) => { G.s.rate *= 0.85; } },
    { id: 'sole', name: 'Heavy Soles', icon: '🦶', max: 5, desc: 'Slipper damage +30%', apply: (G) => { G.s.dmg *= 1.3; } },
  ],
  update(G, dt) {
    const p = G.p, s = G.s;
    G.every('throw', s.rate, () => {
      const t = G.nearestN(p.x, p.y, s.count, 500);
      if (!t.length) return;
      for (let i = 0; i < s.count; i++) {
        const e = t[i % t.length], a = Math.atan2(e.y - p.y, e.x - p.x) + (i >= t.length ? rand(-0.2, 0.2) : 0);
        G.shoot({ x: p.x, y: p.y, vx: Math.cos(a) * 500, vy: Math.sin(a) * 500, r: 7, dmg: s.dmg, ricochet: s.bounce, pierce: s.bounce, emoji: '🥿', size: 22, spin: 16, kb: 110 });
      }
      G.sfx('shoot');
    });
    if (s.boot) G.every('boot', Math.max(1.6, 4.2 - s.boot * 0.5), () => {
      const e = G.nearest(p.x, p.y); if (!e) return;
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      G.shoot({ x: p.x, y: p.y, vx: Math.cos(a) * 360, vy: Math.sin(a) * 360, r: 28, dmg: 40 + s.boot * 15, pierce: 999, kb: 380, emoji: '👢', size: 64, life: 3, quiet: true });
      G.sfx('power');
    });
  },
  drawBg(ctx, G) {
    ctx.fillStyle = '#b98a5a'; ctx.fillRect(0, 0, G.w, G.h);
    ctx.strokeStyle = 'rgba(90,55,25,0.35)'; ctx.lineWidth = 1;
    for (let y = 0, i = 0; y < G.h; y += 30, i++) {
      ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(G.w, y + 0.5); ctx.stroke();
      for (let x = (i % 3) * 70; x < G.w; x += 210) { ctx.beginPath(); ctx.moveTo(x + 0.5, y); ctx.lineTo(x + 0.5, y + 30); ctx.stroke(); }
    }
  },
});
})();
