// PS 2.0 — точка входа: данные, состояние, маршруты, шапка, тема.
// Подбор — общий детерминированный алгоритм версии 1 (scripts/engine), без ИИ и без случайности.

import { createStore } from './core/store.js';
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
import * as gallery from './screens/gallery.js';
import { watchSlotImages } from './ui/slot.js';

const SCREENS = { '': intro, method, feel, moods, tier, quiz, finish, results, gallery };
const NEEDS_CATALOG = ['quiz', 'finish', 'results', 'gallery'];

const load = async (path) => {
  const res = await fetch(new URL(path, document.baseURI), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
};

// Куда можно попасть: без пола — только вступление, без способа — выбор способа и т. д.
function guard(route, s, questions) {
  if (!(route in SCREENS)) return '';
  if (route === 'gallery') return route; // галерея — самостоятельный путь, пол и анкета не нужны
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
  const [moodsDisplay, perfumesDisplay, questionsJson, glossaryJson, media, galleryCfg, popularity] = await Promise.all(
    ['moods-display', 'perfumes-display', 'questions', 'notes-glossary', 'media', 'gallery', 'popularity'].map((n) => load(`data/${n}.json`)),
  );
  const questions = questionsJson.questions;
  const display = { moods: moodsDisplay, perfumes: perfumesDisplay.perfumes, media, gallery: galleryCfg, popularity };
  watchSlotImages();
  const glossary = createGlossary(glossaryJson);
  const store = createStore();

  // Каталог (самый тяжёлый файл) грузится отдельно — первый экран открывается без него.
  let data = null;
  let dataPromise = null;
  const ensureData = () => {
    dataPromise ??= load('../data/catalog.json').then((catalog) => {
      data = prepareData({ catalog, moodsMale, moodsFemale, dimensions, config });
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
  const setLang = (lang) => {
    if (lang === store.get().lang) return;
    store.update((s) => ({ ...s, lang }));
    if (current !== null) show(current, { force: true, keepScroll: true, keepSheet: true });
  };

  const ctxBase = {
    store, config, texts, questions, display, glossary, moodsFor, ensureData, setLang,
    get data() { return data; },
    perfumeName: (id) => { const p = data?.byId.get(id); return p ? `${p.brand} ${p.name}` : id; },
  };

  const openSettings = () => {
    const s = store.get();
    openSheet({
      title: 'Настройки',
      html: `<div class="settings">
        <div class="head"><p class="eyebrow">Настройки</p><h2 class="display h3">Как показывать подбор</h2></div>
        <div class="settings__item"><p class="eyebrow">Язык описаний</p>
          <div class="seg seg--full" role="group" aria-label="Язык описаний">
            <button type="button" class="seg__btn" data-set-lang="plain" aria-pressed="${s.lang === 'plain'}">Без терминов</button>
            <button type="button" class="seg__btn" data-set-lang="expert" aria-pressed="${s.lang === 'expert'}">На языке нот</button>
          </div>
          <p class="small muted">Меняет только язык описаний. Подборка от этого не меняется.</p></div>
        ${s.gender ? `<div class="settings__item"><p class="eyebrow">Режим</p>
          <div class="seg seg--full" role="group" aria-label="Режим">
            <button type="button" class="seg__btn" data-set-gender="male" aria-pressed="${s.gender === 'male'}">Мужское</button>
            <button type="button" class="seg__btn" data-set-gender="female" aria-pressed="${s.gender === 'female'}">Женское</button>
          </div></div>` : ''}
        <p class="small muted">Ответы и сохранённое хранятся только в этом браузере. Мы не собираем имена, телефоны и почту.</p>
      </div>`,
      onMount: (panel) => panel.addEventListener('click', (e) => {
        const l = e.target.closest('[data-set-lang]');
        const g = e.target.closest('[data-set-gender]');
        if (l) setLang(l.dataset.setLang);
        if (g) setGender(g.dataset.setGender);
        if (l || g) {
          const st = store.get();
          panel.querySelectorAll('[data-set-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setLang === st.lang)));
          panel.querySelectorAll('[data-set-gender]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setGender === st.gender)));
        }
      }),
    });
  };

  document.querySelector('.hdr').addEventListener('click', async (e) => {
    const el = e.target.closest('[data-gender], [data-lang], [data-open], [data-home]');
    if (!el) return;
    if (el.dataset.home !== undefined) { e.preventDefault(); return nav(''); }
    if (el.dataset.gender) return setGender(el.dataset.gender);
    if (el.dataset.lang) return setLang(el.dataset.lang);
    if (el.dataset.open === 'settings') return openSettings();
    if (el.dataset.open === 'gallery') return nav('gallery');
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
