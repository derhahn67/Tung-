/* Category 4: Clickers & Simple Math Loops (games 16–20) */
(() => {
'use strict';
const { rand, randInt, pick, clamp, TAU, angDiff } = Horde.U;
const CAT = 'Math & Luck';

/* =============================== 16. NUMBER SMASHER =============================== */
const numDraw = (ctx, e) => {
  const hue = (140 - Math.min(e.hp, 60) * 2.3 + 360) % 360;
  ctx.fillStyle = e.flash > 0 ? '#fff' : 'hsl(' + hue + ',75%,58%)';
  ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = 'bold ' + Math.max(11, Math.min(22, e.r)) + 'px system-ui,sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1b1b2f';
  ctx.fillText(String(Math.ceil(e.hp)), e.x, e.y + 1);
};
const minusDraw = (ctx, b) => {
  ctx.save(); ctx.translate(b.x, b.y);
  ctx.fillStyle = b.slow ? '#00b8d4' : '#283593';
  ctx.fillRect(-6, -2.5, 12, 5);
  if (b.dmg > 1.5) { ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center'; ctx.fillText(String(Math.round(b.dmg)), 0, -7); }
  ctx.restore();
};
const numInit = (e, G) => { e.xp = 1 + Math.floor(e.maxHp / 8); };
Horde.register({
  id: 'numbers', cat: CAT, name: 'Number Smasher', icon: '🔢',
  hook: 'Quick, satisfying dopamine. You are a circle with a number. Bigger numbers swarm you. Shoot minus signs to subtract them down to zero and pop them.',
  how: 'Drag anywhere to move. Each minus sign subtracts 1. Your own number is your health, so don\'t let it hit 0!',
  bg: '#f6f3ea', xpColor: '#3949ab', killWord: 'numbers zeroed', noHpBar: true, overText: 'DIVIDED BY ZERO!',
  player: { r: 18, hp: 40, speed: 150 },
  noGeneric: ['dmg'],
  genericNames: { vit: { name: 'Bigger Number', icon: '➕', desc: '+20 to your max value and heal 20' } },
  enemyHp: (G) => { const t = G.time; return randInt(1 + Math.floor(t / 20), Math.floor(Math.min(50, 6 + t / 6) + Math.max(0, (t - 240) / 4))); },
  stats: { rate: 0.15, multi: 1, pierce: 0, dmg: 1, freeze: 0, divide: 0, shot: 440 },
  enemies: [
    { id: 'n', r: 12, hp: 1, speed: 52, dmg: 3, xp: 1, w: 10, color: '#7986cb', draw: numDraw, init: numInit },
    { id: 'fast', r: 12, hp: 1, speed: 80, dmg: 3, xp: 1, w: 4, from: 30, beh: 'zigzag', color: '#4db6ac', draw: numDraw, init: numInit },
    { id: 'dash', r: 12, hp: 1, speed: 58, dmg: 3, xp: 1, w: 3, from: 70, beh: 'dash', color: '#ff8a65', draw: numDraw, init: numInit },
  ],
  upgrades: [
    { id: 'multi', name: 'Multi-Shot', icon: '🔱', max: 4, desc: 'Fire one more minus sign per shot', apply: (G) => { G.s.multi++; } },
    { id: 'pierce', name: 'Piercing Projectiles', icon: '➖', max: 4, desc: 'Minus signs pass through one more number', apply: (G) => { G.s.pierce++; } },
    { id: 'speed', name: 'Speed Buff', icon: '⚡', max: 5, desc: 'Move 10% faster and fire 10% faster', apply: (G) => { G.p.speed *= 1.1; G.s.rate /= 1.1; } },
    { id: 'two', name: 'Minus Two', icon: '2️⃣', max: 4, desc: 'Each hit subtracts 1 more', apply: (G) => { G.s.dmg += 1; } },
    { id: 'freeze', name: 'Freezing Decimals', icon: '❄️', max: 3, desc: 'Hits slow numbers down', apply: (G) => { G.s.freeze++; } },
    { id: 'divide', name: 'Dividing Barrier', icon: '➗', max: 4, desc: (l) => (l ? 'Wider, more frequent division' : 'Every 6s, halve every number near you'), apply: (G) => { G.s.divide++; } },
  ],
  update(G, dt) {
    const p = G.p, s = G.s;
    for (const e of G.enemies) { e.r = (9 + Math.sqrt(Math.max(1, e.hp)) * 2.2) * (e.elite ? 1.4 : 1); e.dmg = 2 + Math.ceil(e.hp / 8); }
    G.every('fire', s.rate, () => {
      const e = G.nearest(p.x, p.y, 460); if (!e) return;
      const base = Math.atan2(e.y - p.y, e.x - p.x);
      for (let i = 0; i < s.multi; i++) {
        const a = base + (i - (s.multi - 1) / 2) * 0.14;
        G.shoot({ x: p.x, y: p.y, vx: Math.cos(a) * s.shot, vy: Math.sin(a) * s.shot, r: 5, dmg: s.dmg / G.dmgMul, pierce: s.pierce, kb: 50, life: 1.3,
          slow: s.freeze ? 0.2 + s.freeze * 0.12 : 0, slowT: 1, fixedRot: true, draw: minusDraw });
      }
    });
    if (s.divide) G.every('divide', Math.max(3, 6.5 - s.divide * 0.8), () => {
      const R = 100 + s.divide * 25;
      G.query(p.x, p.y, R, (e) => {
        e.hp = Math.floor(e.hp / 2); e.flash = 0.15;
        if (e.hp < 1) G.kill(e);
      });
      G.ring(p.x, p.y, R, '#5c6bc0', 0.5, 10, 4);
      G.float(p.x, p.y - 34, '÷2', '#3949ab', 22, 0.7);
      G.sfx('power');
    });
  },
  drawBg(ctx, G) {
    ctx.fillStyle = '#f6f3ea'; ctx.fillRect(0, 0, G.w, G.h);
    ctx.strokeStyle = 'rgba(66,133,244,0.18)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0; x < G.w; x += 22) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, G.h); }
    for (let y = 0; y < G.h; y += 22) { ctx.moveTo(0, y + 0.5); ctx.lineTo(G.w, y + 0.5); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(229,57,53,0.3)'; ctx.beginPath(); ctx.moveTo(40.5, 0); ctx.lineTo(40.5, G.h); ctx.stroke();
  },
  player: {
    draw(ctx, G, p) {
      ctx.fillStyle = '#283593'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#7986cb'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 3, -Math.PI / 2, -Math.PI / 2 + TAU * p.hp / p.maxHp); ctx.stroke();
      ctx.font = 'bold 16px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
      ctx.fillText(String(Math.ceil(p.hp)), p.x, p.y + 1);
    },
  },
});

/* =============================== 17. MAGNET RUN =============================== */
Horde.register({
  id: 'magnet', cat: CAT, name: 'Magnet Run', icon: '🧲',
  hook: 'Satisfying vacuum physics. You are a horseshoe magnet. Scrap-metal monsters chase you, and your magnetic pulse pulls in coins while it repels and crushes enemies.',
  how: 'Drag anywhere to move. A Repel Pulse fires every second. Your huge magnetic field pulls <b>coins</b> in from far away.',
  bg: '#4a4744', grid: 'rgba(0,0,0,0.12)', gridSize: 48, xpColor: '#ffd54f', killWord: 'scrap crushed',
  player: { r: 15, hp: 100, speed: 150, magnet: 150 },
  stats: { rate: 1, R: 85, dmg: 14, arcs: 0, shards: 0 },
  enemies: [
    { id: 'bot', emoji: '🤖', r: 13, hp: 20, speed: 55, dmg: 10, xp: 1, w: 9, color: '#90a4ae' },
    { id: 'gear', emoji: '⚙️', r: 12, hp: 16, speed: 76, dmg: 8, xp: 1, w: 6, from: 15, beh: 'zigzag', color: '#b0bec5' },
    { id: 'wrench', emoji: '🔧', r: 11, hp: 16, speed: 70, dmg: 10, xp: 1, w: 4, from: 40, beh: 'dash', color: '#78909c' },
    { id: 'drum', emoji: '🛢️', r: 16, hp: 80, speed: 36, dmg: 14, xp: 4, w: 3, from: 80, color: '#1565c0', kbRes: 0.5 },
    { id: 'car', emoji: '🚗', r: 18, hp: 140, speed: 44, dmg: 18, xp: 6, w: 2, from: 140, beh: 'dash', color: '#e53935', kbRes: 0.4, faceLeft: true },
  ],
  upgrades: [
    { id: 'radius', name: 'Increase Repel Radius', icon: '🌀', max: 6, desc: 'Repel Pulse radius +16%', apply: (G) => { G.s.R *= 1.16; } },
    { id: 'arcs', name: 'Electric Arcs', icon: '⚡', max: 5, desc: (l) => (l ? 'Arc to one more enemy' : 'Zap the 2 nearest enemies with lightning'), apply: (G) => { G.s.arcs++; } },
    { id: 'shards', name: 'Orbiting Metal Shards', icon: '🔩', max: 5, desc: (l) => (l ? 'One more orbiting shard' : 'Two metal shards orbit and shred enemies'), apply: (G) => { G.s.shards++; } },
    { id: 'power', name: 'Polarity Surge', icon: '🔋', max: 5, desc: 'Pulse damage +30%, fires 10% faster', apply: (G) => { G.s.dmg *= 1.3; G.s.rate *= 0.9; } },
    { id: 'pull', name: 'Stronger Pull', icon: '🧲', max: 4, desc: 'Magnet field +35% and coin value +10%', apply: (G) => { G.p.magnet *= 1.35; G.xpMul *= 1.1; } },
  ],
  noGeneric: ['mag'],
  update(G, dt) {
    const p = G.p, s = G.s;
    G.every('pulse', s.rate, () => {
      G.query(p.x, p.y, s.R, (e) => G.damage(e, s.dmg, 440, Math.atan2(e.y - p.y, e.x - p.x), true));
      G.ring(p.x, p.y, s.R, '#ef5350', 0.35, 12, 4);
      G.ring(p.x, p.y, s.R * 0.8, '#90caf9', 0.3, 8, 2);
      G.sfx('shoot');
    });
    if (s.arcs) G.every('arcs', 0.8, () => {
      const t = G.nearestN(p.x, p.y, s.arcs + 1, 230);
      let fx = p.x, fy = p.y;
      for (const e of t) { G.bolt(fx, fy, e.x, e.y, '#b3e5fc', 2.5); G.damage(e, 16 + s.arcs * 6, 40, 0); fx = e.x; fy = e.y; }
    });
    if (s.shards) {
      const n = s.shards + 1;
      G.tm.sa = (G.tm.sa || 0) + dt * 3.5;
      for (let i = 0; i < n; i++) {
        const a = G.tm.sa + i * TAU / n;
        G.melee(p.x + Math.cos(a) * 58, p.y + Math.sin(a) * 58, 10, 14 + s.shards * 4, 200, 0.3, 'sh' + i);
      }
    }
  },
  drawGem(ctx, g) {
    const r = g.v > 4 ? 7 : 5;
    ctx.fillStyle = '#ffca28'; ctx.beginPath(); ctx.arc(g.x, g.y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ff8f00'; ctx.lineWidth = 1.5; ctx.stroke();
  },
  drawUnder(ctx, G) {
    const p = G.p;
    ctx.strokeStyle = 'rgba(144,202,249,0.18)'; ctx.setLineDash([4, 10]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.magnet, G.time * 0.5, G.time * 0.5 + TAU); ctx.stroke(); ctx.setLineDash([]);
  },
  drawOver(ctx, G) {
    const p = G.p, s = G.s;
    if (!s.shards) return;
    const n = s.shards + 1;
    for (let i = 0; i < n; i++) {
      const a = G.tm.sa + i * TAU / n;
      Horde.drawEmoji(ctx, '🔩', p.x + Math.cos(a) * 58, p.y + Math.sin(a) * 58, 20, false, a * 3);
    }
  },
  player: {
    draw(ctx, G, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
      ctx.lineWidth = 9; ctx.lineCap = 'butt';
      ctx.strokeStyle = '#e53935'; ctx.beginPath(); ctx.arc(-2, 0, 10, Math.PI / 2, Math.PI * 1.5); ctx.lineTo(4, -10); ctx.moveTo(-2, 10); ctx.lineTo(4, 10); ctx.stroke();
      ctx.strokeStyle = '#eceff1'; ctx.beginPath(); ctx.moveTo(4, -10); ctx.lineTo(13, -10); ctx.moveTo(4, 10); ctx.lineTo(13, 10); ctx.stroke();
      ctx.restore();
    },
  },
});

/* =============================== 18. COIN VACUUM =============================== */
const coinDraw = (ctx, b) => {
  ctx.fillStyle = b.pierce > 0 ? '#fff176' : '#ffca28';
  ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#e65100'; ctx.lineWidth = 1.2; ctx.stroke();
};
const billDraw = (ctx, z) => {
  ctx.globalAlpha = Math.min(1, z.life / z.max * 2) * 0.8;
  ctx.save(); ctx.translate(z.x, z.y); ctx.rotate(z.seed);
  ctx.fillStyle = '#66bb6a'; ctx.fillRect(-9, -5, 18, 10);
  ctx.fillStyle = '#2e7d32'; ctx.fillRect(-3, -3, 6, 6);
  ctx.restore(); ctx.globalAlpha = 1;
};
Horde.register({
  id: 'vacuum', cat: CAT, name: 'Coin Vacuum', icon: '💰',
  hook: 'High-score greed. Suck up loose cash bags in a bank vault while relentless agents close in. Every bag you grab fires a blast of coins back at them.',
  how: 'Drag anywhere to move. Your vacuum cone pulls in <b>💰 cash bags</b> in front of you. Each bag fires a big coin blast at the nearest agent. Spare change flicks out on its own.',
  bg: '#26332d', grid: 'rgba(255,215,0,0.07)', gridSize: 50, xpColor: '#81c784', killWord: 'agents audited',
  player: { r: 15, hp: 100, speed: 155, emoji: '🤑', size: 36 },
  stats: { cone: 0.5, vac: 120, coins: 5, spread: 0.35, dmg: 14, pierce: 0, trail: 0, bagRate: 0.7, bagMax: 10 },
  enemies: [
    { id: 'agent', emoji: '🕵️', r: 13, hp: 20, speed: 56, dmg: 10, xp: 1, w: 9, color: '#455a64' },
    { id: 'auditor', emoji: '🤵', r: 13, hp: 18, speed: 74, dmg: 9, xp: 1, w: 5, from: 20, beh: 'zigzag', color: '#263238' },
    { id: 'cop', emoji: '👮', r: 14, hp: 30, speed: 62, dmg: 12, xp: 2, w: 4, from: 45, beh: 'dash', color: '#1e88e5' },
    { id: 'shark', emoji: '🦈', r: 16, hp: 80, speed: 46, dmg: 15, xp: 4, w: 2, from: 90, beh: 'dash', color: '#78909c' },
    { id: 'van', emoji: '🚓', r: 18, hp: 150, speed: 40, dmg: 18, xp: 6, w: 1, from: 150, color: '#1565c0', kbRes: 0.4 },
  ],
  upgrades: [
    { id: 'wide', name: 'Wide Vacuum Angle', icon: '📐', max: 5, desc: 'Vacuum cone wider and longer', apply: (G) => { G.s.cone += 0.17; G.s.vac += 22; } },
    { id: 'gold', name: 'Golden Blast', icon: '🥇', max: 4, desc: 'Coins pierce one more agent and deal +20% damage', apply: (G) => { G.s.pierce++; G.s.dmg *= 1.2; } },
    { id: 'boost', name: 'Cash Boost', icon: '💹', max: 2, desc: 'XP values ×1.5', apply: (G) => { G.xpMul *= 1.5; } },
    { id: 'more', name: 'Coin Shotgun', icon: '🪙', max: 4, desc: '+2 coins per blast', apply: (G) => { G.s.coins += 2; G.s.spread += 0.06; } },
    { id: 'heist', name: 'Bank Heist', icon: '🏦', max: 4, desc: 'Cash bags appear faster and more at once', apply: (G) => { G.s.bagRate *= 0.8; G.s.bagMax += 2; } },
    { id: 'trail', name: 'Slippery Money Trail', icon: '💸', max: 4, desc: (l) => (l ? 'Longer, slicker trail' : 'Drop slippery bills that slow agents'), apply: (G) => { G.s.trail++; } },
  ],
  init(G) { G.bags = []; for (let i = 0; i < 5; i++) G.bags.push(bagSpot(G)); },
  update(G, dt) {
    const p = G.p, s = G.s;
    G.every('bag', s.bagRate, () => { if (G.bags.length < s.bagMax) G.bags.push(bagSpot(G)); });
    // loose change: a weak baseline shot so you are never defenceless between bags
    G.every('change', 1.2, () => {
      const e = G.nearest(p.x, p.y, 300); if (!e) return;
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      G.shoot({ x: p.x, y: p.y, vx: Math.cos(a) * 460, vy: Math.sin(a) * 460, r: 4, dmg: s.dmg * 0.8, pierce: s.pierce, kb: 60, life: 1, draw: coinDraw });
    });
    for (let i = G.bags.length - 1; i >= 0; i--) {
      const b = G.bags[i], d = Math.hypot(b.x - p.x, b.y - p.y);
      if (d < 60 || (d < s.vac + p.r && Math.abs(angDiff(p.ang, Math.atan2(b.y - p.y, b.x - p.x))) < s.cone)) {
        b.x += (p.x - b.x) / d * 280 * dt; b.y += (p.y - b.y) / d * 280 * dt; b.suck = true;
      } else b.suck = false;
      if (d < p.r + 14) { G.bags.splice(i, 1); blast(G); G.addXp(0.5); G.sfx('pick'); }
    }
    for (const g of G.gems) {
      if (g.mag) continue;
      const d = Math.hypot(g.x - p.x, g.y - p.y);
      if (d < s.vac + p.r && Math.abs(angDiff(p.ang, Math.atan2(g.y - p.y, g.x - p.x))) < s.cone) g.mag = true;
    }
    if (s.trail) G.every('trail', 0.14, () => {
      if (!p.moving) return;
      G.zone({ x: p.x + rand(-6, 6), y: p.y + rand(-6, 6), r: 16 + s.trail * 3, life: 2 + s.trail * 0.6, slow: 0.4 + s.trail * 0.1, seed: rand(0, 3), draw: billDraw });
    });
  },
  drawUnder(ctx, G) {
    const p = G.p, s = G.s;
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.arc(p.x, p.y, s.vac + p.r, p.ang - s.cone, p.ang + s.cone); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const r = (s.vac + p.r) * (1 - ((G.time * 1.5 + i / 3) % 1));
      ctx.beginPath(); ctx.arc(p.x, p.y, r, p.ang - s.cone, p.ang + s.cone); ctx.stroke();
    }
    for (const b of G.bags) Horde.drawEmoji(ctx, '💰', b.x, b.y, 26, false, b.suck ? Math.sin(G.time * 30) * 0.3 : 0);
  },
});
function bagSpot(G) {
  for (let i = 0; i < 10; i++) {
    const x = rand(24, G.w - 24), y = rand(G.top + 60, G.bot - 24);
    if (Math.hypot(x - G.p.x, y - G.p.y) > 90) return { x, y };
  }
  return { x: rand(24, G.w - 24), y: rand(G.top + 60, G.bot - 24) };
}
function blast(G) {
  const p = G.p, s = G.s, e = G.nearest(p.x, p.y, 600);
  const base = e ? Math.atan2(e.y - p.y, e.x - p.x) : p.ang;
  for (let i = 0; i < s.coins; i++) {
    const a = base + (s.coins > 1 ? (i / (s.coins - 1) - 0.5) * 2 * s.spread : 0);
    G.shoot({ x: p.x, y: p.y, vx: Math.cos(a) * 480, vy: Math.sin(a) * 480, r: 5, dmg: s.dmg, pierce: s.pierce, kb: 120, life: 1.3, draw: coinDraw });
  }
  G.sfx('shoot');
}

/* =============================== 19. COLOR MATCH =============================== */
const COLORS = ['#ff4040', '#3d8bff', '#34d058'], CNAMES = ['RED', 'BLUE', 'GREEN'];
const colInit = (e) => { e.ci = randInt(0, 2); e.color = COLORS[e.ci]; };
const blobDraw = (ctx, e, G) => {
  const match = e.ci === G.ci || G.tm.rainbow > 0;
  const wob = Math.sin(G.time * 6 + e.ph) * 1.5;
  ctx.fillStyle = e.flash > 0 ? '#fff' : e.color;
  ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r + wob, e.r - wob, 0, 0, TAU); ctx.fill();
  if (match) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.x - e.r * 0.35, e.y - e.r * 0.2, e.r * 0.25, 0, TAU); ctx.arc(e.x + e.r * 0.35, e.y - e.r * 0.2, e.r * 0.25, 0, TAU); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(e.x - e.r * 0.3, e.y - e.r * 0.15, e.r * 0.12, 0, TAU); ctx.arc(e.x + e.r * 0.4, e.y - e.r * 0.15, e.r * 0.12, 0, TAU); ctx.fill();
};
function shiftColor(G) {
  G.ci = (G.ci + randInt(1, 2)) % 3;
  G.tm.shift = 0;
  G.banner(CNAMES[G.ci] + '!', COLORS[G.ci]);
  if (G.s.fast) {
    const p = G.p, R = 70 + G.s.fast * 15;
    G.query(p.x, p.y, R, (e) => G.damage(e, 12 + G.s.fast * 8, 300, Math.atan2(e.y - p.y, e.x - p.x), true));
    G.ring(p.x, p.y, R, COLORS[G.ci], 0.35, 10, 4);
  }
}
Horde.register({
  id: 'color', cat: CAT, name: 'Color Match', icon: '🎨',
  hook: 'Color-coordinated tactical running. You shift between red, blue and green. Bump into enemies of your color to destroy them, and dodge the rest while you auto-shoot.',
  how: 'Drag anywhere to move. Enemies <b>outlined in white</b> match your color: ram them! Others hurt. Your color changes every 5s.',
  bg: '#14151d', grid: 'rgba(255,255,255,0.04)', gridSize: 36, xpColor: '#e1bee7', killWord: 'blobs matched',
  player: { r: 15, hp: 100, speed: 160 },
  stats: { shift: 5, rate: 0.5, dmg: 9, pulse: 0, rainbow: 0, fast: 0 },
  enemies: [
    { id: 'blob', r: 12, hp: 18, speed: 56, dmg: 10, xp: 1, w: 10, draw: blobDraw, init: colInit },
    { id: 'zip', r: 9, hp: 10, speed: 88, dmg: 7, xp: 1, w: 5, from: 20, beh: 'zigzag', draw: blobDraw, init: colInit },
    { id: 'dash', r: 12, hp: 24, speed: 60, dmg: 11, xp: 2, w: 3, from: 40, beh: 'dash', draw: blobDraw, init: colInit },
    { id: 'big', r: 18, hp: 70, speed: 40, dmg: 14, xp: 3, w: 3, from: 70, draw: blobDraw, init: colInit, kbRes: 0.6 },
    { id: 'huge', r: 24, hp: 150, speed: 34, dmg: 18, xp: 6, w: 1, from: 140, draw: blobDraw, init: colInit, kbRes: 0.4 },
  ],
  upgrades: [
    { id: 'pulse', name: 'Color Pulse', icon: '🌈', max: 4, desc: (l) => (l ? 'Pulse reaches further, fires more often' : 'Periodically wipe out matching-color enemies around you'), apply: (G) => { G.s.pulse++; } },
    { id: 'rainbow', name: 'Rainbow Shield', icon: '🛡️', max: 4, desc: (l) => (l ? 'Rainbow lasts longer' : 'Every 16s, match ALL colors for a few seconds'), apply: (G) => { G.s.rainbow++; } },
    { id: 'fast', name: 'Faster Color Shift', icon: '🔄', max: 4, desc: 'Colors cycle faster, and each shift releases a damaging burst', apply: (G) => { G.s.fast++; G.s.shift = Math.max(2.5, G.s.shift - 0.6); } },
    { id: 'bullets', name: 'Brighter Bullets', icon: '⚪', max: 5, desc: 'White bullets +35% damage, fire 10% faster', apply: (G) => { G.s.dmg *= 1.35; G.s.rate *= 0.9; } },
  ],
  init(G) { G.ci = 0; G.tm.shift = 0; G.tm.rainbow = 0; },
  onContact(G, e) {
    if (e.ci === G.ci || G.tm.rainbow > 0) {
      if (e.elite) { G.melee(e.x, e.y, 1, 60, 400, 0.3, 'bump'); return true; }
      G.addXp(e.xp); G.kill(e); G.float(e.x, e.y, 'MATCH!', COLORS[e.ci], 13, 0.5);
      return true;
    }
    return false;
  },
  update(G, dt) {
    const p = G.p, s = G.s;
    G.tm.shift += dt;
    if (G.tm.shift >= s.shift) shiftColor(G);
    G.tm.rainbow = Math.max(0, G.tm.rainbow - dt);
    G.every('fire', s.rate, () => {
      const e = G.nearest(p.x, p.y, 380); if (!e) return;
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      G.shoot({ x: p.x, y: p.y, vx: Math.cos(a) * 430, vy: Math.sin(a) * 430, r: 4, dmg: s.dmg, kb: 80, color: '#fff', life: 1.2 });
    });
    if (s.pulse) G.every('pulse', Math.max(4, 9 - s.pulse * 1.2), () => {
      const R = 160 + s.pulse * 60;
      for (const e of G.enemies) if (!e.dead && e.ci === G.ci && Math.hypot(e.x - p.x, e.y - p.y) < R) { if (e.elite) G.damage(e, 80); else G.kill(e); }
      G.ring(p.x, p.y, R, COLORS[G.ci], 0.5, 20, 6);
      G.sfx('power');
    });
    if (s.rainbow) G.every('rainbow', 16, () => { G.tm.rainbow = 2 + s.rainbow; G.banner('RAINBOW!', '#fff'); });
  },
  player: {
    draw(ctx, G, p) {
      const rb = G.tm.rainbow > 0;
      const left = G.s.shift - G.tm.shift, warn = left < 1;
      ctx.fillStyle = rb ? 'hsl(' + (G.time * 400 % 360) + ',90%,60%)' : warn && Math.floor(G.time * 10) % 2 ? '#fff' : COLORS[G.ci];
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * (left / G.s.shift)); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x - 5, p.y - 3, 3.5, 0, TAU); ctx.arc(p.x + 5, p.y - 3, 3.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(p.x - 5 + Math.cos(p.ang) * 1.5, p.y - 3 + Math.sin(p.ang) * 1.5, 1.8, 0, TAU); ctx.arc(p.x + 5 + Math.cos(p.ang) * 1.5, p.y - 3 + Math.sin(p.ang) * 1.5, 1.8, 0, TAU); ctx.fill();
    },
  },
  hud(ctx, G, y) {
    ctx.fillStyle = G.tm.rainbow > 0 ? '#fff' : COLORS[G.ci];
    ctx.beginPath(); ctx.arc(20, y, 7, 0, TAU); ctx.fill();
    Horde.text(ctx, G.tm.rainbow > 0 ? 'RAINBOW' : CNAMES[G.ci], 32, y, 13, '#fff');
  },
});

/* =============================== 20. DICE ROLLER =============================== */
const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
const chip = (color) => (ctx, e, G) => {
  ctx.fillStyle = e.flash > 0 ? '#fff' : color; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.setLineDash([4, 5]); ctx.lineDashOffset = G.time * 10 + e.ph * 10;
  ctx.beginPath(); ctx.arc(e.x, e.y, e.r - 2, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 0.5, 0, TAU); ctx.stroke();
};
const pipDraw = (ctx, b) => {
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#c62828'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.5, 0, TAU); ctx.fill();
};
Horde.register({
  id: 'dice', cat: CAT, name: 'Dice Roller', icon: '🎲',
  hook: 'Total RNG chaos. You are a six-sided die. Every 3 seconds you roll yourself, and the number you land on decides how much firepower blasts out at the horde.',
  how: 'Drag anywhere to move. Every roll fires a burst: the higher the roll, the more bullets. Collect <b>Chips</b> to level up.',
  bg: '#1d6b45', xpColor: '#ffd54f', killWord: 'chips cashed',
  player: { r: 16, hp: 100, speed: 150 },
  stats: { cd: 3, sides: 6, mult: 2, dmg: 22, lucky: 0, loaded: 0 },
  enemies: [
    { id: 'red', r: 12, hp: 20, speed: 58, dmg: 10, xp: 1, w: 9, color: '#e53935', draw: chip('#e53935') },
    { id: 'blue', r: 11, hp: 14, speed: 82, dmg: 8, xp: 1, w: 5, from: 15, beh: 'zigzag', color: '#1e88e5', draw: chip('#1e88e5') },
    { id: 'joker', emoji: '🃏', r: 13, hp: 30, speed: 60, dmg: 12, xp: 2, w: 4, from: 40, beh: 'dash', color: '#fff' },
    { id: 'black', r: 17, hp: 80, speed: 38, dmg: 14, xp: 4, w: 3, from: 80, color: '#212121', kbRes: 0.5, draw: chip('#212121') },
    { id: 'slot', emoji: '🎰', r: 18, hp: 160, speed: 34, dmg: 18, xp: 6, w: 1, from: 140, color: '#ffd54f', kbRes: 0.4 },
  ],
  upgrades: [
    { id: 'd8', name: 'Upgrade to a Bigger Die', icon: '🔷', max: 2, desc: (l) => (l ? 'Upgrade to a D10' : 'Upgrade to a D8: roll up to 8'), apply: (G, l) => { G.s.sides = l === 1 ? 8 : 10; } },
    { id: 'lucky', name: 'Lucky 6', icon: '🍀', max: 4, desc: (l) => (l ? 'Bigger lucky explosion' : 'Rolling 6 or higher triggers an explosion'), apply: (G) => { G.s.lucky++; } },
    { id: 'cd', name: 'Cooldown Reduction', icon: '⏱️', max: 5, desc: 'Roll 18% more often', apply: (G) => { G.s.cd *= 0.82; } },
    { id: 'loaded', name: 'Loaded Dice', icon: '⚖️', max: 3, desc: 'Minimum roll +1', apply: (G) => { G.s.loaded++; } },
    { id: 'double', name: 'Double Down', icon: '✌️', max: 3, desc: '+1 bullet per pip', apply: (G) => { G.s.mult++; } },
    { id: 'hot', name: 'Hot Dice', icon: '🔥', max: 5, desc: 'Bullet damage +30%', apply: (G) => { G.s.dmg *= 1.3; } },
  ],
  init(G) { G.face = 6; G.tm.roll = 0; },
  update(G, dt) {
    const p = G.p, s = G.s;
    G.tm.roll += dt;
    if (G.tm.roll < s.cd) return;
    G.tm.roll = 0;
    const n = randInt(Math.min(s.sides, 1 + s.loaded), s.sides);
    G.face = n;
    G.float(p.x, p.y - 34, String(n), n >= 6 ? '#ffd54f' : '#fff', 26, 0.9);
    const total = n * s.mult, t = G.nearestN(p.x, p.y, total, 600);
    for (let i = 0; i < total; i++) {
      const a = t.length ? Math.atan2(t[i % t.length].y - p.y, t[i % t.length].x - p.x) + (i >= t.length ? rand(-0.25, 0.25) : 0) : i / total * TAU;
      G.shoot({ x: p.x, y: p.y, vx: Math.cos(a) * 500, vy: Math.sin(a) * 500, r: 5, dmg: s.dmg, pierce: 1, kb: 120, life: 1.4, draw: pipDraw });
    }
    G.sfx('shoot');
    if (s.lucky && n >= 6) {
      G.explode(p.x, p.y, 100 + s.lucky * 25, 40 + s.lucky * 30 + G.time / 6, '#ffd54f', 450);
      G.banner('LUCKY ' + n + '!', '#ffd54f');
    }
  },
  drawBg(ctx, G) {
    ctx.fillStyle = '#1d6b45'; ctx.fillRect(0, 0, G.w, G.h);
    const g = ctx.createRadialGradient(G.w / 2, G.h / 2, 50, G.w / 2, G.h / 2, Math.max(G.w, G.h) * 0.7);
    g.addColorStop(0, 'rgba(255,255,255,0.06)'); g.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, G.w, G.h);
    ctx.strokeStyle = 'rgba(255,215,0,0.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(G.w / 2, (G.top + G.bot) / 2, G.w * 0.38, (G.bot - G.top) * 0.36, 0, 0, TAU); ctx.stroke();
  },
  hud(ctx, G, y) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(12, y - 4, 90, 8);
    ctx.fillStyle = '#fff'; ctx.fillRect(13, y - 3, 88 * Math.min(1, G.tm.roll / G.s.cd), 6);
    Horde.text(ctx, 'D' + G.s.sides, 110, y, 12, '#fff');
  },
  player: {
    draw(ctx, G, p) {
      const rolling = G.s.cd - G.tm.roll < 0.45;
      const face = rolling ? 1 + (Math.floor(G.time * 20) % Math.min(6, G.s.sides)) : G.face;
      const rot = rolling ? G.time * 14 : 0, S = 30;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(rot);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-S / 2 + 3, -S / 2 + 4, S, S);
      ctx.fillStyle = '#fafafa'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-S / 2, -S / 2, S, S, 6) : ctx.rect(-S / 2, -S / 2, S, S); ctx.fill();
      ctx.strokeStyle = '#bdbdbd'; ctx.lineWidth = 1.5; ctx.stroke();
      if (PIPS[face]) {
        ctx.fillStyle = face === 1 ? '#c62828' : '#212121';
        for (const [x, y] of PIPS[face]) { ctx.beginPath(); ctx.arc(x * 8, y * 8, face === 1 ? 4.5 : 3, 0, TAU); ctx.fill(); }
      } else {
        ctx.font = 'bold 17px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#c62828';
        ctx.fillText(String(face), 0, 1);
      }
      ctx.restore();
    },
  },
});
})();
