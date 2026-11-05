// Состояние PS 2.0 живёт только в памяти открытой страницы.
// Переходы внутри PS, «Назад» и «Вперёд» его сохраняют; перезагрузка, новая вкладка
// и возврат на страницу из кеша браузера начинают подбор заново (см. main.js, pageshow).

import { emptySelection, MAX_LIKED } from './selection.js';

// Раньше подбор сохранялся в localStorage под этим ключом. Больше не читаем — только удаляем свой ключ.
export const LEGACY_STORAGE_KEY = 'ps2-state';
const VERSION = 1;

export function defaultState() {
  return {
    v: VERSION,
    gender: null, // 'male' | 'female'
    method: null, // 'moods' | 'quiz'
    moodView: null, // 'catalog' | 'swipe' — null, пока человек сам не выбрал
    moodGroup: 'all',
    swipeMode: 'new',
    moods: { male: emptySelection(), female: emptySelection() },
    tier: 'edt', // глубина анкеты
    quiz: { answers: {}, index: 0 },
    resultTier: 'edt', // глубина выдачи в режиме образов: сначала 3 лучших
    finish: { budget: 'any', stops: [] },
    tuning: [],
    resultView: 'cards',
    saved: [],
    compare: [],
  };
}

export function migrate(raw) {
  const d = defaultState();
  if (!raw || typeof raw !== 'object' || raw.v !== VERSION) return d;
  const sel = (s) => ({
    liked: Array.isArray(s?.liked) ? s.liked.slice(0, MAX_LIKED) : [],
    maybe: Array.isArray(s?.maybe) ? s.maybe : [],
    rejected: Array.isArray(s?.rejected) ? s.rejected : [],
  });
  // Поля убранных функций (язык описаний, галерея) из старых сохранений не переносим.
  const { lang, gallery, galleryView, ...rest } = raw;
  return {
    ...d,
    ...rest,
    moods: { male: sel(raw.moods?.male), female: sel(raw.moods?.female) },
    quiz: { answers: raw.quiz?.answers ?? {}, index: Number.isInteger(raw.quiz?.index) ? raw.quiz.index : 0 },
    finish: { budget: raw.finish?.budget ?? 'any', stops: Array.isArray(raw.finish?.stops) ? raw.finish.stops : [] },
    tuning: Array.isArray(raw.tuning) ? raw.tuning : [],
    saved: Array.isArray(raw.saved) ? raw.saved : [],
    compare: Array.isArray(raw.compare) ? raw.compare.slice(0, 3) : [],
  };
}

// После смены каталога убираем ссылки на исключённые карточки. Ответы обычных
// вопросов и выбор образов сохраняются: их идентификаторы не относятся к парфюму.
export function reconcileCatalog(state, perfumeIds, questions = []) {
  const valid = new Set(perfumeIds);
  const clean = (ids) => [...new Set((Array.isArray(ids) ? ids : []).filter((id) => valid.has(id)))];
  const answers = { ...state.quiz.answers };
  for (const q of questions) {
    if (q.type === 'perfumes' && Array.isArray(answers[q.id])) answers[q.id] = clean(answers[q.id]);
  }
  const next = { ...state, saved: clean(state.saved), compare: clean(state.compare).slice(0, 3), quiz: { ...state.quiz, answers } };
  return JSON.stringify(next) === JSON.stringify(state) ? state : next;
}

// Удаляет старое сохранение PS 2.0 — и только его: другие ключи и настройки браузера не трогаем.
export function forgetLegacyState(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* хранилище недоступно (приватный режим) — удалять нечего */
  }
}

// initial — только для проверочных страниц (?audit): готовое состояние сценария. Обычный визит начинается с чистого листа.
export function createStore(initial = null) {
  let state = initial ? migrate(initial) : defaultState();
  const subs = new Set();
  const emit = () => subs.forEach((f) => f(state));
  return {
    get: () => state,
    update(fn) {
      state = fn(state);
      emit();
    },
    reset() {
      state = defaultState();
      emit();
    },
    subscribe(f) {
      subs.add(f);
      return () => subs.delete(f);
    },
  };
}
