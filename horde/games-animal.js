/* Category 3: Animal & Nature Madness (games 11–15) */
(() => {
'use strict';
const { rand, randInt, pick, TAU } = Horde.U;
const CAT = 'Animal & Nature';

const decor = (n, emojis) => Array.from({ length: n }, () => ({ fx: Math.random(), fy: Math.random(), e: pick(emojis), s: rand(18, 32) }));
const drawDecor = (ctx, G, list, alpha = 0.5) => {
  ctx.globalAlpha = alpha;
  for (const d of list) Horde.drawEmoji(ctx, d.e, d.fx * G.w, G.top + d.fy * (G.bot - G.top), d.s);
  ctx.globalAlpha = 1;
};

/* =============================== 11. CHICKEN APOCALYPSE =============================== */
const featherDraw = (ctx, b) => {
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 3.5, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(8, 0); ctx.stroke();
  ctx.restore();
};
Horde.register({
  id: 'chicken', cat: CAT, name: 'Chicken Apocalypse', icon: '🐔',
  hook: 'The classic bomber loop. You are a defenseless chicken running from foxes and wolves. You don\'t aim. You lay ticking explosive eggs behind you as you run.',
  how: 'Drag anywhere to run. An egg drops behind you every 0.8s and explodes 0.5s later. Lead the pack over your eggs! Collect <b>Corn</b>.',
  bg: '#9fbf5f', xpColor: '#ffca28', killWord: 'predators fried', overText: 'COOKED!',
  player: { r: 15, hp: 100, speed: 165, emoji: '🐔', size: 36, faceLeft: true },
  stats: { rate: 0.8, fuse: 0.5, R: 52, dmg: 32, spicy: 0, feathers: 0, eggs: 1 },
  enemies: [
    { id: 'fox', emoji: '🦊', r: 13, hp: 22, speed: 62, dmg: 10, xp: 1, w: 9, color: '#ff7043' },
    { id: 'hawk', emoji: '🦅', r: 13, hp: 24, speed: 58, dmg: 11, xp: 2, w: 4, from: 30, beh: 'dash', color: '#795548' },
    { id: 'wolf', emoji: '🐺', r: 15, hp: 50, speed: 60, dmg: 13, xp: 2, w: 4, from: 50, color: '#9e9e9e' },
    { id: 'coon', emoji: '🦝', r: 12, hp: 22, speed: 82, dmg: 9, xp: 1, w: 4, from: 80, beh: 'zigzag', color: '#757575' },
    { id: 'bear', emoji: '🐻', r: 18, hp: 130, speed: 40, dmg: 18, xp: 6, w: 2, from: 140, color: '#6d4c41', kbRes: 0.5 },
  ],
  upgrades: [
    { id: 'radius', name: 'Increase Explosion Radius', icon: '💥', max: 6, desc: 'Egg blast radius +16%', apply: (G) => { G.s.R *= 1.16; } },
    { id: 'spicy', name: 'Drop Spicy Eggs', icon: '🌶️', max: 5, desc: (l) => (l ? 'Hotter, longer fire pools' : 'Eggs leave a burning fire zone'), apply: (G) => { G.s.spicy++; } },
    { id: 'feather', name: 'Homing Feathers', icon: '🪶', max: 5, desc: (l) => (l ? 'One more feather per volley' : 'Shoot feathers that seek out enemies'), apply: (G) => { G.s.feathers++; } },
    { id: 'lay', name: 'Rapid Laying', icon: '🥚', max: 5, desc: 'Lay eggs 15% faster', apply: (G) => { G.s.rate *= 0.85; } },
    { id: 'yolk', name: 'Double Yolk', icon: '🍳', max: 2, desc: 'Drop an extra egg each time', apply: (G) => { G.s.eggs++; } },
    { id: 'tnt', name: 'Extra-Large Grade A', icon: '🧨', max: 5, desc: 'Egg damage +30%', apply: (G) => { G.s.dmg *= 1.3; } },
  ],
  init(G) { G.decor = decor(9, ['🌾', '🌾', '🌻', '🪨']); },
  update(G, dt) {
    const p = G.p, s = G.s;
    G.every('egg', s.rate, () => {
      for (let i = 0; i < s.eggs; i++) {
        const off = (i - (s.eggs - 1) / 2) * 18;
        const bx = p.x - Math.cos(p.ang) * (p.r + 6) - Math.sin(p.ang) * off, by = p.y - Math.sin(p.ang) * (p.r + 6) + Math.cos(p.ang) * off;
        G.shoot({ x: bx, y: by, noHit: true, life: s.fuse, fixedRot: true, rot: 0,
          draw: (ctx, b) => {
            const k = 1 - b.life / b.max;
            Horde.drawEmoji(ctx, '🥚', b.x, b.y, 18 + k * 6, false, Math.sin(G.time * 40) * 0.2 * k);
            if (Math.floor(k * 8) % 2) { ctx.fillStyle = 'rgba(255,60,0,0.35)'; ctx.beginPath(); ctx.arc(b.x, b.y, 10, 0, TAU); ctx.fill(); }
          },
          onExpire: (b) => {
            G.explode(b.x, b.y, s.R, s.dmg, '#ffb300', 280);
            if (s.spicy) G.zone({ x: b.x, y: b.y, r: s.R * 0.7, life: 1.5 + s.spicy * 0.5, dps: 10 + s.spicy * 9, draw: Horde.fireZoneDraw });
          } });
      }
    });
    if (s.feathers) G.every('feather', 1.1, () => {
      const e = G.nearest(p.x, p.y, 420); if (!e) return;
      for (let i = 0; i < s.feathers; i++) {
        const a = Math.atan2(e.y - p.y, e.x - p.x) + rand(-1.2, 1.2);
        G.shoot({ x: p.x, y: p.y, vx: Math.cos(a) * 330, vy: Math.sin(a) * 330, r: 6, dmg: 14 + s.feathers * 3, homing: 7, life: 2.4, kb: 60, draw: featherDraw });
      }
    });
  },
  drawBg(ctx, G) {
    ctx.fillStyle = '#9fbf5f'; ctx.fillRect(0, 0, G.w, G.h);
    ctx.fillStyle = 'rgba(230,200,120,0.35)';
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(((i * 173) % G.w), G.top + ((i * 311) % (G.bot - G.top)), 70, 40, i, 0, TAU); ctx.fill(); }
    drawDecor(ctx, G, G.decor);
  },
});

/* =============================== 12. CATNIP RUSH =============================== */
const vacuumDraw = (ctx, e, G) => {
  ctx.fillStyle = e.flash > 0 ? '#fff' : '#90a4ae'; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#37474f'; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 0.65, 0, TAU); ctx.fill();
  ctx.fillStyle = Math.floor(G.time * 3 + e.ph) % 2 ? '#ff1744' : '#00e676'; ctx.beginPath(); ctx.arc(e.x, e.y - e.r * 0.35, 2.5, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#cfd8dc'; ctx.lineWidth = 2;
  const a = G.time * 10;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(e.x + s * e.r * 0.8, e.y + e.r * 0.6); ctx.lineTo(e.x + s * e.r * 0.8 + Math.cos(a) * 6, e.y + e.r * 0.6 + Math.sin(a) * 6); ctx.stroke(); }
};
const postDraw = (ctx, z) => {
  ctx.globalAlpha = Math.min(1, z.life * 2);
  ctx.fillStyle = '#d7ccc8'; ctx.beginPath(); ctx.ellipse(z.x, z.y + 14, 22, 8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#a1887f'; ctx.fillRect(z.x - 9, z.y - 26, 18, 40);
  ctx.strokeStyle = '#6d4c41'; ctx.lineWidth = 1.5;
  for (let y = -22; y < 12; y += 5) { ctx.beginPath(); ctx.moveTo(z.x - 9, z.y + y); ctx.lineTo(z.x + 9, z.y + y + 3); ctx.stroke(); }
  ctx.fillStyle = '#8d6e63'; ctx.fillRect(z.x - 14, z.y - 30, 28, 6);
  ctx.globalAlpha = 1;
};
Horde.register({
  id: 'cat', cat: CAT, name: 'Catnip Rush', icon: '🐱',
  hook: 'Zoom around a chaotic living room. Toy mice and robot vacuums swarm, and your claws swipe at anything that gets into your personal space.',
  how: 'Drag anywhere to pounce around. Claw Swipe hits the closest enemy every 0.5s. Collect <b>Fish Treats</b>.',
  bg: '#8d5f6b', xpColor: '#4fc3f7', killWord: 'toys destroyed',
  player: { r: 15, hp: 100, speed: 170, emoji: '🐱', size: 36 },
  stats: { swipe: 0.5, reach: 74, dmg: 22, arc: 30, yarn: 0, hiss: 0, post: 0 },
  enemies: [
    { id: 'mouse', emoji: '🐭', r: 10, hp: 12, speed: 82, dmg: 7, xp: 1, w: 9, beh: 'zigzag', color: '#bdbdbd' },
    { id: 'rat', emoji: '🐁', r: 10, hp: 14, speed: 100, dmg: 7, xp: 1, w: 5, from: 20, color: '#9e9e9e' },
    { id: 'vac', r: 17, hp: 70, speed: 40, dmg: 14, xp: 3, w: 3, from: 40, kbRes: 0.5, color: '#90a4ae', draw: vacuumDraw },
    { id: 'robot', emoji: '🤖', r: 14, hp: 40, speed: 55, dmg: 12, xp: 2, w: 3, from: 75, beh: 'orbit', color: '#78909c' },
    { id: 'dog', emoji: '🐶', r: 15, hp: 60, speed: 66, dmg: 15, xp: 4, w: 2, from: 120, beh: 'dash', color: '#a1887f' },
  ],
  upgrades: [
    { id: 'fast', name: 'Faster Swipes', icon: '🐾', max: 5, desc: 'Swipe 18% more often', apply: (G) => { G.s.swipe *= 0.82; } },
    { id: 'claws', name: 'Sharper Claws', icon: '🔪', max: 5, desc: 'Swipe damage +30% and wider arc', apply: (G) => { G.s.dmg *= 1.3; G.s.arc += 5; G.s.reach += 6; } },
    { id: 'yarn', name: 'Spinning Yarn', icon: '🧶', max: 5, desc: (l) => (l ? 'Yarn rolls more often and hits harder' : 'Drop a bouncing ball of yarn that rolls through enemies'), apply: (G) => { G.s.yarn++; } },
    { id: 'hiss', name: 'Hiss Aura', icon: '😾', max: 5, desc: (l) => (l ? 'Bigger, angrier hiss' : 'Periodically hiss, knocking everything back'), apply: (G) => { G.s.hiss++; } },
    { id: 'post', name: 'Scratching Post', icon: '🪵', max: 4, desc: (l) => (l ? 'Posts last longer and hurt more' : 'Place barricade posts that block and damage enemies'), apply: (G) => { G.s.post++; } },
  ],
  update(G, dt) {
    const p = G.p, s = G.s;
    G.every('swipe', s.swipe, () => {
      const e = G.nearest(p.x, p.y, s.reach + 20); if (!e) return;
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      const cx = p.x + Math.cos(a) * Math.min(s.reach * 0.7, Math.hypot(e.x - p.x, e.y - p.y)), cy = p.y + Math.sin(a) * Math.min(s.reach * 0.7, Math.hypot(e.x - p.x, e.y - p.y));
      G.query(cx, cy, s.arc, (o) => G.damage(o, s.dmg, 170, a));
      G.fxDraw(0.18, (ctx, k) => {
        ctx.strokeStyle = 'rgba(255,255,255,' + k + ')'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath(); ctx.arc(cx - Math.cos(a) * 14, cy - Math.sin(a) * 14, s.arc * 0.9, a - 0.9 + i * 0.12, a + 0.9 + i * 0.12 - (1 - k) * 1.2); ctx.stroke();
        }
      });
      G.sfx('hit');
    });
    if (s.yarn) G.every('yarn', Math.max(1, 2.8 - s.yarn * 0.35), () => {
      const a = rand(0, TAU);
      G.shoot({ x: p.x, y: p.y, vx: Math.cos(a) * 270, vy: Math.sin(a) * 270, r: 11, dmg: 12 + s.yarn * 5, pierce: 999, rehit: 0.5, bounce: true, life: 3.5 + s.yarn * 0.4, emoji: '🧶', size: 26, spin: 7, kb: 140 });
    });
    if (s.hiss) G.every('hiss', Math.max(1.8, 3.6 - s.hiss * 0.3), () => {
      const R = 80 + s.hiss * 18;
      G.query(p.x, p.y, R, (e) => G.damage(e, 6 + s.hiss * 6, 560, Math.atan2(e.y - p.y, e.x - p.x), true));
      G.ring(p.x, p.y, R, '#f48fb1', 0.4, 10, 4);
      G.float(p.x, p.y - 30, 'HSSS!', '#f8bbd0', 16, 0.6);
    });
    if (s.post) G.every('post', Math.max(5, 9 - s.post), () => {
      G.zone({ x: p.x, y: p.y, r: 24, block: 16, life: 7 + s.post * 2, dps: 18 + s.post * 10, draw: postDraw });
    });
  },
  drawBg(ctx, G) {
    ctx.fillStyle = '#8d5f6b'; ctx.fillRect(0, 0, G.w, G.h);
    const cx = G.w / 2, cy = (G.top + G.bot) / 2;
    for (let i = 4; i >= 1; i--) {
      ctx.fillStyle = i % 2 ? '#c99aa4' : '#a87580';
      ctx.beginPath(); ctx.ellipse(cx, cy, G.w * 0.11 * i, (G.bot - G.top) * 0.09 * i, 0, 0, TAU); ctx.fill();
    }
  },
});

/* =============================== 13. BEE HIVE HERO =============================== */
const stingDraw = (ctx, b) => {
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot);
  ctx.fillStyle = b.mega ? '#ff6f00' : '#212121';
  ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, -2.5); ctx.lineTo(-6, 2.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd600'; ctx.fillRect(-6, -1.5, 3, 3);
  ctx.restore();
};
const honeyDraw = (ctx, z, G) => {
  ctx.globalAlpha = Math.min(1, z.life) * 0.75;
  ctx.fillStyle = '#ffb300';
  ctx.beginPath();
  for (let i = 0; i <= 12; i++) { const a = i / 12 * TAU, r = z.r * (0.85 + 0.15 * Math.sin(a * 3 + z.seed)); i ? ctx.lineTo(z.x + Math.cos(a) * r, z.y + Math.sin(a) * r) : ctx.moveTo(z.x + Math.cos(a) * r, z.y + Math.sin(a) * r); }
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(z.x - z.r * 0.3, z.y - z.r * 0.3, z.r * 0.2, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
};
function placePot(G) { G.pot = { x: G.w / 2, y: (G.top + G.bot) / 2 + 10, r: 24 }; }
Horde.register({
  id: 'bee', cat: CAT, name: 'Bee Hive Hero', icon: '🐝',
  hook: 'Tower defense on the move. Hungry bears swarm in to steal the honey pot, and you fly circles around it shooting rapid-fire stingers.',
  how: 'Drag anywhere to fly. Stingers fire at the nearest bear. Bears go for the <b>honey pot</b>: if its health runs out, you lose. Collect <b>Pollen</b>.',
  bg: '#9ccc65', xpColor: '#fff176', killWord: 'bears stung', overText: 'HONEY STOLEN!', noContact: true,
  player: { r: 12, hp: 120, speed: 175, emoji: '🐝', size: 30, faceLeft: true },
  hpAt: (G) => G.pot,
  genericNames: { vit: { name: 'Reinforce Pot', icon: '🍯', desc: '+20 max pot HP and repair 20' }, reg: { name: 'Royal Jelly', icon: '👑', desc: 'Pot repairs 0.6 HP per second' } },
  stats: { rate: 0.32, dmg: 11, multi: 1, pierce: 0, workers: 0, honey: 0 },
  enemies: [
    { id: 'bear', emoji: '🐻', r: 15, hp: 30, speed: 44, dmg: 8, xp: 1, w: 9, color: '#795548' },
    { id: 'badger', emoji: '🦡', r: 12, hp: 18, speed: 74, dmg: 6, xp: 1, w: 5, from: 20, beh: 'zigzag', color: '#616161' },
    { id: 'coon', emoji: '🦝', r: 12, hp: 24, speed: 62, dmg: 7, xp: 2, w: 4, from: 45, beh: 'dash', color: '#757575' },
    { id: 'panda', emoji: '🐼', r: 17, hp: 85, speed: 34, dmg: 12, xp: 4, w: 2, from: 90, color: '#eeeeee', kbRes: 0.6 },
    { id: 'gorilla', emoji: '🦍', r: 18, hp: 160, speed: 36, dmg: 16, xp: 6, w: 1, from: 150, color: '#424242', kbRes: 0.4 },
  ],
  upgrades: [
    { id: 'workers', name: 'Spawn Worker Bees', icon: '🐝', max: 4, desc: 'A worker bee orbits the pot and fires stingers', apply: (G) => { G.s.workers++; } },
    { id: 'honey', name: 'Honey Puddles', icon: '🍯', max: 4, desc: (l) => (l ? 'More, bigger honey puddles' : 'Sticky honey puddles around the pot slow bears'), apply: (G) => { G.s.honey++; } },
    { id: 'multi', name: 'Multi-Stinger Burst', icon: '🎯', max: 4, desc: 'Fire one more stinger per shot', apply: (G) => { G.s.multi++; } },
    { id: 'mega', name: 'Piercing Mega-Stingers', icon: '📌', max: 4, desc: 'Stingers pierce +1 and deal +25% damage', apply: (G) => { G.s.pierce++; G.s.dmg *= 1.25; } },
    { id: 'buzz', name: 'Buzz Frenzy', icon: '⚡', max: 5, desc: 'Fire 15% faster', apply: (G) => { G.s.rate *= 0.85; } },
  ],
  init(G) { placePot(G); G.p.y = G.pot.y - 80; G.decor = decor(12, ['🌼', '🌸', '🌷', '🌻']); },
  onResize(G) { placePot(G); },
  enemyTarget: (G) => G.pot,
  update(G, dt) {
    const p = G.p, s = G.s, pot = G.pot;
    G.query(pot.x, pot.y, pot.r, (e) => {
      const a = Math.atan2(e.y - pot.y, e.x - pot.x);
      if ((e.bite || 0) <= G.time) {
        e.bite = G.time + 1; G.hurt(e.dmg, true);
        G.float(pot.x, pot.y - 30, '-' + Math.round(e.dmg), '#ff5252', 14);
      }
      e.kx += Math.cos(a) * 160; e.ky += Math.sin(a) * 160;
    });
    G.every('sting', s.rate, () => {
      const e = G.nearest(p.x, p.y, 400); if (!e) return;
      const base = Math.atan2(e.y - p.y, e.x - p.x);
      for (let i = 0; i < s.multi; i++) {
        const a = base + (i - (s.multi - 1) / 2) * 0.13;
        G.shoot({ x: p.x, y: p.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, r: 4, dmg: s.dmg, pierce: s.pierce, kb: 70, life: 1, mega: s.pierce > 0, draw: stingDraw });
      }
    });
    if (s.workers) {
      G.tm.wa = (G.tm.wa || 0) + dt * 1.6;
      for (let i = 0; i < s.workers; i++) {
        const a = G.tm.wa + i * TAU / s.workers, wx = pot.x + Math.cos(a) * 62, wy = pot.y + Math.sin(a) * 62;
        G.every('wk' + i, 0.9, () => {
          const e = G.nearest(wx, wy, 260); if (!e) return;
          const b = Math.atan2(e.y - wy, e.x - wx);
          G.shoot({ x: wx, y: wy, vx: Math.cos(b) * 480, vy: Math.sin(b) * 480, r: 4, dmg: s.dmg * 0.8, pierce: s.pierce, kb: 50, life: 0.9, draw: stingDraw });
        });
      }
    }
    if (s.honey) G.every('honey', Math.max(1.5, 4.5 - s.honey * 0.7), () => {
      const a = rand(0, TAU), d = rand(60, 150);
      G.zone({ x: pot.x + Math.cos(a) * d, y: pot.y + Math.sin(a) * d, r: 30 + s.honey * 7, life: 7, slow: 0.55 + s.honey * 0.05, seed: rand(0, 6), draw: honeyDraw });
    });
  },
  drawBg(ctx, G) { ctx.fillStyle = '#9ccc65'; ctx.fillRect(0, 0, G.w, G.h); drawDecor(ctx, G, G.decor, 0.6); },
  drawUnder(ctx, G) {
    const pot = G.pot;
    ctx.fillStyle = 'rgba(255,193,7,0.18)'; ctx.beginPath(); ctx.arc(pot.x, pot.y, 52, 0, TAU); ctx.fill();
    Horde.drawEmoji(ctx, '🍯', pot.x, pot.y, 50);
  },
  drawOver(ctx, G) {
    if (!G.s.workers) return;
    for (let i = 0; i < G.s.workers; i++) {
      const a = G.tm.wa + i * TAU / G.s.workers;
      Horde.drawEmoji(ctx, '🐝', G.pot.x + Math.cos(a) * 62, G.pot.y + Math.sin(a) * 62, 20);
    }
  },
});

/* =============================== 14. FROG HOP =============================== */
const flyDraw = (ctx, e, G) => {
  const w = Math.sin(G.time * 50 + e.ph) * 3;
  ctx.fillStyle = 'rgba(220,240,255,0.7)';
  ctx.beginPath(); ctx.ellipse(e.x - 3, e.y - 3, 4, 2 + w * 0.3, -0.6, 0, TAU); ctx.ellipse(e.x + 3, e.y - 3, 4, 2 + w * 0.3, 0.6, 0, TAU); ctx.fill();
  ctx.fillStyle = e.flash > 0 ? '#fff' : '#212121'; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 0.75, 0, TAU); ctx.fill();
  ctx.fillStyle = '#d32f2f'; ctx.fillRect(e.x - 3, e.y - 3, 2, 2); ctx.fillRect(e.x + 1, e.y - 3, 2, 2);
};
Horde.register({
  id: 'frog', cat: CAT, name: 'Frog Hop', icon: '🐸',
  hook: 'Ultra-fast target snapping. Massive clouds of flies fill the pond, and your tongue snaps out instantly to grab the closest bug.',
  how: 'Drag anywhere to hop around. Your tongue strikes the nearest fly every 0.3s and pulls in the <b>XP</b> for you.',
  bg: '#2f6f95', xpColor: '#b9f6ca', killWord: 'bugs gulped', autoMagnet: true,
  player: { r: 15, hp: 100, speed: 150, emoji: '🐸', size: 38 },
  spawn: { base: 1.8, cap: 320, max: 20, waveText: 'SWARM INCOMING!' },
  noGeneric: ['mag'],
  stats: { rate: 0.3, tongues: 1, range: 150, dmg: 30, croak: 0, slime: 0 },
  enemies: [
    { id: 'fly', r: 7, hp: 8, speed: 88, dmg: 6, xp: 1, w: 12, beh: 'zigzag', color: '#424242', draw: flyDraw },
    { id: 'mosq', emoji: '🦟', r: 9, hp: 14, speed: 82, dmg: 7, xp: 1, w: 6, from: 15, beh: 'zigzag', color: '#6d4c41' },
    { id: 'wasp', emoji: '🐝', r: 11, hp: 26, speed: 66, dmg: 11, xp: 2, w: 4, from: 50, beh: 'dash', color: '#fdd835' },
    { id: 'moth', emoji: '🦋', r: 13, hp: 45, speed: 55, dmg: 12, xp: 3, w: 3, from: 90, beh: 'orbit', color: '#4fc3f7' },
    { id: 'beetle', emoji: '🐞', r: 14, hp: 110, speed: 40, dmg: 16, xp: 5, w: 2, from: 140, color: '#e53935', kbRes: 0.4 },
  ],
  upgrades: [
    { id: 'triple', name: 'Triple Tongue', icon: '👅', max: 3, desc: 'Tongue strikes 2 more targets at once', apply: (G) => { G.s.tongues += 2; } },
    { id: 'croak', name: 'Croak Shockwave', icon: '📢', max: 5, desc: (l) => (l ? 'Louder, wider croak' : 'Periodic croak blasts nearby bugs back'), apply: (G) => { G.s.croak++; } },
    { id: 'slime', name: 'Sticky Slime Trail', icon: '🟢', max: 4, desc: (l) => (l ? 'Stickier, longer trail' : 'Leave slime that slows and stings bugs'), apply: (G) => { G.s.slime++; } },
    { id: 'long', name: 'Long Tongue', icon: '📏', max: 5, desc: 'Tongue range +18%', apply: (G) => { G.s.range *= 1.18; } },
    { id: 'quick', name: 'Quick Tongue', icon: '⚡', max: 5, desc: 'Strike 15% faster', apply: (G) => { G.s.rate *= 0.85; } },
    { id: 'strong', name: 'Strong Jaw', icon: '💪', max: 5, desc: 'Tongue damage +35%', apply: (G) => { G.s.dmg *= 1.35; } },
  ],
  init(G) { G.pads = Array.from({ length: 9 }, () => ({ fx: Math.random(), fy: Math.random(), r: rand(22, 40), a: rand(0, TAU) })); },
  update(G, dt) {
    const p = G.p, s = G.s;
    G.every('tongue', s.rate, () => {
      const t = G.nearestN(p.x, p.y, s.tongues, s.range);
      for (const e of t) {
        G.damage(e, s.dmg, 0, 0, true);
        const ex = e.x, ey = e.y;
        G.fxDraw(0.14, (ctx, k) => {
          const m = Math.sin(k * Math.PI);
          const tx = p.x + (ex - p.x) * m, ty = p.y + (ey - p.y) * m;
          ctx.strokeStyle = '#ff6f91'; ctx.lineWidth = 4; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(p.x, p.y + 4); ctx.lineTo(tx, ty); ctx.stroke();
          ctx.fillStyle = '#ff4f7b'; ctx.beginPath(); ctx.arc(tx, ty, 5, 0, TAU); ctx.fill();
        });
      }
      if (t.length) G.sfx('hit');
    });
    if (s.croak) G.every('croak', Math.max(1.6, 3.4 - s.croak * 0.3), () => {
      const R = 80 + s.croak * 24;
      G.query(p.x, p.y, R, (e) => G.damage(e, 6 + s.croak * 6, 560, Math.atan2(e.y - p.y, e.x - p.x), true));
      G.ring(p.x, p.y, R, '#c5e1a5', 0.45, 15, 5);
      G.float(p.x, p.y - 30, 'CROAK!', '#dcedc8', 15, 0.6);
    });
    if (s.slime) G.every('slime', 0.13, () => {
      if (!p.moving) return;
      G.zone({ x: p.x, y: p.y, r: 15 + s.slime * 3, life: 2 + s.slime * 0.6, slow: 0.4 + s.slime * 0.1, dps: 4 + s.slime * 4, color: '#b2ff59', alpha: 0.3 });
    });
  },
  drawBg(ctx, G) {
    ctx.fillStyle = '#2f6f95'; ctx.fillRect(0, 0, G.w, G.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const r = ((G.time * 14 + i * 40) % 160);
      ctx.beginPath(); ctx.arc(((i * 197) % G.w), G.top + ((i * 263) % (G.bot - G.top)), r, 0, TAU); ctx.stroke();
    }
    for (const d of G.pads) {
      const x = d.fx * G.w, y = G.top + d.fy * (G.bot - G.top);
      ctx.fillStyle = '#4c8c3a'; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, d.r, d.a + 0.35, d.a + TAU - 0.35); ctx.closePath(); ctx.fill();
    }
  },
});

