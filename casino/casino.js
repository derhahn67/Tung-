/* Play-money casino core: shared Chips wallet, top bar, bet picker, cards and poker hand evaluation.
   Chips are fake: they have no real-world value, can't be bought or cashed out, and refill for free. */
(() => {
'use strict';
const KEY = 'casino-wallet', START = 1000, REFILL = 1000, REFILL_BELOW = 100, DAILY = 500, DAY = 24 * 3600 * 1000;
const C = window.Casino = {};

C.fmt = (n) => Math.floor(n).toLocaleString('en-US');
C.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
C.rand = (n) => Math.floor(Math.random() * n);

/* ---------------------------------------------------------------- wallet */
function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    if (v && typeof v.bal === 'number' && isFinite(v.bal) && v.bal >= 0) return v;
  } catch (e) { /* storage unavailable */ }
  return { bal: START, best: 0, daily: 0, played: 0 };
}
let st = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode: balance lives for this page only */ }
  render();
}
window.addEventListener('storage', (e) => { if (e.key === KEY) { st = load(); render(); } });

Object.defineProperty(C, 'balance', { get: () => st.bal });
/* Takes a stake from the wallet. Returns false (and says why) if it can't be covered. */
C.bet = (n) => {
  n = Math.floor(n);
  if (!(n > 0)) return false;
  if (n > st.bal) { C.toast('Not enough chips. Tap your balance for free chips.'); return false; }
  st.bal -= n; st.played = (st.played || 0) + 1; save(); C.sfx('chip');
  return true;
};
/* Pays chips back into the wallet. `stake` is only used to track the biggest profit. */
C.pay = (n, stake = 0) => {
  n = Math.floor(n);
  if (n <= 0) return;
  st.bal += n;
  if (n - stake > (st.best || 0)) st.best = n - stake;
  save(); bump();
};
C.canRefill = () => st.bal < REFILL_BELOW;
C.dailyReady = () => Date.now() - (st.daily || 0) >= DAY;

/* ----------------------------------------------------------------- audio */
let AC = null;
C.muted = false;
try { C.muted = localStorage.getItem('casino-muted') === '1'; } catch (e) { /* ignore */ }
C.sfx = (kind) => {
  if (C.muted) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const notes = { chip: [[900, 0.04]], card: [[500, 0.03]], win: [[660, 0.1], [880, 0.1], [1320, 0.18]], lose: [[300, 0.12], [200, 0.2]], tick: [[1200, 0.015]], big: [[523, 0.1], [659, 0.1], [784, 0.1], [1046, 0.3]] }[kind];
    if (!notes) return;
    let t = AC.currentTime;
    for (const [f, d] of notes) {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = kind === 'lose' ? 'sawtooth' : 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
      t += d * 0.8;
    }
  } catch (e) { /* no audio */ }
};

/* -------------------------------------------------------------- top bar UI */
let balEl = null, modal = null, toastEl = null, toastT = 0;
function render() {
  if (balEl) balEl.innerHTML = '🪙 ' + C.fmt(st.bal);
  if (modal && modal.classList.contains('show')) fillWallet();
}
function bump() { if (!balEl) return; balEl.classList.remove('bump'); void balEl.offsetWidth; balEl.classList.add('bump'); }
C.toast = (msg) => {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
  toastEl.textContent = msg; toastEl.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2200);
};
function fillWallet() {
  const left = Math.max(0, DAY - (Date.now() - (st.daily || 0)));
  modal.querySelector('.big').textContent = '🪙 ' + C.fmt(st.bal);
  modal.querySelector('.best').textContent = 'Biggest win: ' + C.fmt(st.best || 0) + ' · Rounds played: ' + C.fmt(st.played || 0);
  const r = modal.querySelector('.refill');
  r.disabled = !C.canRefill();
  r.textContent = C.canRefill() ? 'Get ' + C.fmt(REFILL) + ' free chips' : 'Free refill when under ' + REFILL_BELOW;
  const d = modal.querySelector('.daily');
  d.disabled = !C.dailyReady();
  d.textContent = C.dailyReady() ? 'Daily bonus: +' + DAILY : 'Daily bonus in ' + Math.ceil(left / 3600000) + 'h';
}
C.openWallet = () => { fillWallet(); modal.classList.add('show'); };
C.header = (title, icon, home = 'index.html') => {
  const h = document.createElement('header');
  h.className = 'top';
  h.innerHTML = '<a class="back" href="' + home + '">← ' + (home === 'index.html' ? 'Casino' : 'Games') + '</a><h1>' + (icon ? icon + ' ' : '') + title +
    '</h1><button class="bal" title="Wallet"></button>';
  document.body.prepend(h);
  balEl = h.querySelector('.bal');
  balEl.onclick = C.openWallet;
  modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = '<div class="box"><h2>Your Chips</h2><div class="big"></div><p class="muted best"></p>' +
    '<div class="col"><button class="btn gold refill"></button><button class="btn daily"></button><button class="btn small mute"></button><button class="btn small close">Close</button></div>' +
    '<p class="muted" style="margin-top:12px">Chips are <b>play money</b>. They have no real value and can\'t be bought, sold or cashed out. Run out? Refill for free.</p></div>';
  document.body.appendChild(modal);
  modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('show'); };
  modal.querySelector('.close').onclick = () => modal.classList.remove('show');
  modal.querySelector('.refill').onclick = () => { if (C.canRefill()) { st.bal += REFILL; save(); bump(); C.sfx('win'); C.toast('+' + C.fmt(REFILL) + ' free chips!'); } };
  modal.querySelector('.daily').onclick = () => { if (C.dailyReady()) { st.bal += DAILY; st.daily = Date.now(); save(); bump(); C.sfx('win'); C.toast('+' + DAILY + ' daily bonus!'); } };
  const mute = modal.querySelector('.mute');
  const ml = () => { mute.textContent = C.muted ? '🔇 Sound off' : '🔊 Sound on'; };
  mute.onclick = () => { C.muted = !C.muted; try { localStorage.setItem('casino-muted', C.muted ? '1' : '0'); } catch (e) { /* ignore */ } ml(); };
  ml();
  render();
  if (C.canRefill()) setTimeout(() => C.toast('Low on chips? Tap your balance for a free refill.'), 600);
};

