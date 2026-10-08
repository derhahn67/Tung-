/* Site-wide cookie notice with a very large Accept button. Shown once; the choice is remembered in localStorage.
   The site doesn't use tracking cookies: it only keeps game progress (scores, chips) in this browser. */
(() => {
  'use strict';
  const KEY = 'site-cookie-consent';
  try { if (localStorage.getItem(KEY)) return; } catch (e) { /* storage blocked: show the notice anyway */ }
  const show = () => {
    if (document.getElementById('cookieWall')) return;
    const css = document.createElement('style');
    css.textContent = `
      #cookieWall { position: fixed; inset: 0; z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 16px;
        padding-top: max(16px, env(safe-area-inset-top)); padding-bottom: max(16px, env(safe-area-inset-bottom));
        background: rgba(10,8,4,.82); font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #fff; }
      #cookieWall .cw-box { width: 100%; max-width: 560px; max-height: 100%; overflow-y: auto; text-align: center; background: #3e2723; border: 4px solid #ffcc80;
        border-radius: 26px; padding: 22px 18px; box-shadow: 0 20px 60px rgba(0,0,0,.6); }
      #cookieWall .cw-emoji { font-size: 72px; line-height: 1; animation: cwSpin 3s linear infinite; display: inline-block; }
      #cookieWall h2 { margin: 10px 0 6px; font-size: 26px; color: #ffcc80; }
      #cookieWall p { margin: 0 0 16px; font-size: 14px; line-height: 1.45; color: #efebe9; }
      #cookieWall .cw-yes { display: block; width: 100%; min-height: 34vh; border: none; border-radius: 22px; cursor: pointer;
        background: radial-gradient(circle at 30% 25%, #ffe0b2, #ffb74d 45%, #e65100); color: #3e2723;
        font: 900 clamp(34px, 9vw, 64px)/1.05 system-ui, -apple-system, sans-serif; letter-spacing: 1px; text-shadow: 0 2px 0 rgba(255,255,255,.5);
        border-bottom: 10px solid #bf360c; box-shadow: 0 12px 30px rgba(230,81,0,.55); animation: cwPulse 1.1s ease-in-out infinite;
        touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
      #cookieWall .cw-yes:active { transform: translateY(6px) scale(.98); border-bottom-width: 4px; }
      #cookieWall .cw-yes small { display: block; font-size: clamp(14px, 3.5vw, 20px); font-weight: 800; margin-top: 8px; }
      #cookieWall .cw-no { margin-top: 12px; background: none; border: none; color: #bcaaa4; text-decoration: underline; font-size: 13px; cursor: pointer; padding: 8px; }
      @keyframes cwPulse { 50% { transform: scale(1.035); } }
      @keyframes cwSpin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { #cookieWall .cw-yes, #cookieWall .cw-emoji { animation: none; } }`;
    document.head.appendChild(css);
    const w = document.createElement('div');
    w.id = 'cookieWall';
    w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-labelledby', 'cwTitle');
    w.innerHTML = '<div class="cw-box"><div class="cw-emoji">🍪</div><h2 id="cwTitle">We have cookies!</h2>' +
      '<p>This site saves your game progress (best scores, levels and play-money chips) in your browser. No tracking, no ads, nothing leaves your device.</p>' +
      '<button class="cw-yes" type="button">🍪 ACCEPT<br>COOKIES<small>yum, let me play</small></button>' +
      '<button class="cw-no" type="button">Only necessary</button></div>';
    const close = (v) => {
      try { localStorage.setItem(KEY, v); } catch (e) { /* ignore */ }
      w.remove(); css.remove();
    };
    w.querySelector('.cw-yes').onclick = () => close('all');
    w.querySelector('.cw-no').onclick = () => close('necessary');
    document.body.appendChild(w);
    w.querySelector('.cw-yes').focus();
  };
  if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
})();
