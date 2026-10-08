/* Category 2: Retro & Arcade Mechanics (games 6–10) */
(() => {
'use strict';
const { rand, randInt, pick, clamp, TAU } = Horde.U;
const CAT = 'Retro & Arcade';

/* Rotating outlined polygon enemy, shared by Bounce Arena and Pixel Defender. */
const poly = (sides, color, fill) => (ctx, e, G) => {
  const R = e.r * 1.2, rot = G.time * (e.ph > 3 ? 1.2 : -1.2) + e.ph;
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const a = rot + i / sides * TAU;
    i ? ctx.lineTo(e.x + Math.cos(a) * R, e.y + Math.sin(a) * R) : ctx.moveTo(e.x + Math.cos(a) * R, e.y + Math.sin(a) * R);
  }
  ctx.fillStyle = fill || color + '33'; ctx.fill();
  ctx.strokeStyle = e.flash > 0 ? '#fff' : color; ctx.lineWidth = 2.5; ctx.stroke();
  if (e.hp < e.maxHp && !e.elite) {
    ctx.fillStyle = color; ctx.fillRect(e.x - R * 0.6, e.y + R + 3, R * 1.2 * e.hp / e.maxHp, 2);
  }
};

/* =============================== 6. BRICK BREAKER SWARM =============================== */
const BRICK = {
  id: 'brick', r: 20, color: '#4fc3f7', kbRes: 0,
  draw(ctx, e) {
    const hue = (190 - Math.min(e.maxHp, 70) * 2.6 + 360) % 360;
    ctx.fillStyle = e.flash > 0 ? '#fff' : e.bomb ? '#37474f' : 'hsl(' + hue + ',75%,' + (40 + 18 * e.hp / e.maxHp) + '%)';
    const x = e.x - e.bw / 2 + 1.5, y = e.y - e.bh / 2 + 1.5, w = e.bw - 3, h = e.bh - 3;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, 4) : ctx.rect(x, y, w, h); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x + 2, y + 2, w - 4, 3);
    if (e.bomb) Horde.drawEmoji(ctx, '💣', e.x - 12, e.y, 14);
    Horde.text(ctx, String(Math.ceil(e.hp)), e.x + (e.bomb ? 6 : 0), e.y + 1, 13, '#fff', 'center');
  },
};
function brickRow(G, y) {
  const cols = G.cols, bw = G.w / cols, bh = 24, t = G.time;
  const maxv = 3 + Math.floor(t / 7), gap = Math.max(0.12, 0.35 - t / 900);
  for (let c = 0; c < cols; c++) {
    if (Math.random() < gap) continue;
    const hp = Math.max(1, Math.round(maxv * Math.pow(Math.random(), 0.7)));
    G.enemies.push({ type: BRICK, x: (c + 0.5) * bw, y, bw, bh, r: Math.hypot(bw, bh) / 2, hp, maxHp: hp, xp: Math.ceil(hp / 2.5),
      kx: 0, ky: 0, flash: 0, slowF: 1, slowT: 0, bomb: Math.random() < 0.05 });
  }
}
Horde.register({
  id: 'bricks', cat: CAT, name: 'Brick Breaker Swarm', icon: '🧱',
  hook: 'A classic arcade game turned upside down. Rows of numbered bricks march down like a horde, and your paddle sprays hundreds of tiny bouncy balls to shred them.',
  how: 'Drag left/right to slide the paddle. Balls fire automatically and hit harder the more they bounce. Don\'t let the bricks reach you!',
  bg: '#0f1226', xpColor: '#ffeb3b', custom: true, move: 'paddle', autoMagnet: true, killWord: 'bricks smashed', overText: 'BRICKED!',
  player: { r: 10, hp: 100, speed: 0 },
  noGeneric: ['spd', 'mag'],
  stats: { rate: 0.16, per: 1, dmg: 1, maxB: 7, laser: 0, boom: 0, spread: 0.32 },
  enemies: [BRICK],
  upgrades: [
    { id: 'more', name: '+2 Balls per Stream', icon: '⚪', max: 4, desc: 'Each shot fires two more balls', apply: (G) => { G.s.per += 2; G.s.spread += 0.08; } },
    { id: 'laser', name: 'Laser Beam', icon: '🔦', max: 5, desc: (l) => (l ? 'Wider, stronger, faster-charging laser' : 'A laser periodically blasts every brick above the paddle'), apply: (G) => { G.s.laser++; } },
    { id: 'wide', name: 'Widened Paddle', icon: '↔️', max: 4, desc: 'Paddle width +22%', apply: (G) => { G.p.hw *= 1.22; } },
    { id: 'boom', name: 'Explosive Bricks', icon: '💥', max: 4, desc: 'Destroyed bricks damage their neighbours', apply: (G) => { G.s.boom++; } },
    { id: 'rapid', name: 'Rapid Stream', icon: '⏩', max: 5, desc: 'Fire 15% faster', apply: (G) => { G.s.rate *= 0.85; } },
    { id: 'heavy', name: 'Heavy Balls', icon: '🎱', max: 5, desc: 'Ball damage +1', apply: (G) => { G.s.dmg += 1; } },
    { id: 'bouncy', name: 'Super Bouncy', icon: '🏀', max: 3, desc: 'Balls survive 3 more bounces', apply: (G) => { G.s.maxB += 3; } },
  ],
  init(G) {
    G.p.hw = 46; G.balls = [];
    G.cols = clamp(Math.floor(G.w / 46), 6, 14);
    // G.rowY is the y of the topmost row; a new row spawns above it once it has marched down one row height.
    G.rowY = G.top + 40;
    for (let i = 0; i < 5; i++) brickRow(G, G.rowY + i * 28);
    G.p.y = G.bot - 64;
  },
  onResize(G) { G.p.y = G.bot - 64; },
  update(G, dt) {
    const p = G.p, s = G.s, t = G.time;
    const march = 7 + t * 0.05;
    for (const e of G.enemies) {
      if (e.flash > 0) e.flash -= dt;
      e.y += march * dt;
      if (!e.dead && e.y + e.bh / 2 >= p.y - 12) {
        e.dead = true; G.hurt(10, true); G.burst(e.x, e.y, '#f44336', 10, 150);
      }
    }
    G.rowY += march * dt;
    if (G.rowY >= G.top + 40 + 28) { G.rowY -= 28; brickRow(G, G.rowY); }
    G.every('fire', s.rate, () => {
      for (let i = 0; i < s.per && G.balls.length < 600; i++) {
        const a = -Math.PI / 2 + rand(-s.spread, s.spread);
        G.balls.push({ x: p.x + rand(-p.hw * 0.5, p.hw * 0.5), y: p.y - 10, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, r: 4, b: 0, life: 7 });
      }
    });
    if (s.laser) G.every('laser', Math.max(2, 6 - s.laser * 0.7), () => {
      const half = 8 + s.laser * 6, dmg = 6 + s.laser * 5 + t / 12;
      for (const e of G.enemies) if (!e.dead && Math.abs(e.x - p.x) < e.bw / 2 + half) G.damage(e, dmg, 0, 0, true);
      G.fxDraw(0.3, (ctx, k) => {
        ctx.fillStyle = 'rgba(255,60,120,' + k * 0.8 + ')'; ctx.fillRect(p.x - half, 0, half * 2, p.y);
        ctx.fillStyle = 'rgba(255,255,255,' + k + ')'; ctx.fillRect(p.x - half / 3, 0, half * 2 / 3, p.y);
      });
      G.sfx('power'); G.shake = 4;
    });
    // balls
    const sub = dt > 0.02 ? 2 : 1, h = dt / sub;
    for (let i = G.balls.length - 1; i >= 0; i--) {
      const b = G.balls[i];
      b.life -= dt;
      for (let k = 0; k < sub; k++) {
        b.x += b.vx * h; b.y += b.vy * h;
        if (b.x < b.r && b.vx < 0) { b.vx = -b.vx; b.b++; }
        if (b.x > G.w - b.r && b.vx > 0) { b.vx = -b.vx; b.b++; }
        if (b.y < G.top + b.r && b.vy < 0) { b.vy = -b.vy; b.b++; }
        if (b.vy > 0 && b.y + b.r >= p.y - 7 && b.y < p.y + 8 && Math.abs(b.x - p.x) < p.hw + b.r) {
          b.vy = -Math.abs(b.vy); b.vx += (b.x - p.x) / p.hw * 160;
          const sp = Math.hypot(b.vx, b.vy); b.vx *= 560 / sp; b.vy *= 560 / sp;
        }
        let hit = null;
        G.query(b.x, b.y, b.r, (e) => {
          if (hit) return;
          const cx = clamp(b.x, e.x - e.bw / 2, e.x + e.bw / 2), cy = clamp(b.y, e.y - e.bh / 2, e.y + e.bh / 2);
          if ((b.x - cx) ** 2 + (b.y - cy) ** 2 < b.r * b.r) hit = e;
        });
        if (hit) {
          const ox = e2x(hit, b), oy = (hit.bh / 2 + b.r) - Math.abs(b.y - hit.y);
          if (ox < oy) { b.vx = b.x < hit.x ? -Math.abs(b.vx) : Math.abs(b.vx); b.x += b.x < hit.x ? -ox : ox; }
          else { b.vy = b.y < hit.y ? -Math.abs(b.vy) : Math.abs(b.vy); b.y += b.y < hit.y ? -oy : oy; }
          hit.flash = 0.05;
          G.damage(hit, s.dmg * (1 + b.b * 0.5), 0, 0, true);
          G.sfx('hit');
          b.b++;
        }
      }
      if (b.y > G.h + 10 || b.b > s.maxB || b.life <= 0) { G.balls[i] = G.balls[G.balls.length - 1]; G.balls.pop(); }
    }
  },
  onKill(G, e) {
    const R = e.bomb ? 70 : G.s.boom ? 20 + G.s.boom * 6 : 0;
    if (!R) return;
    const dmg = e.bomb ? 8 + G.time / 10 : 1 + G.s.boom * 1.5;
    G.query(e.x, e.y, R, (o) => { if (o !== e) G.damage(o, dmg, 0, 0, true); });
    G.ring(e.x, e.y, R + 10, e.bomb ? '#ff7043' : '#ffca28', 0.3);
    if (e.bomb) G.sfx('boom');
  },
  drawOver(ctx, G) {
    ctx.fillStyle = '#fff';
    for (const b of G.balls) {
      ctx.fillStyle = b.b > 3 ? '#ff80ab' : b.b > 1 ? '#80d8ff' : '#fff';
      ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }
    ctx.strokeStyle = 'rgba(255,82,82,0.35)'; ctx.setLineDash([6, 8]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, G.p.y - 12); ctx.lineTo(G.w, G.p.y - 12); ctx.stroke(); ctx.setLineDash([]);
  },
  drawBg(ctx, G) {
    const g = ctx.createLinearGradient(0, 0, 0, G.h);
    g.addColorStop(0, '#1a1040'); g.addColorStop(1, '#0a0d1c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, G.w, G.h);
  },
  player: {
    draw(ctx, G, p) {
      const g = ctx.createLinearGradient(0, p.y - 7, 0, p.y + 7);
      g.addColorStop(0, '#80deea'); g.addColorStop(1, '#00838f');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(p.x - p.hw, p.y - 7, p.hw * 2, 14, 7) : ctx.rect(p.x - p.hw, p.y - 7, p.hw * 2, 14); ctx.fill();
      if (G.s.laser) { ctx.fillStyle = '#ff4081'; ctx.fillRect(p.x - 3, p.y - 11, 6, 5); }
    },
  },
});
function e2x(hit, b) { return (hit.bw / 2 + b.r) - Math.abs(b.x - hit.x); }

/* =============================== 7. SNAKE SURVIVOR =============================== */
const SEG = 13;
Horde.register({
  id: 'snake', cat: CAT, name: 'Snake Survivor', icon: '🐍',
  hook: 'Gun-snake synergy. Every piece of food grows your tail, and every tail segment is an automatic laser turret firing at swarming bugs.',
  how: 'Drag in a direction to steer. You never stop slithering. Eat <b>yellow dots</b> to grow more turrets. Only your head is vulnerable.',
  bg: '#132213', grid: 'rgba(90,180,90,0.10)', gridSize: 26, xpColor: '#b2ff59', killWord: 'bugs zapped', move: 'steer',
  player: { r: 11, hp: 100, speed: 120 },
  noGeneric: ['spd'],
  stats: { len: 3, rate: 1.3, dmg: 8, pierce: 0, range: 260, spit: 0 },
  enemies: [
    { id: 'ant', emoji: '🐜', r: 9, hp: 10, speed: 72, dmg: 8, xp: 1, w: 9, color: '#6d4c41' },
    { id: 'lady', emoji: '🐞', r: 11, hp: 18, speed: 55, dmg: 9, xp: 1, w: 6, color: '#e53935' },
    { id: 'cricket', emoji: '🦗', r: 11, hp: 18, speed: 62, dmg: 10, xp: 2, w: 4, from: 35, beh: 'dash', color: '#7cb342' },
    { id: 'spider', emoji: '🕷️', r: 13, hp: 30, speed: 72, dmg: 12, xp: 2, w: 3, from: 70, beh: 'zigzag', color: '#424242' },
    { id: 'cater', emoji: '🐛', r: 15, hp: 90, speed: 34, dmg: 15, xp: 5, w: 2, from: 130, color: '#8bc34a' },
  ],
  upgrades: [
    { id: 'spit', name: 'Toxic Spit', icon: '🤮', max: 5, desc: (l) => (l ? 'Bigger, nastier poison puddles' : 'Your head spits poison that leaves a toxic puddle'), apply: (G) => { G.s.spit++; } },
    { id: 'pierce', name: 'Pierce Lasers', icon: '📍', max: 4, desc: 'Tail lasers pierce one more bug', apply: (G) => { G.s.pierce++; } },
    { id: 'slither', name: 'Increase Slither Speed', icon: '💨', max: 5, desc: 'Move and turn 12% faster', apply: (G) => { G.p.speed *= 1.12; G.p.turn *= 1.1; } },
    { id: 'overclock', name: 'Overclocked Turrets', icon: '⚙️', max: 5, desc: 'Each segment fires 15% faster', apply: (G) => { G.s.rate *= 0.85; } },
    { id: 'power', name: 'Laser Power', icon: '🔆', max: 5, desc: 'Laser damage +30%', apply: (G) => { G.s.dmg *= 1.3; } },
    { id: 'feast', name: 'Big Feast', icon: '🍎', max: 3, desc: 'Instantly grow 5 segments', apply: (G) => { G.s.len = Math.min(70, G.s.len + 5); } },
  ],
  init(G) {
    G.p.turn = 4.6; G.trail = [{ x: G.p.x, y: G.p.y }]; G.segs = []; G.food = []; G.si = 0;
    for (let i = 0; i < 18; i++) G.food.push(foodSpot(G));
  },
  update(G, dt) {
    const p = G.p, s = G.s;
    const head = G.trail[0];
    if (Math.hypot(p.x - head.x, p.y - head.y) >= 4) {
      G.trail.unshift({ x: p.x, y: p.y });
      const keep = Math.ceil((s.len + 2) * SEG / 4) + 4;
      if (G.trail.length > keep) G.trail.length = keep;
    }
    G.segs = [];
    for (let i = 1; i <= s.len; i++) { const q = G.trail[Math.min(G.trail.length - 1, Math.round(i * SEG / 4))]; G.segs.push(q); }
    for (let i = 0; i < G.food.length; i++) {
      const f = G.food[i];
      if (Math.hypot(f.x - p.x, f.y - p.y) < p.r + 9) {
        s.len = Math.min(70, s.len + 1); G.addXp(0.4); G.sfx('pick');
        G.burst(f.x, f.y, '#ffee58', 6, 90);
        G.food[i] = foodSpot(G);
      }
    }
    G.tm.sf = (G.tm.sf || 0) + dt * s.len / s.rate;
    while (G.tm.sf >= 1) {
      G.tm.sf--;
      const q = G.segs[G.si++ % G.segs.length]; if (!q) break;
      const e = G.nearest(q.x, q.y, s.range); if (!e) continue;
      const a = Math.atan2(e.y - q.y, e.x - q.x);
      G.shoot({ x: q.x, y: q.y, vx: Math.cos(a) * 430, vy: Math.sin(a) * 430, r: 3, dmg: s.dmg, pierce: s.pierce, kb: 40, life: 0.9,
        draw: (ctx, b) => { ctx.strokeStyle = '#84ffff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02); ctx.stroke(); } });
    }
    if (s.spit) G.every('spit', Math.max(0.7, 1.7 - s.spit * 0.2), () => {
      const e = G.nearest(p.x, p.y, 300); if (!e) return;
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      G.shoot({ x: p.x, y: p.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, r: 6, dmg: 10, color: '#76ff03', life: 1,
        onExpire: (b) => G.zone({ x: b.x, y: b.y, r: 28 + s.spit * 6, life: 2.5, dps: 14 + s.spit * 8, slow: 0.25, color: '#64dd17', alpha: 0.4 }) });
    });
  },
  drawUnder(ctx, G) {
    for (const f of G.food) {
      ctx.fillStyle = 'rgba(255,238,88,0.25)'; ctx.beginPath(); ctx.arc(f.x, f.y, 8 + Math.sin(G.time * 5 + f.x) * 2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffee58'; ctx.beginPath(); ctx.arc(f.x, f.y, 4, 0, TAU); ctx.fill();
    }
    const n = G.segs.length;
    for (let i = n - 1; i >= 0; i--) {
      const q = G.segs[i], k = i / Math.max(1, n);
      ctx.fillStyle = 'hsl(' + (120 - k * 40) + ',70%,' + (45 - k * 12) + '%)';
      ctx.beginPath(); ctx.arc(q.x, q.y, 9 - k * 2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#84ffff'; ctx.beginPath(); ctx.arc(q.x, q.y, 2.5, 0, TAU); ctx.fill();
    }
  },
  player: {
    draw(ctx, G, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
      if (Math.sin(G.time * 8) > 0.3) { ctx.strokeStyle = '#ff1744'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(20, 0); ctx.lineTo(24, -3); ctx.moveTo(20, 0); ctx.lineTo(24, 3); ctx.stroke(); }
      ctx.fillStyle = '#43a047'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 11, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(5, -5, 4, 0, TAU); ctx.arc(5, 5, 4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(6.5, -5, 2, 0, TAU); ctx.arc(6.5, 5, 2, 0, TAU); ctx.fill();
      ctx.restore();
    },
  },
});
function foodSpot(G) { return { x: rand(20, G.w - 20), y: rand(G.top + 50, G.bot - 20) }; }

/* =============================== 8. BOUNCE ARENA =============================== */
Horde.register({
  id: 'bounce', cat: CAT, name: 'Bounce Arena', icon: '🔵',
  hook: 'Uncontrollable chain reactions. Slam into giant geometric shapes and split into a spray of high-speed micro-balls that ricochet everywhere.',
  how: 'Drag anywhere to move. Ram shapes when the ring around you is <b>bright</b>. Hitting them while recharging hurts you!',
  bg: '#0d1020', grid: 'rgba(100,140,255,0.08)', gridSize: 32, xpColor: '#69f0ae', killWord: 'shapes shattered',
  player: { r: 14, hp: 100, speed: 165 },
  stats: { micro: 4, ram: 30, ramCd: 0.75, mdmg: 9, chain: 0, burst: 0, mega: 0 },
  enemies: [
    { id: 'sq', r: 15, hp: 26, speed: 52, dmg: 10, xp: 1, w: 8, color: '#42a5f5', draw: poly(4, '#42a5f5') },
    { id: 'tri', r: 12, hp: 16, speed: 85, dmg: 9, xp: 1, w: 6, beh: 'zigzag', color: '#ef5350', draw: poly(3, '#ef5350') },
    { id: 'pent', r: 18, hp: 50, speed: 48, dmg: 13, xp: 3, w: 4, from: 45, beh: 'orbit', color: '#ab47bc', draw: poly(5, '#ab47bc') },
    { id: 'hex', r: 26, hp: 140, speed: 32, dmg: 18, xp: 6, w: 2, from: 100, color: '#ffa726', kbRes: 0.4, draw: poly(6, '#ffa726') },
  ],
  upgrades: [
    { id: 'micro', name: 'Increase Micro-Ball Count', icon: '⚪', max: 5, desc: '+2 micro-balls per split', apply: (G) => { G.s.micro += 2; } },
    { id: 'chain', name: 'Electric Chain', icon: '⚡', max: 4, desc: (l) => (l ? 'Stronger electric links' : 'Micro-balls are linked by lightning that shocks shapes'), apply: (G) => { G.s.chain++; } },
    { id: 'burst', name: 'Speed Burst', icon: '💨', max: 4, desc: (l) => (l ? 'More frequent bursts, more balls' : 'Periodically surge forward and spray micro-balls'), apply: (G) => { G.s.burst++; } },
    { id: 'recover', name: 'Quick Recovery', icon: '🔁', max: 4, desc: 'Ram recharges 20% faster', apply: (G) => { G.s.ramCd *= 0.8; } },
    { id: 'mega', name: 'Mega Mode', icon: '🎈', max: 3, desc: (l) => (l ? 'Mega Mode lasts longer' : 'Every 12s grow huge and invulnerable for a few seconds'), apply: (G) => { G.s.mega++; } },
    { id: 'hard', name: 'Hardened Shell', icon: '💎', max: 5, desc: 'Ram and micro-ball damage +35%', apply: (G) => { G.s.ram *= 1.35; G.s.mdmg *= 1.35; } },
  ],
  onContact(G, e) {
    const p = G.p, s = G.s;
    if (G.tm.megaT > 0 || (G.tm.ramCd || 0) <= 0) {
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      G.damage(e, s.ram, 520, a);
      if ((G.tm.ramCd || 0) <= 0) {
        spawnMicros(G, p.x, p.y, s.micro, a);
        G.tm.ramCd = s.ramCd; p.invuln = Math.max(p.invuln, 0.3);
        p.kx -= Math.cos(a) * 260; p.ky -= Math.sin(a) * 260;
        G.ring(p.x, p.y, 40, '#69f0ae', 0.25); G.sfx('power');
      }
      return true;
    }
    return p.invuln > 0;
  },
  update(G, dt) {
    const p = G.p, s = G.s;
    G.tm.ramCd = (G.tm.ramCd || 0) - dt;
    if (s.mega) {
      G.every('mega', 12, () => { G.tm.megaT = 2 + s.mega; G.banner('MEGA MODE!', '#69f0ae'); });
      G.tm.megaT = (G.tm.megaT || 0) - dt;
    }
    p.r = G.tm.megaT > 0 ? 26 : 14;
    if (G.tm.megaT > 0) p.invuln = Math.max(p.invuln, 0.05);
    if (s.burst) {
      G.every('burst', Math.max(2.5, 6.5 - s.burst), () => { G.tm.burstT = 0.55; spawnMicros(G, p.x, p.y, 3 + s.burst * 2, null); });
      if (G.tm.burstT > 0) { G.tm.burstT -= dt; p.boost = 2.3; }
    }
    if (s.chain) {
      const m = G.bullets.filter((b) => b.micro);
      G.links = [];
      for (let i = 0; i + 1 < m.length; i++) {
        const a = m[i], b = m[i + 1], L = Math.hypot(a.x - b.x, a.y - b.y);
        if (L > 170) continue;
        G.links.push([a, b]);
        G.query((a.x + b.x) / 2, (a.y + b.y) / 2, L / 2 + 8, (e) => {
          if (G.segDist(e.x, e.y, a.x, a.y, b.x, b.y) < e.r + 4) G.damage(e, (22 + s.chain * 18) * dt, 0, 0, true);
        });
      }
    }
  },
  drawOver(ctx, G) {
    if (G.links && G.links.length) {
      ctx.strokeStyle = 'rgba(140,220,255,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (const [a, b] of G.links) {
        ctx.moveTo(a.x, a.y);
        const mx = (a.x + b.x) / 2 + rand(-6, 6), my = (a.y + b.y) / 2 + rand(-6, 6);
        ctx.lineTo(mx, my); ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
    }
  },
  player: {
    draw(ctx, G, p) {
      const ready = (G.tm.ramCd || 0) <= 0 || G.tm.megaT > 0;
      const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r * 1.8);
      g.addColorStop(0, '#fff'); g.addColorStop(0.45, G.tm.megaT > 0 ? '#69f0ae' : '#40c4ff'); g.addColorStop(1, 'rgba(64,196,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.8, 0, TAU); ctx.fill();
      ctx.strokeStyle = ready ? '#fff' : 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
      const k = ready ? 1 : 1 - Math.max(0, G.tm.ramCd) / G.s.ramCd;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
    },
  },
});
function spawnMicros(G, x, y, n, base) {
  const s = G.s;
  for (let i = 0; i < n; i++) {
    const a = base == null ? i / n * TAU : base + Math.PI + rand(-1.4, 1.4);
    const col = 'hsl(' + randInt(140, 300) + ',100%,65%)';
    G.shoot({ x, y, vx: Math.cos(a) * 480, vy: Math.sin(a) * 480, r: 5, dmg: s.mdmg, pierce: 999, rehit: 0.3, bounce: true, life: 2.6, kb: 120, micro: true, color: col,
      onHit: (b, e) => { const na = Math.atan2(b.y - e.y, b.x - e.x) + rand(-0.4, 0.4), sp = Math.hypot(b.vx, b.vy); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; } });
  }
}

/* =============================== 9. PAC-HORDE =============================== */
const ghostCache = new Map();
function ghostSprite(color, size) {
  const k = color + size;
  let c = ghostCache.get(k);
  if (c) return c;
  c = document.createElement('canvas');
  const d = Math.min(2, window.devicePixelRatio || 1);
  c.width = c.height = Math.ceil(size * 2 * d);
  const x = c.getContext('2d'); x.scale(d, d);
  const r = size * 0.5, cx = size, cy = size;
  x.fillStyle = color;
  x.beginPath(); x.arc(cx, cy - r * 0.2, r, Math.PI, 0); x.lineTo(cx + r, cy + r * 0.8);
  for (let i = 0; i < 4; i++) { const xx = cx + r - (i + 0.5) * r / 2; x.lineTo(xx, cy + r * (i % 2 ? 0.8 : 0.5)); }
  x.lineTo(cx - r, cy + r * 0.8); x.closePath(); x.fill();
  if (color !== '#2333ff' && color !== '#ffffff') {
    x.fillStyle = '#fff'; x.beginPath(); x.arc(cx - r * 0.35, cy - r * 0.25, r * 0.28, 0, TAU); x.arc(cx + r * 0.35, cy - r * 0.25, r * 0.28, 0, TAU); x.fill();
    x.fillStyle = '#1a237e'; x.beginPath(); x.arc(cx - r * 0.28, cy - r * 0.2, r * 0.14, 0, TAU); x.arc(cx + r * 0.42, cy - r * 0.2, r * 0.14, 0, TAU); x.fill();
  } else {
    x.fillStyle = color === '#ffffff' ? '#f44336' : '#ffe0b2';
    x.fillRect(cx - r * 0.45, cy - r * 0.35, r * 0.2, r * 0.2); x.fillRect(cx + r * 0.25, cy - r * 0.35, r * 0.2, r * 0.2);
  }
  c.size = size * 2; ghostCache.set(k, c);
  return c;
}
const ghost = (color) => (ctx, e, G) => {
  let col = color;
  if (G.flee && !e.elite) col = G.tm.chompT < 1.2 && Math.floor(G.time * 8) % 2 ? '#ffffff' : '#2333ff';
  const sz = Math.round(e.r * 2.2), s = ghostSprite(col, sz);
  ctx.drawImage(s, e.x - s.size / 2, e.y - s.size / 2 + Math.sin(G.time * 10 + e.ph) * 1.5, s.size, s.size);
};
Horde.register({
  id: 'pac', cat: CAT, name: 'Pac-Horde', icon: '👻',
  hook: 'The hunted becomes the hunter. Hundreds of ghosts pour in from the edges. Gobble dots to power up a Chomp Mode that disintegrates them on contact.',
  how: 'Drag anywhere to move. Every <b>10 dots</b> triggers Chomp Mode: ghosts flee and you eat them on touch. Grab 🍒 for a screen wipe.',
  bg: '#000', xpColor: '#ff80ab', killWord: 'ghosts chomped', overText: 'GAME OVER',
  player: { r: 14, hp: 100, speed: 165 },
  noGeneric: ['dmg'],
  spawn: { base: 1.6, cap: 340, max: 18, waveText: 'GHOST STAMPEDE!' },
  hpScale: () => 1,
  stats: { need: 10, chomp: 4, dotMag: 6, cherry: 0, chain: 0 },
  enemies: [
    { id: 'blinky', r: 12, hp: 1, speed: 62, dmg: 10, xp: 1, w: 6, color: '#ff1744', draw: ghost('#ff1744') },
    { id: 'pinky', r: 12, hp: 1, speed: 55, dmg: 10, xp: 1, w: 6, beh: 'zigzag', color: '#ff80ab', draw: ghost('#ff80ab') },
    { id: 'inky', r: 12, hp: 1, speed: 58, dmg: 10, xp: 1, w: 5, beh: 'orbit', color: '#00e5ff', draw: ghost('#00e5ff') },
    { id: 'clyde', r: 12, hp: 1, speed: 48, dmg: 10, xp: 1, w: 5, from: 20, color: '#ffab40', draw: ghost('#ffab40') },
    { id: 'king', r: 16, hp: 60, speed: 52, dmg: 16, xp: 3, w: 1, from: 90, color: '#b388ff', draw: ghost('#b388ff') },
  ],
  upgrades: [
    { id: 'extend', name: 'Extended Chomp Mode', icon: '⏳', max: 5, desc: 'Chomp Mode lasts 1.2s longer', apply: (G) => { G.s.chomp += 1.2; } },
    { id: 'cherry', name: 'Cherry Bomb', icon: '🍒', max: 4, desc: (l) => (l ? 'Cherries appear more often' : 'Cherries appear on the field. Eat one to wipe out every ghost on screen'), apply: (G) => { G.s.cherry++; } },
    { id: 'magnet', name: 'Magnet Aura', icon: '🧲', max: 4, desc: 'Grab dots and fruit from much further away', apply: (G) => { G.s.dotMag += 22; G.p.magnet *= 1.3; } },
    { id: 'hungry', name: 'Big Appetite', icon: '😋', max: 4, desc: 'Need one fewer dot to trigger Chomp Mode', apply: (G) => { G.s.need = Math.max(5, G.s.need - 1); } },
    { id: 'chain', name: 'Ghost Chain', icon: '🔗', max: 3, desc: 'Each ghost eaten extends Chomp Mode a little', apply: (G) => { G.s.chain++; } },
  ],
  init(G) {
    G.dots = []; G.dc = 0; G.cherries = []; G.tm.chompT = 0;
    for (let i = 0; i < 45; i++) G.dots.push(dotSpot(G));
  },
  onContact(G, e) {
    if (G.tm.chompT > 0) {
      if (e.elite) { G.melee(e.x, e.y, 1, 40, 300, 0.25, 'chomp'); return true; }
      G.kill(e);
      if (G.s.chain) G.tm.chompT = Math.min(G.tm.chompT + 0.05 * G.s.chain, G.s.chomp + 2);
      return true;
    }
    return false;
  },
  update(G, dt) {
    const p = G.p, s = G.s;
    G.tm.chompT = Math.max(0, G.tm.chompT - dt);
    G.flee = G.tm.chompT > 0;
    if (G.flee) p.boost = 1.12;
    const reach = p.r + 4 + s.dotMag;
    for (let i = 0; i < G.dots.length; i++) {
      const d = G.dots[i], dist = Math.hypot(d.x - p.x, d.y - p.y);
      if (s.dotMag > 6 && dist < reach + 40) { d.x += (p.x - d.x) * dt * 6; d.y += (p.y - d.y) * dt * 6; }
      if (dist < reach) {
        G.dots[i] = dotSpot(G); G.addXp(0.3); G.sfx('pick');
        if (++G.dc >= s.need) { G.dc = 0; G.tm.chompT = s.chomp; G.banner('CHOMP!', '#ffeb3b'); G.sfx('power'); }
      }
    }
    if (s.cherry) G.every('cherry', Math.max(8, 22 - s.cherry * 4), () => { if (G.cherries.length < 2) G.cherries.push(dotSpot(G)); });
    for (let i = G.cherries.length - 1; i >= 0; i--) {
      const c = G.cherries[i];
      if (Math.hypot(c.x - p.x, c.y - p.y) < p.r + 14 + s.dotMag) {
        G.cherries.splice(i, 1);
        for (const e of G.enemies) if (!e.dead && G.onScreen(e, 20)) { if (e.elite) G.damage(e, 150); else G.kill(e); }
        G.fxDraw(0.4, (ctx, k) => { ctx.fillStyle = 'rgba(255,255,255,' + k * 0.7 + ')'; ctx.fillRect(0, 0, G.w, G.h); });
        G.banner('CHERRY BOMB!', '#ff5252'); G.sfx('boom'); G.shake = 10;
      }
    }
  },
  drawBg(ctx, G) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, G.w, G.h);
    ctx.strokeStyle = '#1a2cff'; ctx.lineWidth = 3;
    ctx.strokeRect(6, G.top + 4, G.w - 12, G.bot - G.top - 10);
    ctx.strokeStyle = 'rgba(40,60,255,0.35)';
    const cs = 90;
    for (let x = cs; x < G.w - 40; x += cs) for (let y = G.top + cs; y < G.bot - 40; y += cs) {
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 18, y - 6, 36, 12, 6) : ctx.rect(x - 18, y - 6, 36, 12); ctx.stroke();
    }
  },
  drawUnder(ctx, G) {
    ctx.fillStyle = '#ffd7b5';
    for (const d of G.dots) { ctx.fillRect(d.x - 2.5, d.y - 2.5, 5, 5); }
    for (const c of G.cherries) Horde.drawEmoji(ctx, '🍒', c.x, c.y, 24 + Math.sin(G.time * 6) * 3);
  },
  hud(ctx, G, y) {
    Horde.text(ctx, '● ' + G.dc + '/' + G.s.need, 12, y, 14, '#ffd7b5');
    if (G.tm.chompT > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(G.w / 2 - 60, y - 5, 120, 10);
      ctx.fillStyle = '#ffeb3b'; ctx.fillRect(G.w / 2 - 59, y - 4, 118 * G.tm.chompT / G.s.chomp, 8);
    }
  },
  player: {
    draw(ctx, G, p) {
      const m = (Math.sin(G.time * 18) * 0.5 + 0.5) * 0.7 + 0.05;
      const r = p.r * (G.tm.chompT > 0 ? 1.25 : 1);
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.arc(p.x, p.y, r, p.ang + m, p.ang + TAU - m); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(p.x + Math.cos(p.ang - 1.2) * r * 0.5, p.y + Math.sin(p.ang - 1.2) * r * 0.5, 2, 0, TAU); ctx.fill();
    },
  },
});
function dotSpot(G) { return { x: rand(20, G.w - 20), y: rand(G.top + 50, G.bot - 20) }; }

/* =============================== 10. PIXEL DEFENDER =============================== */
const pixelBullet = (ctx, b) => { ctx.fillStyle = b.color; ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2); };
Horde.register({
  id: 'pixel', cat: CAT, name: 'Pixel Defender', icon: '⬜',
  hook: 'Ultraminimalist geometric arcade fun. You are a tiny white pixel. Colored polygons close in from every side, and you shatter them with streams of pixel shards.',
  how: 'Drag anywhere to move. You fire in 4 directions automatically. Upgrade to 8-way fire and orbital shields.',
  bg: '#000', xpColor: '#fff', killWord: 'polygons shattered',
  player: { r: 9, hp: 100, speed: 155 },
  stats: { rate: 0.3, dirs: 4, pierce: 0, dmg: 10, orbit: 0, frost: 0 },
  enemies: [
    { id: 'tri', r: 11, hp: 14, speed: 80, dmg: 9, xp: 1, w: 7, color: '#ff4081', draw: poly(3, '#ff4081', '#000') },
    { id: 'sq', r: 12, hp: 22, speed: 58, dmg: 10, xp: 1, w: 8, color: '#40c4ff', draw: poly(4, '#40c4ff', '#000') },
    { id: 'pent', r: 14, hp: 34, speed: 62, dmg: 12, xp: 2, w: 4, from: 40, beh: 'zigzag', color: '#ffff00', draw: poly(5, '#ffff00', '#000') },
    { id: 'hex', r: 18, hp: 80, speed: 42, dmg: 15, xp: 4, w: 3, from: 90, color: '#76ff03', draw: poly(6, '#76ff03', '#000') },
    { id: 'oct', r: 22, hp: 160, speed: 34, dmg: 20, xp: 7, w: 1, from: 150, color: '#e040fb', kbRes: 0.5, draw: poly(8, '#e040fb', '#000') },
  ],
  upgrades: [
    { id: 'diag', name: 'Fire Diagonally', icon: '✳️', max: 2, desc: (l) => (l ? '12-way shot' : '8-way shot'), apply: (G, l) => { G.s.dirs = l === 1 ? 8 : 12; } },
    { id: 'orbit', name: 'Orbital Square', icon: '🔳', max: 4, desc: (l) => (l ? 'One more orbiting square' : 'Two squares orbit you, shattering anything they touch'), apply: (G) => { G.s.orbit++; } },
    { id: 'pierce', name: 'Piercing Projectiles', icon: '➡️', max: 4, desc: 'Shards pierce one more enemy', apply: (G) => { G.s.pierce++; } },
    { id: 'frost', name: 'Frost Squares', icon: '❄️', max: 3, desc: 'Shards freeze enemies, slowing them', apply: (G) => { G.s.frost++; } },
    { id: 'clock', name: 'Overclock', icon: '⏱️', max: 5, desc: 'Fire rate +18%', apply: (G) => { G.s.rate /= 1.18; } },
    { id: 'big', name: 'Bigger Pixels', icon: '🟥', max: 5, desc: 'Shard damage +30%', apply: (G) => { G.s.dmg *= 1.3; } },
  ],
  update(G, dt) {
    const p = G.p, s = G.s;
    G.every('fire', s.rate, () => {
      const off = s.dirs === 4 ? 0 : 0;
      for (let i = 0; i < s.dirs; i++) {
        const a = off + i / s.dirs * TAU;
        G.shoot({ x: p.x, y: p.y, vx: Math.cos(a) * 470, vy: Math.sin(a) * 470, r: 3, dmg: s.dmg, pierce: s.pierce, kb: 70, life: 1.4,
          color: s.frost ? '#80d8ff' : '#fff', slow: s.frost ? 0.2 + s.frost * 0.12 : 0, slowT: 1.2, draw: pixelBullet });
      }
    });
    if (s.orbit) {
      const n = s.orbit + 1;
      G.tm.oa = (G.tm.oa || 0) + dt * 3.2;
      for (let i = 0; i < n; i++) {
        const a = G.tm.oa + i * TAU / n;
        G.melee(p.x + Math.cos(a) * 46, p.y + Math.sin(a) * 46, 8, 16 + s.orbit * 4, 220, 0.3, 'orb' + i);
      }
    }
  },
  drawOver(ctx, G) {
    const p = G.p, s = G.s;
    if (!s.orbit) return;
    const n = s.orbit + 1;
    ctx.fillStyle = '#fff';
    for (let i = 0; i < n; i++) {
      const a = G.tm.oa + i * TAU / n, x = p.x + Math.cos(a) * 46, y = p.y + Math.sin(a) * 46;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a * 2); ctx.fillRect(-6, -6, 12, 12); ctx.restore();
    }
  },
  player: {
    draw(ctx, G, p) {
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(p.x - 13, p.y - 13, 26, 26);
      ctx.fillStyle = '#fff'; ctx.fillRect(p.x - 8, p.y - 8, 16, 16);
    },
  },
});
})();