/* =============================== 15. SQUIRREL NUTS =============================== */
const walnutDraw = (ctx, b, G) => {
  const k = b.lob ? 0 : 1 - b.life / b.max;
  const y = b.y - (b.z || 0);
  if (b.lob) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(b.x, b.y, 12, 5, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = Math.floor(k * 10) % 2 ? '#ff7043' : '#8d6e63';
  ctx.beginPath(); ctx.arc(b.x, y, 11 + k * 4, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(b.x, y - 10); ctx.quadraticCurveTo(b.x + 4, y, b.x, y + 10); ctx.stroke();
};
Horde.register({
  id: 'squirrel', cat: CAT, name: 'Squirrel Nuts', icon: '🐿️',
  hook: 'Heavy physics artillery. Owls dive-bomb you in the forest while you fling acorns in high arcs that burst into splinter shards on landing.',
  how: 'Drag anywhere to scurry. Acorns are lobbed at the nearest owl automatically. Watch for owls flashing red before they dive!',
  bg: '#4e6b34', xpColor: '#ffb74d', killWord: 'owls bonked',
  player: { r: 15, hp: 100, speed: 160, emoji: '🐿️', size: 36, faceLeft: true },
  stats: { rate: 1, count: 1, R: 42, dmg: 26, walnut: 0, bark: 0, gold: 0 },
  enemies: [
    { id: 'owl', emoji: '🦉', r: 13, hp: 20, speed: 55, dmg: 10, xp: 1, w: 9, beh: 'dash', color: '#8d6e63' },
    { id: 'snake', emoji: '🐍', r: 13, hp: 24, speed: 60, dmg: 10, xp: 1, w: 5, from: 25, beh: 'zigzag', color: '#7cb342' },
    { id: 'bat', emoji: '🦇', r: 10, hp: 12, speed: 98, dmg: 7, xp: 1, w: 5, from: 45, beh: 'zigzag', color: '#5e35b1' },
    { id: 'hog', emoji: '🦔', r: 13, hp: 60, speed: 38, dmg: 13, xp: 3, w: 3, from: 80, color: '#a1887f' },
    { id: 'boar', emoji: '🐗', r: 17, hp: 120, speed: 44, dmg: 17, xp: 5, w: 2, from: 140, beh: 'dash', color: '#6d4c41', kbRes: 0.5 },
  ],
  upgrades: [
    { id: 'double', name: 'Double Acorns', icon: '🌰', max: 3, desc: 'Throw one more acorn each volley', apply: (G) => { G.s.count++; } },
    { id: 'walnut', name: 'Walnut Bomb', icon: '💣', max: 5, desc: (l) => (l ? 'Bigger, more frequent walnut bombs' : 'Lob a huge walnut that explodes after a delay'), apply: (G) => { G.s.walnut++; } },
    { id: 'bark', name: 'Bark Shield', icon: '🛡️', max: 3, desc: (l) => (l ? 'Bark regrows faster' : 'Gain a bark shield that absorbs 3 hits and regrows'), apply: (G, l) => { if (l === 1) G.p.shield = 3; } },
    { id: 'gold', name: 'Golden Acorns', icon: '✨', max: 4, desc: 'Acorn damage +40%', apply: (G) => { G.s.gold++; G.s.dmg *= 1.4; } },
    { id: 'blast', name: 'Splinter Blast', icon: '💥', max: 5, desc: 'Acorn explosion radius +15%', apply: (G) => { G.s.R *= 1.15; } },
    { id: 'arm', name: 'Strong Arm', icon: '💪', max: 5, desc: 'Throw 15% faster', apply: (G) => { G.s.rate *= 0.85; } },
  ],
  init(G) { G.decor = decor(10, ['🌲', '🌳', '🍂', '🍄', '🌲']); },
  update(G, dt) {
    const p = G.p, s = G.s, bark = G.up.bark || 0;
    G.every('acorn', s.rate, () => {
      const t = G.nearestN(p.x, p.y, s.count, 380);
      t.forEach((e) => {
        const gold = s.gold > 0;
        G.lob({ x: p.x, y: p.y, tx: e.x + e.kx * 0.1, ty: e.y + e.ky * 0.1, time: 0.5, h: 70, r: 8, emoji: '🌰', size: gold ? 24 : 20,
          onExpire: (b) => {
            G.explode(b.x, b.y, s.R, s.dmg, gold ? '#ffd54f' : '#bcaaa4', 220);
            for (let i = 0; i < 5; i++) {
              const a = rand(0, TAU);
              G.shoot({ x: b.x, y: b.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, r: 3, dmg: 6, life: 0.3, color: '#d7ccc8', kb: 30 });
            }
          } });
      });
    });
    if (s.walnut) G.every('walnut', Math.max(2.5, 6 - s.walnut * 0.7), () => {
      const e = G.randomEnemy(p.x, p.y, 300); if (!e) return;
      const R = 100 + s.walnut * 16, dmg = 70 + s.walnut * 25;
      G.lob({ x: p.x, y: p.y, tx: e.x, ty: e.y, time: 0.7, h: 90, r: 11, draw: walnutDraw,
        onExpire: (b) => G.shoot({ x: b.x, y: b.y, noHit: true, life: 1, draw: (ctx, q) => {
          walnutDraw(ctx, q, G);
          ctx.strokeStyle = 'rgba(255,80,40,0.5)'; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(q.x, q.y, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        }, onExpire: (q) => G.explode(q.x, q.y, R, dmg, '#ff7043', 400) }) });
    });
    if (bark) G.every('bark', 12 - bark * 2.5, () => { if (p.shield < 3) { p.shield++; G.ring(p.x, p.y, p.r + 16, '#a1887f', 0.4); } });
  },
  drawBg(ctx, G) {
    ctx.fillStyle = '#4e6b34'; ctx.fillRect(0, 0, G.w, G.h);
    ctx.fillStyle = 'rgba(120,85,45,0.35)';
    for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(((i * 151) % G.w), G.top + ((i * 271) % (G.bot - G.top)), 60, 34, i, 0, TAU); ctx.fill(); }
    drawDecor(ctx, G, G.decor, 0.55);
  },
});
})();
