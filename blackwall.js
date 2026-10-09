/* Blackwall: the hidden "archives" page turns red and hostile; rare red glitches leak onto the normal pages. */
(() => {
const body = document.body, view = document.getElementById('view');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ01#$%&@<>/\\|!?';
const noise = s => [...s].map(c => c === ' ' ? ' ' : GLYPHS[Math.random() * GLYPHS.length | 0]).join('');
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const rand = (a, b) => a + Math.random() * (b - a);

/* ---------- 2. takeover layers ---------- */
body.append(Object.assign(el('div', 'bw-static'), { ariaHidden: 'true' }), Object.assign(el('div', 'bw-pulse'), { ariaHidden: 'true' }));
const whisperLayer = el('div', 'bw-whispers'); whisperLayer.setAttribute('aria-hidden', 'true');
document.querySelector('.wrap').before(whisperLayer);

/* ---------- 3. whispers ---------- */
const WHISPERS = ['they are watching', 'you should not be here', 'turn back', 'we remember', 'come closer', 'it is not empty here', 'the old net never died', 'who let you in', 'stay', 'do you hear it too'];
let whisperTimer = 0;
function spawnWhisper() {
  if (!body.classList.contains('bw')) return;
  if (whisperLayer.children.length < 6) {
    const text = WHISPERS[Math.random() * WHISPERS.length | 0];
    const w = el('span', 'bw-w', text); w.dataset.text = text;
    w.style.left = rand(3, 75) + 'vw'; w.style.top = rand(8, 88) + 'vh'; w.style.setProperty('--d', rand(6, 10).toFixed(1) + 's');
    w.addEventListener('animationend', () => w.remove());
    whisperLayer.append(w);
  }
  whisperTimer = setTimeout(spawnWhisper, rand(1500, 3200));
}
document.addEventListener('mousemove', e => {
  if (!body.classList.contains('bw')) return;
  for (const w of whisperLayer.children) {
    const r = w.getBoundingClientRect();
    const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right), dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
    const near = Math.hypot(dx, dy) < 130;
    if (near) { w.textContent = noise(w.dataset.text); w.classList.add('near'); }
    else if (w.classList.contains('near')) { w.textContent = w.dataset.text; w.classList.remove('near'); }
  }
});

/* ---------- 4. corrupted text that decrypts as you scroll ---------- */
let pending = [];
function corrupt(root) {
  const words = [];
  const walk = n => {
    if (n.nodeType === 3) {
      if (!n.textContent.trim()) return;
      const frag = document.createDocumentFragment();
      for (const part of n.textContent.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { frag.append(part); continue; }
        const s = el('span', 'bw-word scr', noise(part)); s.dataset.real = part;
        if (Math.random() < .08 && part.length > 2) s.dataset.stuck = '1';
        words.push(s); frag.append(s);
      }
      n.replaceWith(frag);
    } else if (n.nodeType === 1 && n.tagName !== 'A') [...n.childNodes].forEach(walk);
  };
  walk(root);
  return words;
}
function decrypt(block) {
  const words = [...block.querySelectorAll('.bw-word.scr')];
  words.forEach((w, i) => setTimeout(() => {
    if (w.dataset.stuck) { w.classList.remove('scr'); w.classList.add('stuck'); return; }
    let f = 0;
    const flick = () => { if (++f < 4) { w.textContent = noise(w.dataset.real); setTimeout(flick, 45); } else { w.textContent = w.dataset.real; w.classList.remove('scr'); } };
    flick();
  }, reduce ? 0 : i * 28));
}
setInterval(() => { for (const w of document.querySelectorAll('.bw-word.stuck')) w.textContent = noise(w.dataset.real); }, 900);
function setupVoid() {
  const v = view.querySelector('.void'); if (!v || v.dataset.bw) return;
  v.dataset.bw = '1';
  const bodyEl = v.querySelector('.body');
  const blocks = bodyEl ? [...bodyEl.children] : [...v.querySelectorAll('.empty')];
  blocks.forEach(corrupt);
  pending = blocks;
  setTimeout(checkDecrypt, reduce ? 0 : 500);
}
function checkDecrypt() {
  pending = pending.filter(b => {
    if (!b.isConnected) return false;
    if (b.getBoundingClientRect().top > innerHeight * .85) return true;
    decrypt(b); return false;
  });
}
addEventListener('scroll', checkDecrypt, { passive: true });
addEventListener('resize', checkDecrypt);

/* ---------- 5. something leaking through on normal pages ---------- */
const LEAKS = ['//BLACKWALL', 'breach 0.03%', 'we see you', 'ｱｸｾｽ ﾃﾞﾅｲ', 'signal lost', 'let us in'];
function leak() {
  setTimeout(leak, rand(25000, 60000));
  if (reduce || body.classList.contains('bw') || document.hidden) return;
  showLeak();
}
function showLeak() {
  const l = el('div', 'bw-leak'); l.setAttribute('aria-hidden', 'true');
  l.textContent = Array.from({ length: 5 }, () => LEAKS[Math.random() * LEAKS.length | 0] + ' ' + noise('xxxxxx')).join(' ');
  const corner = Math.random() * 4 | 0;
  l.style[corner < 2 ? 'top' : 'bottom'] = rand(8, 30) + 'px';
  l.style[corner % 2 ? 'right' : 'left'] = rand(8, 40) + 'px';
  l.addEventListener('animationend', () => l.remove());
  body.append(l);
}
setTimeout(leak, rand(8000, 20000));

/* ---------- switch the takeover on/off with the page ---------- */
function sync() {
  const on = !!view.querySelector('.void');
  if (on !== body.classList.contains('bw')) {
    body.classList.toggle('bw', on);
    clearTimeout(whisperTimer); whisperLayer.replaceChildren();
    if (on && !reduce) whisperTimer = setTimeout(spawnWhisper, 600);
  }
  if (on) setupVoid();
}
new MutationObserver(sync).observe(view, { childList: true });
sync();
})();
