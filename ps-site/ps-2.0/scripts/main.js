// PS 2.0 — точка входа: данные, состояние, маршруты, шапка, тема.
// Подбор — общий детерминированный алгоритм версии 1 (scripts/engine), без ИИ и без случайности.

import { createStore, reconcileCatalog } from './core/store.js';
import { prepareData } from '../../scripts/engine/index.js';
import { reducedMotion, toast, esc } from './core/dom.js';
import { createGlossary } from './core/glossary.js';
import { canShowResults } from './core/request.js';
import { closeSheet, openSheet } from './ui/sheet.js';
import { openSaved } from './ui/perfume.js';
import * as intro from './screens/intro.js';
import * as method from './screens/method.js';
import * as feel from './screens/feel.js';
import * as moods from './screens/moods.js';
import * as tier from './screens/tier.js';
import * as quiz from './screens/quiz.js';
import * as finish from './screens/finish.js';
import * as results from './screens/results.js';
import { watchSlotImages } from './ui/slot.js';

const SCREENS = { '': intro, method, feel, moods, tier, quiz, finish, results };
const NEEDS_CATALOG = ['quiz', 'finish', 'results'];

const load = async (path) => {
  const res = await fetch(new URL(path, document.baseURI), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
};

// Куда можно попасть: без пола — только вступление, без способа — выбор способа и т. д.
function guard(route, s, questions) {
  if (!(route in SCREENS)) return '';
  if (route !== '' && !s.gender) return '';
  if (['feel', 'moods', 'tier', 'quiz', 'finish', 'results'].includes(route) && !s.method) return 'method';
  if (['feel', 'moods'].includes(route) && s.method !== 'moods') return 'tier';
  if (['tier', 'quiz'].includes(route) && s.method !== 'quiz') return 'feel';
  if (['finish', 'results'].includes(route) && !canShowResults(s, questions)) return s.method === 'moods' ? 'moods' : 'quiz';
  return route;
}

async function boot() {
  const app = document.getElementById('app');
  const [moodsMale, moodsFemale, dimensions, config, texts] = await Promise.all(
    ['moods-male', 'moods-female', 'dimensions', 'algorithm-config', 'texts'].map((n) => load(`../data/${n}.json`)),
  );
  const [moodsDisplay, perfumesDisplay, questionsJson, glossaryJson, media] = await Promise.all(
    ['moods-display', 'perfumes-display', 'questions', 'notes-glossary', 'media'].map((n) => load(`data/${n}.json`)),
  );
  const questions = questionsJson.questions;
  const display = { moods: moodsDisplay, perfumes: perfumesDisplay.perfumes, media };
  watchSlotImages();
  const glossary = createGlossary(glossaryJson);
  const store = createStore();

  // Каталог (самый тяжёлый файл) грузится отдельно — первый экран открывается без него.
  let data = null;
  let dataPromise = null;
  const ensureData = () => {
    dataPromise ??= load('../data/catalog.json').then((catalog) => {
      data = prepareData({ catalog, moodsMale, moodsFemale, dimensions, config });
      const before = store.get();
      const after = reconcileCatalog(before, data.byId.keys(), questions);
      if (after !== before) store.update(() => after);
      return data;
    });
    return dataPromise;
  };

  const displayById = new Map(moodsDisplay.moods.map((m) => [m.id, m]));
  const moodsCache = {};
  const moodsFor = (gender) => {
    moodsCache[gender] ??= (gender === 'female' ? moodsFemale : moodsMale).moods.map((m) => {
      const d = displayById.get(m.id) ?? {};
      return { ...m, ...d, title: m.title };
    });
    return moodsCache[gender];
  };

  // ---------- Тема и шапка ----------
  const html = document.documentElement;
  const hdrGender = document.querySelector('[data-hdr-gender]');
  const savedBadge = document.querySelector('[data-saved-count]');
  const syncChrome = (s) => {
    html.dataset.theme = s.gender ?? 'neutral';
    hdrGender.hidden = !s.gender;
    hdrGender.querySelectorAll('[data-gender]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.gender === s.gender)));
    savedBadge.hidden = s.saved.length === 0;
    savedBadge.textContent = String(s.saved.length);
  };
  syncChrome(store.get());
  store.subscribe(syncChrome);

  // Боковой декор: пока фото нет — тональные слои; фото подключается из media.json без правки кода.
  for (const side of ['left', 'right']) {
    const d = media.decor?.[side];
    const el = document.querySelector(`[data-decor="${side}"]`);
    if (el && d?.src && /^images\/decor\/[a-z0-9-]+\.(webp|avif|jpe?g|png)$/.test(d.src)) {
      el.innerHTML = `<img src="${d.src}" alt="" loading="lazy" decoding="async">`;
      el.classList.add('has-img');
    }
  }
  const DECOR_ROUTES = { '': null, method: 0.85 }; // во вступлении видимость задаёт прокрутка

  let current = null;
  let cleanup = () => {};
  let pending = null;

  const setGender = (gender) => {
    if (gender === store.get().gender) return;
    store.update((s) => ({ ...s, gender }));
    toast(gender === 'female' ? 'Женский режим. Ответы сохранены.' : 'Мужской режим. Ответы сохранены.');
    if (current) show(current, { force: true, keepSheet: true });
  };

  const ctxBase = {
    store, config, texts, questions, display, glossary, moodsFor, ensureData,
    get data() { return data; },
    perfumeName: (id) => { const p = data?.byId.get(id); return p ? `${p.brand} ${p.name}` : id; },
  };

  const openSettings = () => {
    const s = store.get();
    openSheet({
      title: 'Настройки',
      html: `<div class="settings">
        <div class="head"><h2 class="display h3">Настройки</h2></div>
        ${s.gender ? `<div class="settings__item"><p class="eyebrow">Режим</p>
          <div class="seg seg--full" role="group" aria-label="Режим">
            <button type="button" class="seg__btn" data-set-gender="male" aria-pressed="${s.gender === 'male'}">Мужское</button>
            <button type="button" class="seg__btn" data-set-gender="female" aria-pressed="${s.gender === 'female'}">Женское</button>
          </div></div>` : ''}
        <p class="small muted">Ответы и сохранённое хранятся только в этом браузере.</p>
      </div>`,
      onMount: (panel) => panel.addEventListener('click', (e) => {
        const g = e.target.closest('[data-set-gender]');
        if (g) {
          setGender(g.dataset.setGender);
          const st = store.get();
          panel.querySelectorAll('[data-set-gender]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setGender === st.gender)));
        }
      }),
    });
  };

  document.querySelector('.hdr').addEventListener('click', async (e) => {
    const el = e.target.closest('[data-gender], [data-open], [data-home]');
    if (!el) return;
    if (el.dataset.home !== undefined) { e.preventDefault(); return nav(''); }
    if (el.dataset.gender) return setGender(el.dataset.gender);
    if (el.dataset.open === 'settings') return openSettings();
    if (el.dataset.open === 'saved') {
      await ensureData();
      return openSaved({ ...ctxBase });
    }
  });

  // ---------- Маршруты ----------
  function nav(route, opts = {}) {
    const hash = `#/${route}`;
    const same = location.hash === hash || (route === '' && ['', '#', '#/'].includes(location.hash));
    if (same) return show(route, { force: true, ...opts });
    pending = opts;
    location.hash = hash;
  }

  async function show(requested, opts = {}) {
    const { force = false, keepScroll = false, keepSheet = false } = opts;
    const s = store.get();
    // Старая ссылка на убранную галерею ароматов ведёт к выбору пути подбора.
    if (requested === 'gallery') return nav(s.gender ? 'method' : '', s.gender ? { force: true } : { force: true, focus: 'choose' });
    const route = guard(requested, s, questions);
    if (route !== requested) return nav(route);
    if (route === current && !force) return;
    if (!keepSheet) closeSheet(true);
    if (NEEDS_CATALOG.includes(route) && !data) {
      app.innerHTML = '<div class="wrap screen"><p class="muted">Загружаем каталог…</p></div>';
      await ensureData();
    }
    const screen = SCREENS[route];
    const ctx = { ...ctxBase, nav, state: store.get(), params: opts, route };
    const prev = current;
    current = route;
    html.dataset.route = route || 'intro';
    html.dataset.decor = route in DECOR_ROUTES ? 'on' : 'off';
    html.style.setProperty('--decor-o', String(DECOR_ROUTES[route] ?? 0));

    const swap = () => {
      const y = window.scrollY;
      cleanup();
      app.innerHTML = screen.render(ctx);
      // Прокрутка — до подключения экрана: экран может сам прокрутить страницу (например, колода «по одной»).
      if (keepScroll) window.scrollTo(0, y);
      else if (!opts.focus) window.scrollTo(0, 0);
      cleanup = screen.mount(app, ctx) ?? (() => {});
      const h1 = app.querySelector('h1');
      if (prev !== null && h1 && route !== '' && !keepScroll) {
        h1.setAttribute('tabindex', '-1');
        h1.focus({ preventScroll: true });
      }
    };
    if (prev !== null && !keepScroll && !reducedMotion()) {
      app.classList.add('is-leaving');
      setTimeout(() => {
        app.classList.remove('is-leaving');
        app.classList.add('is-entering');
        swap();
        // Таймер, а не requestAnimationFrame: экран проявится и во фоновой вкладке.
        setTimeout(() => app.classList.remove('is-entering'), 30);
      }, 180);
    } else swap();
  }

  const routeFromHash = () => location.hash.replace(/^#\/?/, '');
  window.addEventListener('hashchange', () => {
    const opts = pending ?? {};
    pending = null;
    show(routeFromHash(), opts);
  });
  await show(routeFromHash());
  // Каталог подгружаем заранее, пока человек читает вступление.
  setTimeout(ensureData, 1200);
}

boot().catch((e) => {
  document.getElementById('app').innerHTML = `<div class="wrap screen"><p>Не удалось загрузить PS. Обнови страницу.</p><p class="small muted">${esc(String(e.message ?? e))}</p></div>`;
  console.error(e);
});