/* --------------------------------------------------------------- bet box */
/* Renders "Bet: [-] 50 [+] ½ ×2 Max" into `el`. Returns { value, set(n), disable(bool) }. */
C.betBox = (el, opts = {}) => {
  const steps = opts.steps || [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
  const min = opts.min || steps[0];
  let v = opts.init || 50;
  try { const s = parseInt(localStorage.getItem('casino-bet-' + (opts.key || 'x')), 10); if (s >= min) v = s; } catch (e) { /* ignore */ }
  el.classList.add('betbox');
  el.innerHTML = '<span class="label">' + (opts.label || 'Bet') + '</span><button class="btn small dn">−</button><span class="amt"></span><button class="btn small up">+</button>' +
    '<button class="btn small half">½</button><button class="btn small dbl">×2</button><button class="btn small max">Max</button>';
  const amt = el.querySelector('.amt'), btns = el.querySelectorAll('button');
  const set = (n) => {
    v = Math.max(min, Math.floor(n));
    amt.textContent = '🪙 ' + C.fmt(v);
    try { localStorage.setItem('casino-bet-' + (opts.key || 'x'), String(v)); } catch (e) { /* ignore */ }
    if (opts.onChange) opts.onChange(v);
  };
  el.querySelector('.dn').onclick = () => { const s = steps.filter((x) => x < v); set(s.length ? s[s.length - 1] : min); };
  el.querySelector('.up').onclick = () => { const s = steps.find((x) => x > v); set(s || v * 2); };
  el.querySelector('.half').onclick = () => set(v / 2);
  el.querySelector('.dbl').onclick = () => set(v * 2);
  el.querySelector('.max').onclick = () => set(Math.max(min, st.bal));
  set(v);
  return { get value() { return v; }, set, disable(b) { btns.forEach((x) => { x.disabled = b; }); } };
};

/* ------------------------------------------------------------------ cards */
const RANKS = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }, SUITS = ['♠', '♥', '♦', '♣'];
C.rankLabel = (r) => RANKS[r] || String(r);
C.newDeck = (decks = 1) => {
  const d = [];
  for (let k = 0; k < decks; k++) for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ r, s });
  for (let i = d.length - 1; i > 0; i--) { const j = C.rand(i + 1); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
};
C.cardEl = (c, down) => {
  const e = document.createElement('div');
  e.className = 'card' + (c.s === 1 || c.s === 2 ? ' red' : '') + (down ? ' down' : '');
  e.innerHTML = '<span class="tl">' + C.rankLabel(c.r) + '<br>' + SUITS[c.s] + '</span><span class="mid">' + SUITS[c.s] + '</span>';
  return e;
};
C.cardText = (c) => C.rankLabel(c.r) + SUITS[c.s];

/* Poker hand evaluation: higher score wins. Works on 5–7 cards (best five). */
const HAND_NAMES = ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush'];
function eval5(cs) {
  const rs = cs.map((c) => c.r).sort((a, b) => b - a);
  const flush = cs.length === 5 && cs.every((c) => c.s === cs[0].s);
  const uniq = [...new Set(rs)];
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (rs[0] - rs[4] === 4) straightHigh = rs[0];
    else if (rs[0] === 14 && rs[1] === 5) straightHigh = 5;
  }
  const cnt = {};
  for (const r of rs) cnt[r] = (cnt[r] || 0) + 1;
  const groups = Object.entries(cnt).map(([r, n]) => [n, +r]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const kick = groups.map((g) => g[1]);
  let cat;
  if (straightHigh && flush) cat = straightHigh === 14 ? 9 : 8;
  else if (groups[0][0] === 4) cat = 7;
  else if (groups[0][0] === 3 && groups[1] && groups[1][0] === 2) cat = 6;
  else if (flush) cat = 5;
  else if (straightHigh) cat = 4;
  else if (groups[0][0] === 3) cat = 3;
  else if (groups[0][0] === 2 && groups[1] && groups[1][0] === 2) cat = 2;
  else if (groups[0][0] === 2) cat = 1;
  else cat = 0;
  const tb = straightHigh && (cat === 4 || cat >= 8) ? [straightHigh] : kick;
  let score = cat;
  for (let i = 0; i < 5; i++) score = score * 15 + (tb[i] || 0);
  return { score, cat, name: HAND_NAMES[cat] };
}
C.evalHand = (cards) => {
  if (cards.length <= 5) return eval5(cards);
  let best = null;
  const n = cards.length, pick = [];
  (function rec(i) {
    if (pick.length === 5) { const e = eval5(pick); if (!best || e.score > best.score) best = e; return; }
    for (let k = i; n - k >= 5 - pick.length; k++) { pick.push(cards[k]); rec(k + 1); pick.pop(); }
  })(0);
  return best;
};
C.HAND_NAMES = HAND_NAMES;
})();
