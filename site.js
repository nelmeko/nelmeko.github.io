/* nely online — behaviour. You rarely need to edit this file; content lives in _data and _posts. */
(() => {
const $ = (s, r = document) => r.querySelector(s);
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

document.getElementById('logo').addEventListener('click', () => go('home'));
const SECTIONS = ['home', 'about', 'apps', 'projects', 'works', 'board', 'shelf', 'log', 'guestbook'];
const PROJ_TYPES = ['video', 'zine', 'writing', 'music', 'art series', 'build', 'game', 'collab', 'other'];
const PROJ_STATUS = ['ongoing', 'finished', 'paused', 'idea'];
const NAV = ['home', 'about', 'works', 'board', 'shelf', 'guestbook'];
let ddOpen = false;
const canHover = matchMedia('(hover: hover)').matches;
document.addEventListener('click', () => { if (ddOpen) { ddOpen = false; render(); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && ddOpen) { ddOpen = false; render(); } });
const WORKS_FOLDER = [['works', 'art & music'], ['apps', 'apps'], ['projects', 'projects'], ['log', 'log']]; // pages grouped under "works"
const SHELF_CATS = ['albums', 'films', 'shows', 'games', 'books', 'other'];
const KINDS = ['watching', 'listening', 'reading', 'playing', 'thinking about', 'making'];
const STATUSES = ['live', 'building', 'idea', 'archived'];
const STATIC = true;
let BUILT = null;
const S = { about: null, projects: [], profile: null, listening: null, hidden: null, gbreplies: [], now: null, status: null, interests: [], apps: [], works: [], posts: [], links: [], board: [], shelf: [], guestbook: [], hits: [], loaded: {} };
let myId = null, ownerView = false, shelfFilter = 'all';
const PLATFORMS = ['spotify', 'steam', 'soundcloud', 'bandcamp', 'youtube', 'instagram', 'tiktok', 'twitter / x', 'bluesky', 'discord', 'github', 'twitch', 'letterboxd', 'last.fm', 'other'];
let db = null, assets = null, isAdmin = false, online = false;
let route = 'home', postId = null, worksFilter = 'all';

const fmtDate = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`; };
const safeUrl = u => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : null; } catch { return null; } };
const blob = id => (/[./]/.test(id || '') ? id : 'assets/' + id);
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2000); }
const profile = () => Object.assign({ handle: 'nely', tagline: '', about: '' }, S.profile || {});

// log entries arrive as HTML (Jekyll converts the markdown); make bare links clickable too
function htmlBody(html) {
  const d = h('div', { class: 'body' }); d.innerHTML = html;
  const walk = document.createTreeWalker(d, NodeFilter.SHOW_TEXT);
  const nodes = []; while (walk.nextNode()) if (!walk.currentNode.parentElement.closest('a') && /https?:\/\//.test(walk.currentNode.nodeValue)) nodes.push(walk.currentNode);
  for (const n of nodes) n.replaceWith(...inline(n.nodeValue));
  d.querySelectorAll('a').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
  return d;
}
function inline(t) {
  const out = [];
  t.split('\n').forEach((ln, i) => {
    if (i) out.push(h('br'));
    const re = /(https?:\/\/[^\s<]+)/g; let last = 0, m;
    while ((m = re.exec(ln))) {
      if (m.index > last) out.push(ln.slice(last, m.index));
      out.push(h('a', { href: m[1], target: '_blank', rel: 'noopener' }, m[1]));
      last = m.index + m[1].length;
    }
    if (last < ln.length) out.push(ln.slice(last));
  });
  return out;
}
function richText(body) {
  const f = document.createDocumentFragment();
  for (const b of String(body || '').split(/\n\s*\n/)) {
    const t = b.trim(); if (!t) continue;
    if (t.startsWith('## ')) { const [hd, ...rest] = t.split('\n'); f.append(h('h3', {}, hd.slice(3))); const more = rest.join('\n').trim(); if (more) f.append(h('p', {}, inline(more))); }
    else if (t.startsWith('> ')) f.append(h('blockquote', {}, inline(t.replace(/^> ?/gm, ''))));
    else f.append(h('p', {}, inline(t)));
  }
  return f;
}
const editBtn = fn => isAdmin ? h('button', { class: 'link-btn', onclick: e => { e.stopPropagation(); fn(); } }, 'edit') : null;
const addBtn = (label, fn) => isAdmin ? h('button', { class: 'link-btn add', onclick: fn }, '+ ' + label) : null;
const empty = text => h('p', { class: 'empty' }, text);

/* routing */
let entering = false;
function go(r, pid = null) {
  route = (SECTIONS.includes(r) || r === 'void') ? r : 'home'; postId = pid;
  try { history.replaceState(null, '', '#' + (pid ? 'post-' + pid : route)); } catch {}
  entering = true; render(); window.scrollTo({ top: 0 });
}
(() => { const x = (location.hash || '').slice(1); if (x.startsWith('post-')) { route = 'log'; postId = x.slice(5); } else if (SECTIONS.includes(x) || x === 'void') route = x; })();

let raf = 0;
let dragging = false, pendingRender = false;
function render() { if (dragging) { pendingRender = true; return; } cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); }
// re-lay the board whenever the content column actually changes width (window resize, page widening, fonts loading)
let lastViewW = 0;
new ResizeObserver(() => { const w = $('#view').clientWidth; if (route === 'board' && w && Math.abs(w - lastViewW) > 1) { lastViewW = w; render(); } }).observe($('#view'));
function draw() {
  const inWorks = WORKS_FOLDER.some(([r]) => r === route);
  $('#nav').replaceChildren(...NAV.map(s => s !== 'works'
    ? h('button', { class: 'nav', 'aria-current': String(route === s), onclick: () => go(s) }, s)
    : h('span', { class: 'dd' + (ddOpen ? ' open' : '') },
        h('button', { class: 'nav', 'aria-current': String(inWorks), 'aria-haspopup': 'true', 'aria-expanded': String(ddOpen),
          onclick: e => { e.stopPropagation(); if (canHover) go('works'); else { ddOpen = !ddOpen; render(); } } },
          'works', h('span', { class: 'caret', 'aria-hidden': 'true' }, '▾')),
        h('div', { class: 'dd-menu' }, h('div', { class: 'panel', role: 'menu' },
          WORKS_FOLDER.map(([r, label]) => h('button', { role: 'menuitem', 'aria-current': String(route === r), onclick: e => { e.stopPropagation(); ddOpen = false; e.currentTarget.blur(); go(r); } }, label)))))));
  const v = $('#view');
  document.querySelector('.wrap').classList.toggle('wide', route === 'board');
  v.replaceChildren(({ home: vHome, now: vNow, apps: vApps, projects: vProjects, works: vWorks, board: vBoard, shelf: vShelf, log: vLog, guestbook: vGuestbook, void: vVoid, about: vAbout })[route]());
  drawChrome();
  if (route === 'board') sizeBoard();
  if (entering) { entering = false; v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); }
}

function vHome() {
  const p = profile();
  const f = document.createDocumentFragment();
  f.append(h('section', {},
    h('h1', { class: 'name', 'data-text': p.handle || 'nely' }, p.handle || 'nely'),
    (() => { const n = statusNodes(); return n.length ? h('div', { class: 'status-wrap' }, n) : null; })(),
    p.tagline ? h('p', { class: 'tagline' }, p.tagline) : null,
    p.about ? h('p', { class: 'about' }, p.about) : null,
    (S.links.length || isAdmin) ? h('div', { class: 'links' },
      S.links.map(l => { const url = safeUrl(l.url); if (!url) return null;
        return h('span', { style: 'display:inline-flex;align-items:center' },
          h('a', { href: url, target: '_blank', rel: 'noopener me' }, l.label || l.platform || 'link', h('span', { class: 'arr', 'aria-hidden': 'true' }, '↗')),
          editBtn(() => editLink(l))); }),
      addBtn('link', () => editLink())) : null,
    isAdmin ? h('p', { style: 'margin-top:14px' }, h('button', { class: 'link-btn', onclick: editProfile }, 'edit profile')) : null));
  f.append(h('section', { class: 'section' },
    h('div', { class: 'label' }, h('span', {}, 'currently'), addBtn('add', () => editInterest())),
    S.interests.length ? h('ul', { class: 'list' }, S.interests.map(it => h('li', {},
      h('span', {}, it.label || ''),
      h('span', { class: 'meta' }, it.kind || '', isAdmin ? ' · ' : '', editBtn(() => editInterest(it))),
      it.note ? h('span', { class: 'sub' }, it.note) : null)))
    : empty(S.loaded.interests || !online ? 'nothing yet.' : 'loading…')));
  if (S.posts.length) f.append(h('section', { class: 'section' },
    h('div', { class: 'label' }, h('span', {}, 'recent writing'), h('button', { class: 'link-btn', onclick: () => go('log') }, 'all →')),
    postList(S.posts.slice(0, 3))));
  return f;
}

/* ---------- projects ---------- */
const fmtMonth = v => { if (!v) return ''; const m = String(v).match(/^(\d{4})-(\d{2})/); return m ? `${m[1]}.${m[2]}` : String(v); };
function vProjects() {
  const f = document.createDocumentFragment();
  f.append(h('h2', { class: 'page-title' }, 'projects', addBtn('add', () => editProject())));
  if (!S.projects.length) { f.append(empty(S.loaded.projects || !online ? 'no projects yet.' : 'loading…')); return f; }
  const order = { ongoing: 0, idea: 1, paused: 2, finished: 3 };
  const list = [...S.projects].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || String(b.started || b.created).localeCompare(String(a.started || a.created)));
  f.append(h('div', {}, list.map(pj => {
    const url = safeUrl(pj.link), st = PROJ_STATUS.includes(pj.status) ? pj.status : 'idea';
    const when = pj.started ? (fmtMonth(pj.started) + (pj.ended && st === 'finished' ? ' – ' + fmtMonth(pj.ended) : st === 'ongoing' ? ' – now' : '')) : '';
    return h('article', { class: 'proj' },
      pj.cover ? h('img', { class: 'cover', src: blob(pj.cover), alt: pj.title || 'project cover', loading: 'lazy', onclick: () => lightbox({ title: pj.title, assetId: pj.cover, created: pj.created, note: pj.type, link: pj.link, onEdit: () => editProject(pj) }) }) : null,
      h('div', { class: 'grow' },
        h('div', { class: 'top' },
          url ? h('a', { class: 'name', href: url, target: '_blank', rel: 'noopener' }, pj.title || 'untitled', ' ↗') : h('span', { class: 'name' }, pj.title || 'untitled'),
          h('span', { style: 'display:flex;gap:12px;align-items:baseline' }, h('span', { class: 'pstat ' + st }, st), editBtn(() => editProject(pj)))),
        pj.desc ? h('div', { class: 'desc' }, pj.desc) : null,
        (pj.type || when) ? h('div', { class: 'meta' }, [pj.type, when].filter(Boolean).join(' · ')) : null));
  })));
  return f;
}
function editProject(pj) {
  openForm({ title: pj ? 'Edit project' : 'New project', values: pj || {}, fields: [
    { id: 'title', label: 'name', required: true },
    { id: 'type', label: 'type', type: 'select', options: PROJ_TYPES },
    { id: 'status', label: 'status', type: 'select', options: PROJ_STATUS },
    { id: 'desc', label: 'what it is', type: 'textarea' },
    { id: 'started', label: 'started', type: 'month' },
    { id: 'ended', label: 'finished (if done)', type: 'month' },
    { id: 'link', label: 'link', type: 'url', placeholder: 'https://…' },
    ...(assets ? [{ id: 'cover', label: pj && pj.cover ? 'replace cover image' : 'cover image (optional)', type: 'file', accept: 'image/png,image/jpeg,image/gif,image/webp' }] : []),
  ], onSave: async (v, status) => {
    requireDb();
    if (v.link && !safeUrl(v.link)) throw { custom: 'Link must start with http:// or https://' };
    const body = { title: v.title, type: v.type, status: v.status, desc: v.desc, started: v.started, ended: v.ended, link: v.link, updated: nowIso() };
    if (v.cover) { const mt = mediaType(v.cover); if (mt.kind !== 'art') throw { custom: 'Cover must be an image.' }; status('uploading…'); body.cover = (await assets.upload(v.cover, { type: mt.type })).id; }
    if (pj) await db.doc('projects/' + pj.id).update(body); else await db.collection('projects').add({ ...body, created: nowIso() });
  }, onDelete: pj ? async () => { await db.doc('projects/' + pj.id).delete(); if (pj.cover && assets) { try { await assets.delete(pj.cover); } catch {} } } : null });
}

function vApps() {
  const f = document.createDocumentFragment();
  f.append(h('h2', { class: 'page-title' }, 'apps', addBtn('add', () => editApp())));
  if (!S.apps.length) { f.append(empty('nothing yet.')); return f; }
  f.append(h('ul', { class: 'list' }, S.apps.map(a => {
    const url = safeUrl(a.url);
    return h('li', {},
      url ? h('a', { href: url, target: '_blank', rel: 'noopener' }, a.name || 'untitled', ' ↗') : h('span', {}, a.name || 'untitled'),
      h('span', { class: 'meta' }, h('span', { class: 'status ' + (a.status || '') }, a.status || ''), isAdmin ? ' · ' : '', editBtn(() => editApp(a))),
      (a.desc || a.tech) ? h('span', { class: 'sub' }, a.desc || '', a.desc && a.tech ? ' — ' : '', a.tech ? h('span', { style: 'color:var(--faint)' }, a.tech) : null) : null);
  })));
  return f;
}

const audio = new Audio(); let playing = null;
audio.addEventListener('timeupdate', () => { const bar = document.querySelector(`[data-prog="${playing}"] i`); if (bar && audio.duration) bar.style.width = (audio.currentTime / audio.duration * 100) + '%'; });
audio.addEventListener('ended', () => { playing = null; render(); });
function togglePlay(w) {
  if (playing === w.id) { audio.pause(); playing = null; render(); return; }
  audio.src = blob(w.assetId); audio.play().then(() => { playing = w.id; render(); }).catch(() => toast('could not play that file'));
}

function vWorks() {
  const f = document.createDocumentFragment();
  f.append(h('h2', { class: 'page-title' }, 'art & music',
    h('span', { class: 'filters' }, ['all', 'art', 'music'].map(k => h('button', { 'aria-pressed': String(worksFilter === k), onclick: () => { worksFilter = k; render(); } }, k)), addBtn('add', () => editWork()))));
  const art = S.works.filter(w => w.kind === 'art'), music = S.works.filter(w => w.kind === 'music');
  const showArt = worksFilter !== 'music' && art.length, showMusic = worksFilter !== 'art' && music.length;
  if (!showArt && !showMusic) { f.append(empty('nothing yet.')); return f; }
  if (showArt) f.append(h('div', { class: 'gallery' }, art.map(w => h('button', { class: 'art', onclick: () => lightbox(w) },
    w.assetId ? h('img', { src: blob(w.assetId), alt: w.title || 'artwork', loading: 'lazy' }) : null,
    h('span', {}, w.title || 'untitled')))));
  if (showMusic) f.append(h('ul', { class: 'list', style: showArt ? 'margin-top:48px' : '' }, music.map(w => {
    const on = playing === w.id, link = safeUrl(w.link);
    return h('li', {},
      h('span', {}, w.assetId ? h('button', { class: 'play', 'aria-label': (on ? 'Pause ' : 'Play ') + (w.title || 'track'), onclick: () => togglePlay(w) }, on ? 'pause' : 'play') : null,
        link && !w.assetId ? h('a', { href: link, target: '_blank', rel: 'noopener' }, w.title || 'untitled', ' ↗') : (w.title || 'untitled')),
      h('span', { class: 'meta' }, fmtDate(w.created), isAdmin ? ' · ' : '', editBtn(() => editWork(w))),
      w.note ? h('span', { class: 'sub' }, w.note) : null,
      w.assetId && on ? h('div', { class: 'prog', 'data-prog': w.id, onclick: e => { if (!audio.duration) return; const r = e.currentTarget.getBoundingClientRect(); audio.currentTime = (e.clientX - r.left) / r.width * audio.duration; } }, h('i')) : null);
  })));
  return f;
}

function postList(list) {
  return h('div', {}, list.map(p => h('button', { class: 'row-btn', onclick: () => go('log', p.id) },
    h('span', { class: 'd' }, fmtDate(p.created)), h('span', { class: 't' }, p.title || 'untitled'))));
}


/* ---------- moodboard ---------- */
const BW = 1000; // logical board width; everything scales to the screen
const boardScale = () => Math.max(.3, ($('#view').clientWidth || BW) / BW);
function sizeBoard() {
  const b = $('#board'); if (!b) return;
  const fit = () => { let max = 0; for (const el of b.querySelectorAll('.bi')) max = Math.max(max, el.offsetTop + el.offsetHeight); b.style.height = Math.max(b.clientWidth * .7, max + 160) + 'px'; };
  fit(); b.querySelectorAll('img').forEach(i => { if (!i.complete) i.addEventListener('load', fit, { once: true }); });
}
function placeEl(el, it, s) {
  el.style.left = it.x * s + 'px'; el.style.top = it.y * s + 'px'; el.style.width = it.w * s + 'px';
  el.style.transform = `rotate(${it.rot || 0}deg)`; // stacking follows DOM order (sorted by z)
  if (it.type === 'note') { el.style.fontSize = Math.max(11, 16 * s) + 'px'; el.style.padding = `${12 * s}px ${14 * s}px`; }
}
function vBoard() {
  const f = document.createDocumentFragment();
  const fileIn = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/gif,image/webp', multiple: true, hidden: true, onchange: e => { addBoardImages([...e.target.files]); e.target.value = ''; } });
  f.append(h('h2', { class: 'page-title' }, 'board',
    (isAdmin && !STATIC) ? h('span', { class: 'filters' }, assets ? h('button', { class: 'link-btn add', onclick: () => fileIn.click() }, '+ image') : null, h('button', { class: 'link-btn add', onclick: () => editNote() }, '+ note'), fileIn) : null));
  if (isAdmin) f.append(h('p', { class: 'board-hint' }, STATIC ? 'drag to move · corner square to resize · then press copy layout' : 'drag to move · corner square to resize · changes save on release'));
  const s = boardScale();
  const board = h('div', { class: 'board', id: 'board' });
  if (!S.board.length) board.append(h('div', { class: 'board-empty' }, S.loaded.board || !online ? 'the board is empty.' : 'loading…'));
  for (const it of S.board) {
    const el = it.type === 'image'
      ? h('div', { class: 'bi img' + (isAdmin ? ' admin' : '') }, h('img', { src: blob(it.assetId), alt: it.caption || 'board image', draggable: 'false' }))
      : h('div', { class: 'bi note' + (isAdmin ? ' admin' : '') }, it.text || '');
    placeEl(el, it, s);
    if (isAdmin && STATIC) { el.append(h('span', { class: 'rs', 'aria-hidden': 'true', onpointerdown: e => startDrag(e, el, it, 'resize') })); el.addEventListener('pointerdown', e => { if (e.target.closest('.rs')) return; startDrag(e, el, it, 'move'); }); }
    if (isAdmin && !STATIC) {
      el.append(
        h('span', { class: 'ctl' },
          it.type === 'note' ? h('button', { class: 'link-btn', onclick: e => { e.stopPropagation(); editNote(it); } }, 'edit') : null,
          h('button', { class: 'link-btn', onclick: e => { e.stopPropagation(); rotateItem(it); } }, 'tilt'),
          h('button', { class: 'link-btn danger', onclick: e => { e.stopPropagation(); removeItem(it, e.currentTarget); } }, 'remove')),
        h('span', { class: 'rs', 'aria-hidden': 'true', onpointerdown: e => startDrag(e, el, it, 'resize') }));
      el.addEventListener('pointerdown', e => { if (e.target.closest('.ctl,.rs')) return; startDrag(e, el, it, 'move'); });
    }
    board.append(el);
  }
  f.append(board);
  return f;
}
function startDrag(e, el, it, mode) {
  if (e.button !== undefined && e.button !== 0) return;
  e.preventDefault(); e.stopPropagation();
  const s = boardScale(), sx = e.clientX, sy = e.clientY;
  const cur = { ...it };
  dragging = true; el.classList.add('dragging'); el.style.zIndex = '100001';
  try { el.setPointerCapture(e.pointerId); } catch {}
  const move = ev => {
    const dx = (ev.clientX - sx) / s, dy = (ev.clientY - sy) / s;
    if (mode === 'move') { cur.x = Math.max(0, Math.min(BW - 40, it.x + dx)); cur.y = Math.max(0, it.y + dy); }
    else cur.w = Math.max(80, Math.min(BW, it.w + dx));
    placeEl(el, { ...cur, z: 1e11 }, s);
  };
  const up = async () => {
    el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
    el.classList.remove('dragging'); el.style.zIndex = ''; dragging = false;
    const changed = cur.x !== it.x || cur.y !== it.y || cur.w !== it.w;
    const patch = mode === 'move' ? { x: Math.round(cur.x), y: Math.round(cur.y), z: Date.now() } : { w: Math.round(cur.w), z: Date.now() };
    Object.assign(it, patch); // keep local copy in sync until the snapshot arrives
    if (!STATIC && db && (changed || mode === 'move')) { try { await db.doc('board/' + it.id).update(patch); } catch (err) { toast(errText(err)); } }
    pendingRender = false; render();
  };
  el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
}
const spawnPos = () => { const s = boardScale(); const b = $('#board'); const top = b ? Math.max(0, (window.scrollY - b.getBoundingClientRect().top - window.scrollY + 120) / s) : 60; return { x: Math.round(40 + Math.random() * 420), y: Math.round(Math.max(40, top + Math.random() * 120)), rot: +(Math.random() * 6 - 3).toFixed(1), z: Date.now() }; };
function editNote(it) {
  openForm({ title: it ? 'Edit note' : 'New note', values: it || {}, fields: [
    { id: 'text', label: 'note', type: 'textarea', required: true, placeholder: 'a thought, a quote, a lyric of your own…' },
  ], onSave: async v => {
    requireDb();
    if (it) await db.doc('board/' + it.id).update({ text: v.text, updated: nowIso() });
    else await db.collection('board').add({ type: 'note', text: v.text, w: 240, ...spawnPos() });
  }, onDelete: it ? () => db.doc('board/' + it.id).delete() : null });
}
async function addBoardImages(files) {
  if (!files.length) return;
  try { requireDb(); } catch (e) { toast(errText(e)); return; }
  for (const file of files) {
    try {
      const mt = mediaType(file); if (mt.kind !== 'art') throw { custom: 'Only images can go on the board.' };
      toast('uploading ' + file.name + '…');
      const up = await assets.upload(file, { type: mt.type });
      await db.collection('board').add({ type: 'image', assetId: up.id, w: 300, ...spawnPos() });
    } catch (e) { toast(errText(e)); return; }
  }
  toast(files.length > 1 ? 'added ' + files.length + ' images' : 'added to the board');
}
async function rotateItem(it) {
  const steps = [-4, -2, 0, 2, 4]; const i = steps.indexOf(Math.round(it.rot || 0));
  const rot = steps[(i + 1) % steps.length];
  try { await db.doc('board/' + it.id).update({ rot, updated: nowIso() }); } catch (e) { toast(errText(e)); }
}
async function removeItem(it, btn) {
  if (btn.dataset.armed !== '1') { btn.dataset.armed = '1'; btn.textContent = 'click to confirm'; setTimeout(() => { btn.dataset.armed = ''; btn.textContent = 'remove'; }, 3000); return; }
  try { await db.doc('board/' + it.id).delete(); if (it.type === 'image' && assets) { try { await assets.delete(it.assetId); } catch {} } toast('removed'); }
  catch (e) { toast(errText(e)); }
}

/* ---------- status line, footer counter ---------- */
function timeAgo(iso) {
  const d = new Date(iso); if (isNaN(d)) return '';
  const m = Math.round((Date.now() - d) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return m + 'm ago';
  const hr = Math.round(m / 60); if (hr < 24) return hr + 'h ago';
  const dy = Math.round(hr / 24); return dy < 30 ? dy + 'd ago' : fmtDate(iso);
}
function lastUpdated() {
  if (BUILT) return BUILT;
  let max = 0;
  const add = v => { const t = typeof v === 'number' ? v : Date.parse(v || ''); if (t > max && t < Date.now() + 864e5) max = t; };
  for (const d of [S.profile, S.status, S.listening, S.hidden]) if (d) { add(d.updated); add(d.created); }
  for (const c of ['interests', 'apps', 'projects', 'works', 'posts', 'links', 'shelf', 'gbreplies', 'board']) for (const d of S[c]) { add(d.updated); add(d.created); if (c === 'board' && d.z > 1e12) add(d.z); }
  return max ? new Date(max).toISOString() : null;
}
function statusNodes() {
  const st = S.status || {};
  const li = S.listening || {};
  const liUrl = safeUrl(li.link);
  const songText = [h('span', {}, li.song || ''), li.artist ? h('span', { class: 'artist' }, ' — ' + li.artist) : null];
  return [
    (st.text || isAdmin) ? h('div', { class: 'status-line' },
      h('span', { class: 'pulse', 'aria-hidden': 'true' }),
      h('span', {}, st.text || (isAdmin ? 'no status set' : '')),
      st.updated ? h('span', { class: 'when' }, '· ' + timeAgo(st.updated)) : null,
      isAdmin ? h('button', { class: 'link-btn', onclick: editStatus }, st.text ? 'edit' : 'set status') : null) : null,
    (li.song || isAdmin) ? h('div', { class: 'status-line' },
      li.song ? h('span', { class: 'eq', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')) : h('span', { class: 'pulse', 'aria-hidden': 'true', style: 'opacity:.3;animation:none' }),
      li.song ? (liUrl ? h('a', { href: liUrl, target: '_blank', rel: 'noopener', 'aria-label': 'Now listening: ' + li.song }, songText) : h('span', { 'aria-label': 'Now listening' }, songText)) : h('span', {}, 'not listening to anything'),
      isAdmin ? h('button', { class: 'link-btn', onclick: editListening }, li.song ? 'edit' : 'set song') : null) : null].filter(Boolean);
}
function drawChrome() {
  const total = S.hits.reduce((a, x) => a + (Number(x.visits) || 0), 0);
  const digits = S.loaded.hits ? String(total).padStart(6, '0').split('') : '------'.split('');
  $('#foot').replaceChildren(...[
    STATIC ? null : h('span', {}, 'visitors', h('span', { class: 'counter', 'aria-label': S.loaded.hits ? total + ' visits' : 'loading' }, digits.map(c => h('span', {}, c)))),
    (() => { const lu = lastUpdated(); return lu ? h('span', { class: 'updated', title: new Date(lu).toLocaleString() }, 'updated ' + fmtDate(lu) + ' · ' + timeAgo(lu)) : null; })(),
    h('span', {}, (profile().handle || 'nely') + ' ', h('button', { class: 'void-trigger', type: 'button', onclick: () => go('void') }, 'archives'))].filter(Boolean));
}
function editStatus() {
  openForm({ title: 'Set status', values: S.status || {}, fields: [
    { id: 'text', label: 'what’s happening', placeholder: 'e.g. rewatching layer 07 at 2am', hint: 'one short line · leave empty to clear' },
  ], onSave: async v => { requireDb(); await db.doc('site/status').set({ text: v.text.slice(0, 120), updated: nowIso() }); } });
}

/* ---------- now ---------- */
function vNow() {
  const n = S.now || {};
  const f = document.createDocumentFragment();
  f.append(h('h2', { class: 'page-title' }, 'now', isAdmin ? h('button', { class: 'link-btn add', onclick: editNow }, n.body ? 'edit' : '+ write') : null));
  const wrap = h('section', { class: 'now' });
  if (n.updated) wrap.append(h('p', { class: 'date' }, 'updated ' + fmtDate(n.updated)));
  wrap.append(n.body ? h('div', { class: 'body' }, richText(n.body)) : empty(S.loaded.now || !online ? 'nothing here yet.' : 'loading…'));
  f.append(wrap);
  return f;
}
function editNow() {
  openForm({ title: 'Edit now', values: S.now || {}, fields: [
    { id: 'body', label: 'what you’re up to lately', type: 'textarea', tall: true, required: true, hint: 'blank line = new paragraph · ## heading · > quote' },
  ], onSave: async v => { requireDb(); await db.doc('site/now').set({ body: v.body, updated: nowIso() }); } });
}

/* ---------- shelf (collections) ---------- */
function vShelf() {
  const f = document.createDocumentFragment();
  const cats = SHELF_CATS.filter(c => S.shelf.some(x => x.category === c));
  f.append(h('h2', { class: 'page-title' }, 'shelf',
    h('span', { class: 'filters' }, (cats.length > 1 ? ['all', ...cats] : []).map(k => h('button', { 'aria-pressed': String(shelfFilter === k), onclick: () => { shelfFilter = k; render(); } }, k)), addBtn('add', () => editShelf()))));
  const items = S.shelf.filter(x => shelfFilter === 'all' || x.category === shelfFilter);
  if (!items.length) { f.append(empty(S.loaded.shelf || !online ? 'the shelf is empty.' : 'loading…')); return f; }
  f.append(h('div', {}, items.map(it => {
    const url = safeUrl(it.link), r = Math.max(0, Math.min(5, Number(it.rating) || 0));
    return h('div', { class: 'shelf-item' },
      it.cover ? h('img', { class: 'cover', src: blob(it.cover), alt: '', loading: 'lazy' }) : null,
      h('div', { class: 'grow' },
        url ? h('a', { href: url, target: '_blank', rel: 'noopener' }, it.title || 'untitled', ' ↗') : h('span', {}, it.title || 'untitled'),
        (it.creator || it.year) ? h('div', { class: 'by' }, [it.creator, it.year].filter(Boolean).join(' · ')) : null,
        it.review ? h('div', { class: 'rev' }, it.review) : null),
      h('div', { class: 'side' },
        r ? h('span', { class: 'rating', 'aria-label': r + ' out of 5' }, '●'.repeat(r) + '○'.repeat(5 - r)) : null,
        h('span', { class: 'cat' }, it.category || ''),
        editBtn(() => editShelf(it))));
  })));
  return f;
}
function editShelf(it) {
  openForm({ title: it ? 'Edit shelf item' : 'Add to shelf', values: it ? { ...it, rating: it.rating ? String(it.rating) : '—' } : {}, fields: [
    { id: 'category', label: 'category', type: 'select', options: SHELF_CATS },
    { id: 'title', label: 'title', required: true },
    { id: 'creator', label: 'by', placeholder: 'artist, director, studio, author…' },
    { id: 'year', label: 'year' },
    { id: 'rating', label: 'rating', type: 'select', options: ['—', '1', '2', '3', '4', '5'] },
    { id: 'review', label: 'your thoughts', type: 'textarea' },
    { id: 'link', label: 'link', type: 'url', placeholder: 'https://…' },
    ...(assets ? [{ id: 'cover', label: it && it.cover ? 'replace cover' : 'cover image (optional)', type: 'file', accept: 'image/png,image/jpeg,image/gif,image/webp' }] : []),
  ], onSave: async (v, status) => {
    requireDb();
    if (v.link && !safeUrl(v.link)) throw { custom: 'Link must start with http:// or https://' };
    const body = { category: v.category, title: v.title, creator: v.creator, year: v.year, rating: v.rating === '—' ? 0 : Number(v.rating), review: v.review, link: v.link, updated: nowIso() };
    if (v.cover) { const mt = mediaType(v.cover); if (mt.kind !== 'art') throw { custom: 'Cover must be an image.' }; status('uploading…'); body.cover = (await assets.upload(v.cover, { type: mt.type })).id; }
    if (it) await db.doc('shelf/' + it.id).update(body); else await db.collection('shelf').add({ ...body, created: nowIso() });
  }, onDelete: it ? async () => { await db.doc('shelf/' + it.id).delete(); if (it.cover && assets) { try { await assets.delete(it.cover); } catch {} } } : null });
}

/* ---------- guestbook ---------- */
let gbForm = null;
function guestbookForm() {
  if (gbForm) return gbForm;
  let saved = ''; try { saved = localStorage.getItem('gb-name') || ''; } catch {}
  const name = h('input', { id: 'gb_name', maxlength: '40', placeholder: 'your name', autocomplete: 'nickname' }); name.value = saved;
  const msg = h('textarea', { id: 'gb_msg', maxlength: '500', placeholder: 'leave a message…' });
  const out = h('div', { class: 'msg', role: 'status' });
  const btn = h('button', { class: 'save', type: 'submit' }, 'sign');
  gbForm = h('form', { class: 'gb-form' },
    h('div', { class: 'field' }, h('label', { for: 'gb_name' }, 'name'), name),
    h('div', { class: 'field' }, h('label', { for: 'gb_msg' }, 'message'), msg),
    h('div', { class: 'row' }, out, btn));
  gbForm.addEventListener('submit', async e => {
    e.preventDefault(); out.textContent = '';
    const n = name.value.trim().slice(0, 40), m = msg.value.trim().slice(0, 500);
    if (!n || !m) { out.textContent = 'Add your name and a message.'; return; }
    if (!db || !myId) { out.textContent = 'Sign in to claude.ai to sign the guestbook.'; return; }
    btn.disabled = true; btn.textContent = 'signing…';
    try {
      const ref = db.doc('guestbook/' + myId); const snap = await ref.get();
      const entries = (snap.exists && Array.isArray(snap.data().entries) ? snap.data().entries : []).slice(-49);
      entries.push({ id: Math.random().toString(36).slice(2, 10), name: n, message: m, created: nowIso() });
      await ref.set({ entries, updated: nowIso() });
      try { localStorage.setItem('gb-name', n); } catch {}
      msg.value = ''; toast('signed. thank you');
    } catch (err) { out.textContent = err && err.code === 'invalid_argument' ? 'Your access to this site is view-only, so you can’t sign.' : errText(err); }
    btn.disabled = false; btn.textContent = 'sign';
  });
  return gbForm;
}
function editListening() {
  openForm({ title: 'Now listening', values: S.listening || {}, fields: [
    { id: 'song', label: 'song', placeholder: 'leave empty to clear' },
    { id: 'artist', label: 'artist' },
    { id: 'link', label: 'link (optional)', type: 'url', placeholder: 'https://open.spotify.com/track/…', hint: 'Spotify: ⋯ on the song → Share → Copy song link' },
  ], onSave: async v => {
    requireDb();
    if (v.link && !safeUrl(v.link)) throw { custom: 'Link must start with http:// or https://' };
    await db.doc('site/listening').set({ song: v.song.slice(0, 100), artist: v.artist.slice(0, 100), link: v.song ? v.link : '', updated: nowIso() });
  } });
}

/* ---------- hidden page (reached by clicking "archives" in the footer, or #void) ---------- */
/* ---------- about page (content: _data/about.yml) ---------- */
function vAbout() {
  const a = S.about || {};
  const f = h('section', { class: 'about-page' });
  f.append(h('h2', { class: 'page-title' }, a.title || 'about'));
  f.append(h('div', { class: 'about-top' },
    a.photo ? h('img', { class: 'about-photo', src: blob(a.photo), alt: a.photo_alt || 'photo of ' + (profile().handle || 'me') }) : null,
    h('div', { class: 'about-body' }, a.body ? richText(a.body) : empty(S.loaded.about ? 'nothing here yet.' : 'loading…'))));
  const facts = Array.isArray(a.facts) ? a.facts.filter(x => x && (x.label || x.value)) : [];
  if (facts.length) f.append(h('ul', { class: 'list about-facts' }, facts.map(x => h('li', {}, h('span', { class: 'k' }, x.label || ''), h('span', {}, String(x.value ?? ''))))));
  return f;
}
// about-page styles live here so style.css (which you may have customised) stays untouched
document.head.append(Object.assign(document.createElement('style'), { textContent: `
.about-top{display:flex;gap:28px;align-items:flex-start;flex-wrap:wrap}
.about-photo{width:180px;max-width:100%;aspect-ratio:1;object-fit:cover;border:1px solid var(--line);filter:saturate(.85);box-shadow:0 0 22px rgba(91,149,255,.25)}
.about-body{flex:1;min-width:min(100%,280px);font-size:16px;line-height:1.9}
.about-body p{margin:0 0 1.2em}
.about-body h3{font-size:18px;margin:1.4em 0 .4em}
.about-body blockquote{margin:0 0 1.2em;padding-left:14px;border-left:1px solid var(--blue);color:var(--dim)}
.about-facts{margin-top:40px}
.about-facts .k{color:var(--faint)}
.about-facts li{grid-template-columns:minmax(90px,30%) minmax(0,1fr)}
` }));

function vVoid() {
  const hd = S.hidden || {};
  const f = h('section', { class: 'void' },
    h('p', { class: 'eyebrow' }, 'you found it.'),
    h('div', {}, h('h2', {}, 'void')),
    isAdmin ? h('p', { style: 'margin:-12px 0 24px' }, h('button', { class: 'link-btn add', onclick: editVoid }, hd.body ? 'edit' : '+ write')) : null,
    hd.body ? h('div', { class: 'body' }, richText(hd.body)) : empty(S.loaded.hidden || !online ? 'nothing here. yet.' : '…'),
    h('p', { style: 'margin-top:48px' }, h('button', { class: 'back', onclick: () => go('home') }, '← back to the surface')));
  return f;
}
function editVoid() {
  openForm({ title: 'Hidden page', values: S.hidden || {}, fields: [
    { id: 'body', label: 'what lives here', type: 'textarea', tall: true, hint: 'only people who click “archives” in the footer find this · ## heading · > quote' },
  ], onSave: async v => { requireDb(); await db.doc('site/hidden').set({ body: v.body, updated: nowIso() }); } });
}

/* ---------- guestbook replies (owner only; stored apart from visitors' own docs) ---------- */
function replyFor(entryId) { return S.gbreplies.find(r => r.id === entryId); }
function editReply(e) {
  const cur = replyFor(e.id);
  openForm({ title: 'Reply to ' + (e.name || 'anonymous'), values: cur || {}, fields: [
    { id: 'text', label: 'your reply', type: 'textarea', required: true },
  ], onSave: async v => { requireDb(); await db.doc('gbreplies/' + e.id).set({ text: v.text.slice(0, 600), created: (cur && cur.created) || nowIso(), updated: nowIso() }); },
    onDelete: cur ? () => db.doc('gbreplies/' + e.id).delete() : null });
}

function vGuestbook() {
  const f = document.createDocumentFragment();
  f.append(h('h2', { class: 'page-title' }, 'guestbook'));
  if (STATIC) {
    const gb = safeUrl((S.profile || {}).guestbook_url);
    f.append(gb
      ? h('p', {}, h('a', { class: 'save', style: 'display:inline-block;text-decoration:none', href: gb, target: '_blank', rel: 'noopener' }, 'sign my guestbook ↗'))
      : empty('the guestbook is moving. check back soon.'));
    return f;
  }
  if (db && myId) f.append(guestbookForm());
  else f.append(h('p', { class: 'muted', style: 'margin:0 0 40px' }, online ? 'sign in to claude.ai to leave a message.' : 'the guestbook is offline in this view.'));
  const all = S.guestbook.flatMap(d => (Array.isArray(d.entries) ? d.entries : []).map(e => ({ ...e, owner: d.id }))).sort((a, b) => String(b.created).localeCompare(String(a.created)));
  if (!all.length) { f.append(empty(S.loaded.guestbook || !online ? 'no one has signed yet. be the first.' : 'loading…')); return f; }
  f.append(h('div', {}, all.map(e => h('div', { class: 'gb-entry' },
    h('div', { class: 'who' }, h('span', {}, h('b', {}, e.name || 'anonymous'), ' · ' + fmtDate(e.created)),
      h('span', { class: 'gb-actions' },
        (isAdmin && e.id) ? h('button', { class: 'link-btn add', onclick: () => editReply(e) }, replyFor(e.id) ? 'edit reply' : 'reply') : null,
        (isAdmin || e.owner === myId) ? h('button', { class: 'link-btn danger', onclick: ev => removeEntry(e, ev.currentTarget) }, 'remove') : null)),
    h('p', {}, e.message || ''),
    (() => { const r = e.id && replyFor(e.id); return r ? h('div', { class: 'gb-reply' }, h('b', {}, profile().handle || 'nely'), ' ', h('span', { class: 'when' }, '· ' + fmtDate(r.updated || r.created)), h('div', { style: 'white-space:pre-wrap;word-break:break-word;margin-top:2px' }, r.text || '')) : null; })()))));
  return f;
}
async function removeEntry(e, btn) {
  if (btn.dataset.armed !== '1') { btn.dataset.armed = '1'; btn.textContent = 'click to confirm'; setTimeout(() => { btn.dataset.armed = ''; btn.textContent = 'remove'; }, 3000); return; }
  try {
    const ref = db.doc('guestbook/' + e.owner); const snap = await ref.get();
    const entries = (snap.exists && Array.isArray(snap.data().entries) ? snap.data().entries : []).filter(x => x.id !== e.id);
    await ref.set({ entries, updated: nowIso() }); toast('removed');
  } catch (err) { toast(errText(err)); }
}

/* ---------- hit counter: each visitor keeps their own tally doc; the total is the sum ---------- */
async function countVisit() {
  if (!db || !myId || ownerView) return;
  try { if (sessionStorage.getItem('counted')) return; sessionStorage.setItem('counted', '1'); } catch {}
  try { const ref = db.doc('hits/' + myId); const snap = await ref.get(); const prev = snap.exists ? Number(snap.data().visits) || 0 : 0; await ref.set({ visits: prev + 1, last: nowIso() }); } catch {}
}


function vLog() {
  const f = document.createDocumentFragment();
  if (postId) {
    const p = S.posts.find(x => x.id === postId);
    f.append(h('button', { class: 'back', onclick: () => go('log') }, '← log'));
    if (!p) { f.append(h('p', { class: 'empty', style: 'margin-top:24px' }, S.loaded.posts ? 'this entry is gone.' : 'loading…')); return f; }
    f.append(h('article', { class: 'article', style: 'margin-top:36px' },
      h('span', { class: 'date' }, fmtDate(p.created)),
      h('h1', {}, p.title || 'untitled'),
      isAdmin ? h('p', { style: 'margin:8px 0 0' }, h('button', { class: 'link-btn', onclick: () => editPost(p) }, 'edit')) : null,
      p.html ? htmlBody(p.html) : h('div', { class: 'body' }, richText(p.body))));
    return f;
  }
  f.append(h('h2', { class: 'page-title' }, 'log', addBtn('new entry', () => editPost())));
  f.append(S.posts.length ? postList(S.posts) : empty('nothing yet.'));
  return f;
}

/* modal + forms */
function closeModal() { const m = $('#modal'); m.hidden = true; m.replaceChildren(); }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
function sheet(title, extra, ...body) {
  return h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'sheet-head' }, h('h2', {}, title), h('span', { style: 'display:flex;gap:14px' }, extra, h('button', { class: 'link-btn', type: 'button', onclick: closeModal }, 'close'))), ...body);
}
function openForm({ title, fields, values = {}, onSave, onDelete }) {
  const msg = h('div', { class: 'msg', role: 'status' });
  const inputs = {};
  const form = h('form', { class: 'form' }, fields.map(fd => {
    let el; const id = 'f_' + fd.id;
    if (fd.type === 'textarea') el = h('textarea', { id, class: fd.tall ? 'tall' : '', placeholder: fd.placeholder || '' });
    else if (fd.type === 'select') el = h('select', { id }, fd.options.map(o => h('option', { value: o }, o)));
    else if (fd.type === 'file') el = h('input', { id, type: 'file', accept: fd.accept || '' });
    else el = h('input', { id, type: fd.type || 'text', placeholder: fd.placeholder || '' });
    if (fd.type !== 'file') el.value = values[fd.id] ?? '';
    inputs[fd.id] = el;
    return h('div', { class: 'field' }, h('label', { for: id }, fd.label), el, fd.hint ? h('span', { class: 'hint' }, fd.hint) : null);
  }), msg);
  const save = h('button', { class: 'save', type: 'submit' }, 'save');
  let armed = false;
  const del = onDelete ? h('button', { class: 'link-btn danger', type: 'button', onclick: async () => {
    if (!armed) { armed = true; del.textContent = 'click again to delete'; return; }
    try { await onDelete(); closeModal(); toast('deleted'); } catch (e) { msg.textContent = errText(e); }
  } }, 'delete') : null;
  form.append(h('div', { class: 'actions' }, del, h('div', { class: 'r' }, h('button', { class: 'link-btn', type: 'button', onclick: closeModal }, 'cancel'), save)));
  form.addEventListener('submit', async e => {
    e.preventDefault(); msg.textContent = '';
    const vals = {}; for (const fd of fields) vals[fd.id] = fd.type === 'file' ? inputs[fd.id].files[0] || null : inputs[fd.id].value.trim();
    for (const fd of fields) if (fd.required && !vals[fd.id]) { msg.textContent = fd.label + ' is required.'; inputs[fd.id].focus(); return; }
    save.disabled = true; save.textContent = 'saving…';
    try { await onSave(vals, t => save.textContent = t); closeModal(); toast('saved'); }
    catch (err) { msg.textContent = errText(err); save.disabled = false; save.textContent = 'save'; }
  });
  const m = $('#modal'); m.replaceChildren(sheet(title, null, form)); m.hidden = false;
  setTimeout(() => form.querySelector('input,textarea,select')?.focus(), 30);
}
function errText(e) {
  const c = e && e.code;
  if (c === 'too_large') return 'That file is over 20 MB. Compress it and try again.';
  if (c === 'unsupported_type') return 'That file type can’t be stored here. Use an image (png, jpg, gif, webp) or audio as .m4a / .webm.';
  if (c === 'quota_or_state' || c === 'quota_exceeded') return 'Storage is full. Delete an older work to make room.';
  if (c === 'rate_limited' || c === 'resource_exhausted') return 'Too many changes at once. Wait a moment and save again.';
  if (c === 'invalid_argument') return 'This change wasn’t accepted. Only the owner can edit.';
  return (e && (e.custom || e.message)) || 'Something went wrong. Try again.';
}
function requireDb() { if (!db) throw { custom: 'The database is offline in this view.' }; }
const nowIso = () => new Date().toISOString();

function editProfile() {
  openForm({ title: 'Edit profile', values: profile(), fields: [
    { id: 'handle', label: 'name', required: true }, { id: 'tagline', label: 'tagline' }, { id: 'about', label: 'about you', type: 'textarea' },
  ], onSave: async v => { requireDb(); await db.doc('site/profile').set({ handle: v.handle, tagline: v.tagline, about: v.about, updated: nowIso() }); } });
}
function editInterest(it) {
  openForm({ title: it ? 'Edit interest' : 'New interest', values: it || {}, fields: [
    { id: 'label', label: 'what', required: true }, { id: 'kind', label: 'kind', type: 'select', options: KINDS }, { id: 'note', label: 'note' },
  ], onSave: async v => {
    requireDb();
    if (it) await db.doc('interests/' + it.id).update({ label: v.label, kind: v.kind, note: v.note, updated: nowIso() });
    else await db.collection('interests').add({ label: v.label, kind: v.kind, note: v.note, order: Date.now(), created: nowIso() });
  }, onDelete: it ? () => db.doc('interests/' + it.id).delete() : null });
}
function editLink(l) {
  openForm({ title: l ? 'Edit link' : 'New link', values: l || {}, fields: [
    { id: 'platform', label: 'platform', type: 'select', options: PLATFORMS },
    { id: 'url', label: 'link to your profile', type: 'url', required: true, placeholder: 'https://open.spotify.com/user/…', hint: 'copy it from the address bar or the app’s share button' },
    { id: 'label', label: 'button text (optional)', placeholder: 'defaults to the platform name' },
  ], onSave: async v => {
    requireDb();
    if (!safeUrl(v.url)) throw { custom: 'Link must start with http:// or https://' };
    const body = { platform: v.platform, url: v.url, label: v.label || (v.platform === 'other' ? '' : v.platform), updated: nowIso() };
    if (l) await db.doc('links/' + l.id).update(body); else await db.collection('links').add({ ...body, order: Date.now() });
  }, onDelete: l ? () => db.doc('links/' + l.id).delete() : null });
}
function editApp(a) {
  openForm({ title: a ? 'Edit app' : 'New app', values: a || {}, fields: [
    { id: 'name', label: 'name', required: true }, { id: 'desc', label: 'what it does', type: 'textarea' },
    { id: 'status', label: 'status', type: 'select', options: STATUSES }, { id: 'url', label: 'link', type: 'url', placeholder: 'https://…' },
    { id: 'tech', label: 'built with' },
  ], onSave: async v => {
    requireDb();
    if (v.url && !safeUrl(v.url)) throw { custom: 'Link must start with http:// or https://' };
    const body = { name: v.name, desc: v.desc, status: v.status, url: v.url, tech: v.tech, updated: nowIso() };
    if (a) await db.doc('apps/' + a.id).update(body); else await db.collection('apps').add({ ...body, created: nowIso() });
  }, onDelete: a ? () => db.doc('apps/' + a.id).delete() : null });
}
function mediaType(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (/^image\/(png|jpeg|gif|webp)$/.test(file.type)) return { kind: 'art', type: file.type };
  if (['png', 'gif', 'webp'].includes(ext)) return { kind: 'art', type: 'image/' + ext };
  if (['jpg', 'jpeg'].includes(ext)) return { kind: 'art', type: 'image/jpeg' };
  if (['m4a', 'mp4', 'aac'].includes(ext)) return { kind: 'music', type: 'video/mp4' };
  if (['webm', 'weba'].includes(ext)) return { kind: 'music', type: 'video/webm' };
  if (['mp3', 'wav', 'flac', 'ogg'].includes(ext)) throw { custom: '.' + ext + ' can’t be stored here. Export as .m4a (AAC) or .webm, or paste a link instead.' };
  throw { custom: 'Use an image (png, jpg, gif, webp) or audio as .m4a / .webm.' };
}
function editWork(w) {
  openForm({ title: w ? 'Edit work' : 'New work', values: w || {}, fields: [
    { id: 'title', label: 'title', required: true }, { id: 'kind', label: 'kind', type: 'select', options: ['art', 'music'] },
    ...(assets ? [{ id: 'file', label: w ? 'replace file' : 'file', type: 'file', accept: 'image/png,image/jpeg,image/gif,image/webp,.m4a,.mp4,.aac,.webm,.weba', hint: 'art: png, jpg, gif, webp · music: .m4a or .webm · up to 20 MB' }] : []),
    { id: 'link', label: 'external link', type: 'url', placeholder: 'https://…' }, { id: 'note', label: 'note' },
  ], onSave: async (v, status) => {
    requireDb();
    if (v.link && !safeUrl(v.link)) throw { custom: 'Link must start with http:// or https://' };
    const body = { title: v.title, kind: v.kind, link: v.link, note: v.note, updated: nowIso() };
    if (v.file) { const mt = mediaType(v.file); body.kind = mt.kind; status('uploading…'); body.assetId = (await assets.upload(v.file, { type: mt.type })).id; }
    if (!w && !body.assetId && !body.link) throw { custom: 'Add a file or an external link.' };
    if (w) await db.doc('works/' + w.id).update(body); else await db.collection('works').add({ ...body, created: nowIso() });
  }, onDelete: w ? async () => { await db.doc('works/' + w.id).delete(); if (w.assetId && assets) { try { await assets.delete(w.assetId); } catch {} } } : null });
}
function editPost(p) {
  openForm({ title: p ? 'Edit entry' : 'New entry', values: p || {}, fields: [
    { id: 'title', label: 'title', required: true },
    { id: 'body', label: 'entry', type: 'textarea', tall: true, required: true, hint: 'blank line = new paragraph · ## heading · > quote' },
  ], onSave: async v => {
    requireDb();
    if (p) await db.doc('posts/' + p.id).update({ title: v.title, body: v.body, updated: nowIso() });
    else { const ref = await db.collection('posts').add({ title: v.title, body: v.body, created: nowIso() }); go('log', ref.id); }
  }, onDelete: p ? async () => { await db.doc('posts/' + p.id).delete(); go('log'); } : null });
}
function lightbox(w) {
  const link = safeUrl(w.link);
  const m = $('#modal');
  m.replaceChildren(h('div', { class: 'lightbox' }, sheet(w.title || 'untitled', editBtn(() => { closeModal(); (w.onEdit || (() => editWork(w)))(); }),
    w.assetId ? h('img', { src: blob(w.assetId), alt: w.title || 'artwork' }) : null,
    (w.note || w.created) ? h('p', { style: 'margin:12px 0 0;color:var(--dim);font-size:14px' }, fmtDate(w.created), w.note ? ' · ' + w.note : '') : null,
    link ? h('p', { style: 'margin:4px 0 0;font-size:14px' }, h('a', { href: link, target: '_blank', rel: 'noopener' }, 'view elsewhere ↗')) : null)));
  m.hidden = false;
}

async function connect() {
  let D = {};
  try { D = await (await fetch('content.json', { cache: 'no-cache' })).json(); }
  catch (e) { console.error('Could not load content.json — check the Actions tab on GitHub for a failed build.', e); }
  const list = v => Array.isArray(v) ? v : [];
  const txt = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent; };
  S.about = D.about || null;
  S.profile = D.profile || null; S.status = D.status || null; S.listening = D.listening || null; S.hidden = D.hidden || null;
  S.links = list(D.links); S.interests = list(D.interests); S.apps = list(D.apps); S.shelf = list(D.shelf);
  S.projects = list(D.projects).map((x, i) => ({ id: 'pj' + i, created: x.started, ...x }));
  S.works = list(D.works).map((x, i) => ({ id: 'w' + i, assetId: x.image || x.audio, ...x }));
  S.board = list(D.board).map((x, i) => ({ id: 'b' + i, z: i, ...x, type: x.image ? 'image' : 'note', assetId: x.image }));
  S.posts = list(D.posts).map(p => ({ ...p, body: p.html ? txt(p.html) : (p.body || '') }));
  BUILT = D.built || null;
  for (const k of Object.keys(S)) S.loaded[k] = true;
  online = true; isAdmin = false;
  render();
  if (location.hash === '#board-arrange') boardArrange();
}

/* ---------- board arranging helper: open yoursite/#board-arrange, drag, then "copy layout" ---------- */
function boardArrange() {
  isAdmin = true; assets = null; route = 'board'; render();
  const bar = h('div', { style: 'position:fixed;left:16px;bottom:16px;z-index:60;display:flex;gap:10px;align-items:center;padding:8px 12px;background:var(--ground);border:1px solid var(--blue);font-size:13px' },
    'arranging the board —',
    h('button', { class: 'save', onclick: async () => {
      const esc = s => JSON.stringify(String(s));
      const out = S.board.map(b => (b.type === 'image' ? `- image: ${b.assetId}` : `- text: ${esc(b.text || '')}`) +
        `\n  x: ${Math.round(b.x)}\n  y: ${Math.round(b.y)}\n  w: ${Math.round(b.w)}\n  rot: ${b.rot || 0}`).join('\n');
      try { await navigator.clipboard.writeText(out); toast('copied — paste it into _data/board.yml'); }
      catch { const t = h('textarea', { style: 'position:fixed;inset:10%;z-index:70;width:80%;height:80%' }); t.value = out; document.body.append(t); t.select(); }
    } }, 'copy layout'));
  document.body.append(bar);
}
render();
connect();
})();
