// Revision Aid — retrieval practice with Leitner boxes.
// Static site: decks are JSON files listed in decks/index.json. Progress lives
// in this browser's localStorage only — no sign-in, nothing leaves the device.

const app = document.getElementById('app');
const STORE_KEY = 'revisionAidProgress';
const BOXES = 5; // box 1 = review every session, box 5 = mastered

let catalog = [];

// ---------- progress storage ----------

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
  catch { return {}; }
}
function saveProgress(p) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch { /* private mode */ }
}
function boxOf(progress, deckId, cardIdx) {
  return progress[deckId]?.[cardIdx] ?? 1;
}

// ---------- data ----------

async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Could not load ${path}`);
  return res.json();
}

const deckCache = new Map();
async function loadDeck(id) {
  if (!deckCache.has(id)) deckCache.set(id, await fetchJSON(`decks/${id}.json`));
  return deckCache.get(id);
}

// ---------- helpers ----------

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) node.append(c);
  return node;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- views ----------

function renderHome() {
  const progress = loadProgress();
  const subjects = [...new Set(catalog.map(d => d.subject))].sort();
  const years = [...new Set(catalog.map(d => d.year))].sort((a, b) => a - b);

  const subjectSel = el('select', { 'aria-label': 'Subject' },
    el('option', { value: '' }, 'All subjects'),
    subjects.map(s => el('option', { value: s }, s)));
  const yearSel = el('select', { 'aria-label': 'Year' },
    el('option', { value: '' }, 'All years'),
    years.map(y => el('option', { value: y }, `Year ${y}`)));

  const list = el('div', { class: 'decks' });

  function draw() {
    list.replaceChildren();
    const shown = catalog.filter(d =>
      (!subjectSel.value || d.subject === subjectSel.value) &&
      (!yearSel.value || String(d.year) === yearSel.value));
    for (const d of shown) {
      const mastered = Object.values(progress[d.id] || {}).filter(b => b >= BOXES).length;
      const pct = d.count ? Math.round((mastered / d.count) * 100) : 0;
      list.append(el('button', { class: 'deck', onclick: () => { location.hash = d.id; } },
        el('h2', {}, d.title),
        el('div', { class: 'muted' }, `${d.subject} · Year ${d.year} · ${d.count} cards · ${mastered} mastered`),
        el('div', { class: 'bar' }, el('span', { style: `width:${pct}%` }))));
    }
    if (!shown.length) list.append(el('p', { class: 'muted' }, 'No topics match.'));
  }
  subjectSel.addEventListener('change', draw);
  yearSel.addEventListener('change', draw);
  draw();

  app.replaceChildren(
    el('h1', {}, 'Choose a topic'),
    el('p', { class: 'muted' }, 'Answer from memory before you reveal. Cards you get wrong come back sooner.'),
    el('div', { class: 'filters' }, subjectSel, yearSel),
    list);
}

async function renderPractice(deckId) {
  const deck = await loadDeck(deckId);
  const progress = loadProgress();

  // Lowest boxes first, shuffled within a box, so weak cards are practised most.
  const order = shuffle(deck.cards.map((_, i) => i))
    .sort((a, b) => boxOf(progress, deckId, a) - boxOf(progress, deckId, b));
  const session = order.slice(0, 10);
  let pos = 0, correct = 0;

  function next() {
    if (pos >= session.length) return finish();
    const idx = session[pos];
    const card = deck.cards[idx];
    const answer = el('div', { class: 'answer', hidden: '' }, card.a);
    const reveal = el('button', { class: 'primary', onclick: show }, 'Reveal answer');
    const actions = el('div', { class: 'actions' }, reveal);

    function show() {
      answer.hidden = false;
      actions.replaceChildren(
        el('button', { class: 'bad', onclick: () => rate(false) }, 'Not yet'),
        el('button', { class: 'good', onclick: () => rate(true) }, 'Got it'));
    }
    function rate(gotIt) {
      const p = loadProgress();
      p[deckId] ??= {};
      const box = boxOf(p, deckId, idx);
      p[deckId][idx] = gotIt ? Math.min(box + 1, BOXES) : 1;
      saveProgress(p);
      if (gotIt) correct++;
      pos++;
      next();
    }

    app.replaceChildren(
      el('h1', {}, deck.title),
      el('div', { class: 'progress' },
        el('span', {}, `Card ${pos + 1} of ${session.length}`),
        el('span', {}, `Box ${boxOf(progress, deckId, idx)} of ${BOXES}`)),
      el('div', { class: 'card' }, el('div', { class: 'question' }, card.q), answer),
      actions);
  }

  function finish() {
    app.replaceChildren(
      el('h1', {}, 'Session complete'),
      el('p', {}, `You recalled ${correct} of ${session.length}.`),
      el('div', { class: 'actions' },
        el('button', { class: 'primary', onclick: () => renderPractice(deckId) }, 'Practise again'),
        el('button', { onclick: () => { location.hash = ''; } }, 'Back to topics')));
  }

  next();
}

// ---------- routing ----------

async function route() {
  const id = decodeURIComponent(location.hash.slice(1));
  try {
    if (id && catalog.some(d => d.id === id)) await renderPractice(id);
    else renderHome();
  } catch (err) {
    app.replaceChildren(el('p', {}, err.message));
  }
}

window.addEventListener('hashchange', route);

try {
  catalog = await fetchJSON('decks/index.json');
  route();
} catch (err) {
  app.replaceChildren(el('p', {}, 'Could not load topics. ' + err.message));
}
