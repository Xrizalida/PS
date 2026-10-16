// Точка входа PS: загрузка данных, состояние, маршруты, тема, смена экранов.
// Подбор полностью ручной и детерминированный — в браузере работает обычный JavaScript, без ИИ.

import { createStore } from './app/store.js';
import { prepareData } from './engine/index.js';
import { prefersReducedMotion, toast } from './app/dom.js';
import { closeModal } from './ui/modal.js';
import * as home from './ui/screens/home.js';
import * as method from './ui/screens/method.js';
import * as tier from './ui/screens/tier.js';
import * as moods from './ui/screens/moods.js';
import * as quiz from './ui/screens/quiz.js';
import * as refine from './ui/screens/refine.js';
import * as results from './ui/screens/results.js';

const SCREENS = { home, gender: home, method, tier, moods, quiz, refine, results };

// Что нужно выбрать, прежде чем открыть экран. Если нельзя — возвращаем на нужный шаг.
function guard(route, s) {
  if (['method', 'tier', 'moods', 'quiz', 'refine', 'results'].includes(route) && !s.gender) return 'gender';
  if (['tier', 'moods', 'quiz', 'refine', 'results'].includes(route) && !s.method) return 'method';
  if (['moods', 'quiz', 'refine', 'results'].includes(route) && !s.tier) return 'tier';
  if (route === 'moods' && s.method !== 'moods') return 'quiz';
  if (route === 'quiz' && s.method !== 'quiz') return 'moods';
  return route;
}

async function loadJson(path) {
  const res = await fetch(new URL(path, document.baseURI), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

async function boot() {
  const app = document.getElementById('app');
  const [catalog, moodsMale, moodsFemale, dimensions, config, questions, texts] = await Promise.all(
    ['catalog', 'moods-male', 'moods-female', 'dimensions', 'algorithm-config', 'questions', 'texts'].map((n) => loadJson(`data/${n}.json`)),
  );
  const data = prepareData({ catalog, moodsMale, moodsFemale, dimensions, config });
  const store = createStore();
  let cleanup = () => {};
  let currentRoute = null;

  const html = document.documentElement;
  const applyTheme = (s) => { html.dataset.theme = s.gender ?? 'neutral'; };
  applyTheme(store.get());

  // Шапка: переключатель пола доступен, когда пол уже выбран; ответы не теряются.
  const headerGender = document.querySelector('[data-header-gender]');
  const syncHeader = (s) => {
    headerGender.hidden = !s.gender;
    headerGender.querySelectorAll('[data-gender]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.gender === s.gender)));
  };
  syncHeader(store.get());
  store.subscribe((s) => { applyTheme(s); syncHeader(s); });

  headerGender.addEventListener('click', (e) => {
    const b = e.target.closest('[data-gender]');
    if (!b || b.dataset.gender === store.get().gender) return;
    store.update((s) => ({ ...s, gender: b.dataset.gender }));
    toast('Режим изменён. Ответы анкеты сохранены, образы хранятся отдельно для каждого режима.');
    if (['moods', 'results'].includes(currentRoute)) show(currentRoute, { force: true });
  });
  document.querySelector('[data-home]').addEventListener('click', (e) => {
    e.preventDefault();
    nav('home');
  });

  function nav(route) {
    const hash = route === 'home' ? '#/' : `#/${route}`;
    if (location.hash === hash) show(route, { force: true });
    else location.hash = hash;
  }

  function show(requested, { force = false } = {}) {
    const route = guard(requested, store.get());
    if (route !== requested) return nav(route);
    if (route === currentRoute && !force) return;
    closeModal(true);
    cleanup();
    const screen = SCREENS[route] ?? home;
    const ctx = { store, state: store.get(), data, questions: questions.questions, texts, nav, route };
    const swap = () => {
      app.innerHTML = screen.render(ctx);
      app.classList.remove('is-leaving');
      app.classList.add('is-entering');
      // Таймер, а не requestAnimationFrame: экран гарантированно проявится даже во фоновой вкладке.
      setTimeout(() => app.classList.remove('is-entering'), 30);
      if (route !== 'gender') window.scrollTo({ top: 0 });
      cleanup = screen.mount(app, ctx) ?? (() => {});
      const heading = app.querySelector('h1');
      if (currentRoute && heading && route !== 'gender') {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
      currentRoute = route;
    };
    if (currentRoute && !prefersReducedMotion()) {
      app.classList.add('is-leaving');
      setTimeout(swap, 180);
    } else swap();
  }

  const routeFromHash = () => location.hash.replace(/^#\/?/, '') || 'home';
  window.addEventListener('hashchange', () => show(routeFromHash()));
  show(routeFromHash());
}

boot().catch((e) => {
  document.getElementById('app').innerHTML = `<div class="container screen"><p>Не удалось загрузить данные PS. Обнови страницу.</p><pre class="muted">${String(e.message ?? e)}</pre></div>`;
  console.error(e);
});
