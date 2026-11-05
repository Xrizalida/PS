// PS 2.0 — точка входа: данные, состояние, маршруты, шапка, тема.
// Подбор — общий детерминированный алгоритм версии 1 (scripts/engine), без ИИ и без случайности.

import { createStore, reconcileCatalog, forgetLegacyState } from './core/store.js';
import { prepareData } from '../../scripts/engine/index.js';
import { reducedMotion, toast, esc } from './core/dom.js';
import { createGlossary } from './core/glossary.js';
import { canShowResults } from './core/request.js';
import { closeSheet, openSheet } from './ui/sheet.js';
import { openSaved } from './ui/perfume.js';
import * as intro from './screens/intro.js';
import * as choose from './screens/choose.js';
import * as method from './screens/method.js';
import * as feel from './screens/feel.js';
import * as moods from './screens/moods.js';
import * as tier from './screens/tier.js';
import * as quiz from './screens/quiz.js';
import * as finish from './screens/finish.js';
import * as results from './screens/results.js';
import { watchSlotImages } from './ui/slot.js';

const SCREENS = { '': intro, choose, method, feel, moods, tier, quiz, finish, results };
const NEEDS_CATALOG = ['quiz', 'finish', 'results'];

const load = async (path) => {
  const res = await fetch(new URL(path, document.baseURI), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
};

// Куда можно попасть: без пола — только вступление и выбор пола, без способа — выбор способа и т. д.
function guard(route, s, questions) {
  if (!(route in SCREENS)) return '';
  if (route !== '' && route !== 'choose' && !s.gender) return '';
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

  // Подбор живёт в памяти этой страницы. Старое сохранение из прошлых визитов не восстанавливаем и удаляем.
  // Проверочные страницы (?audit, только внутри страницы с того же адреса) передают готовое состояние сценария.
  const audit = new URLSearchParams(location.search).has('audit');
  let auditState = null;
  if (audit && window.parent !== window) {
    try { auditState = window.parent.__psAuditState ?? null; } catch { auditState = null; }
    if (new URLSearchParams(location.search).get('motion') === 'reduce') document.documentElement.dataset.motion = 'reduce';
  }
  forgetLegacyState();
  const store = createStore(auditState);
  // Проверочным страницам — доступ к текущему шагу и состоянию, чтобы проверять сценарии.
  if (audit) window.__ps = { store, nav: (...a) => nav(...a), route: () => current };

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

  // Задний план широких экранов — одно цельное фото (камни слева, цветы справа, тёмная середина под контентом).
  // Фото вставляется, только когда экран широкий (от 1100 px, как в CSS) и шаг использует задний план:
  // на телефоне оно не скачивается вовсе. Пока фото нет — тональные слои.
  const decorEl = document.querySelector('[data-decor="full"]');
  const wide = window.matchMedia('(min-width: 1100px)');
  const DECOR_ROUTES = { '': null, choose: 1, method: 0.85 }; // во вступлении видимость задаёт прокрутка
  function ensureDecorImage() {
    const d = media.decor?.full;
    const ok = (p) => /^images\/decor\/[a-z0-9-]+\.(webp|avif|jpe?g|png)$/.test(p);
    if (!decorEl || decorEl.classList.contains('has-img') || !wide.matches || !(current in DECOR_ROUTES) || !d?.src || !ok(d.src)) return;
    const srcset = (d.srcset ?? '').split(',').map((x) => x.trim()).filter((x) => ok(x.split(' ')[0])).join(', ');
    decorEl.innerHTML = `<img src="${d.src}"${srcset ? ` srcset="${srcset}" sizes="100vw"` : ''} alt="" decoding="async">`;
    decorEl.classList.add('has-img');
    const img = decorEl.querySelector('img');
    // Проявляется плавно после загрузки — без резкой вспышки и без сдвига контента (слой фиксирован за ним).
    const shown = () => img.classList.add('is-in');
    if (img.complete && img.naturalWidth) shown(); else img.addEventListener('load', shown, { once: true });
  }
  wide.addEventListener?.('change', ensureDecorImage);

  let current = null;
  let cleanup = () => {};

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
    // Выбор пола сделан во вступлении: текущая запись истории становится #/choose, чтобы «Назад» вело к выбору.
    rememberChoose: () => history.replaceState({ ps: true, route: 'choose', prev: null }, '', '#/choose'),
    // Экранная «Назад»: если предыдущий шаг истории — нужный экран, идём по истории (тогда работает и «Вперёд»),
    // иначе открываем его вместо текущей записи.
    back: (route) => (history.state?.ps && history.state.prev === route ? history.back() : nav(route, { replace: true })),
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
        <p class="small muted">Подбор и сохранённое живут, пока открыта эта страница. После перезагрузки или нового визита подбор начнётся заново.</p>
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
  // Каждый шаг — запись истории браузера (#/шаг). В записи помним предыдущий шаг (prev),
  // чтобы экранная «Назад» могла вернуться по истории, а не открывать экран заново.
  const routeFromHash = () => location.hash.replace(/^#\/?/, '');
  function nav(route, opts = {}) {
    const same = routeFromHash() === route;
    // Тот же шаг (например, следующий вопрос анкеты) обновляет свою запись и сохраняет её «предыдущий шаг».
    const prev = 'prev' in opts ? opts.prev : same ? (history.state?.prev ?? null) : current;
    const entry = { ps: true, route, prev };
    if (same || opts.replace) history.replaceState(entry, '', `#/${route}`);
    else history.pushState(entry, '', `#/${route}`);
    return show(route, same ? { force: true, ...opts } : opts);
  }

  async function show(requested, opts = {}) {
    const { force = false, keepScroll = false, keepSheet = false } = opts;
    const s = store.get();
    // Старая ссылка на убранную галерею ароматов ведёт к выбору пути подбора.
    if (requested === 'gallery') return nav(s.gender ? 'method' : 'choose', { replace: true });
    const route = guard(requested, s, questions);
    // Перенаправление заменяет запись, а не добавляет: иначе «Назад» снова попадал бы на закрытый шаг.
    if (route !== requested) return nav(route, { replace: true });
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
    ensureDecorImage();

    const swap = () => {
      const y = window.scrollY;
      cleanup();
      app.innerHTML = screen.render(ctx);
      // Прокрутка — до подключения экрана: экран может сам прокрутить страницу (например, колода «по одной»).
      if (keepScroll) window.scrollTo(0, y);
      else window.scrollTo(0, 0);
      cleanup = screen.mount(app, ctx) ?? (() => {});
      syncHeader();
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

  // «Назад» / «Вперёд» браузера и ручная правка адреса. Повторный вызов для того же шага ничего не делает.
  window.addEventListener('popstate', () => show(routeFromHash()));
  window.addEventListener('hashchange', () => show(routeFromHash()));

  // Возврат на страницу из кеша браузера (ушли на другой сайт и нажали «Назад»): прежний подбор не оживает,
  // начинается новый. Переходы внутри PS, смена вкладки и сворачивание сюда не относятся.
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    closeSheet(true);
    store.reset();
    nav('', { replace: true, prev: null });
  });

  // Шапка без подложки, пока под ней только верхний отступ экрана выбора (секция стоит у верхнего края):
  // на отдельном экране #/choose — пока страница не прокручена, во вступлении — когда выбор занял экран
  // и сцена ушла вверх. Как только под шапку заезжает контент, подложка возвращается.
  function syncHeader() {
    let clear = false;
    const c = current === 'choose' || current === '' ? app.querySelector('#choose') : null;
    if (c) clear = Math.abs(c.getBoundingClientRect().top) < 2;
    html.toggleAttribute('data-hdr-clear', clear);
  }
  window.addEventListener('scroll', syncHeader, { passive: true });
  window.addEventListener('resize', syncHeader);
  // Высота страницы может измениться без прокрутки (догрузились шрифты, фото) — пересчитываем и тогда.
  if ('ResizeObserver' in window) new ResizeObserver(() => syncHeader()).observe(app);

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  // Первая запись этой страницы тоже помечается как шаг PS.
  history.replaceState({ ps: true, route: routeFromHash(), prev: null }, '', location.href);
  await show(routeFromHash());
  // Каталог подгружаем заранее, пока человек читает вступление.
  setTimeout(ensureData, 1200);
}

boot().catch((e) => {
  document.getElementById('app').innerHTML = `<div class="wrap screen"><p>Не удалось загрузить PS. Обнови страницу.</p><p class="small muted">${esc(String(e.message ?? e))}</p></div>`;
  console.error(e);
});
