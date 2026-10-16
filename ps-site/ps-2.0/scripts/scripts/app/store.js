// Состояние приложения и его сохранение в браузере (localStorage), чтобы подбор не терялся при обновлении страницы.
// Хранится только то, что выбрал человек; никаких имён, телефонов и почты.

import { emptySelection } from './selection.js';

const KEY = 'ps-state';
export const STATE_VERSION = 1;

export function defaultState() {
  return {
    v: STATE_VERSION,
    gender: null, // 'male' | 'female'
    includeOther: false,
    method: null, // 'moods' | 'quiz'
    tier: null, // 'edt' | 'edp' | 'parfum'
    moodView: 'grid', // 'grid' | 'swipe'
    swipeMode: 'new', // 'new' | 'revisit'
    moods: { male: emptySelection(), female: emptySelection() }, // образы хранятся отдельно для каждого режима
    quiz: { answers: {}, index: 0 },
    refine: { budget: 'any', hardStops: [], softStops: [], seasons: [] },
    tuning: [],
    saved: [],
  };
}

// Переход со старых версий сохранённого состояния. Неизвестное или повреждённое — начинаем заново.
export function migrate(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object' || raw.v !== STATE_VERSION) return base;
  const sel = (s) => ({
    liked: Array.isArray(s?.liked) ? s.liked.slice(0, 3) : [],
    maybe: Array.isArray(s?.maybe) ? s.maybe : [],
    rejected: Array.isArray(s?.rejected) ? s.rejected : [],
  });
  return {
    ...base,
    ...raw,
    moods: { male: sel(raw.moods?.male), female: sel(raw.moods?.female) },
    quiz: { answers: raw.quiz?.answers ?? {}, index: Number.isInteger(raw.quiz?.index) ? raw.quiz.index : 0 },
    refine: { ...base.refine, ...(raw.refine ?? {}) },
    tuning: Array.isArray(raw.tuning) ? raw.tuning : [],
    saved: Array.isArray(raw.saved) ? raw.saved : [],
  };
}

function load() {
  try {
    return migrate(JSON.parse(localStorage.getItem(KEY)));
  } catch {
    return defaultState();
  }
}

function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Приватный режим или переполненное хранилище — подбор работает, просто не запоминается.
  }
}

export function createStore(initial = load()) {
  let state = initial;
  const listeners = new Set();
  return {
    get: () => state,
    update(fn) {
      state = fn(state);
      save(state);
      for (const l of listeners) l(state);
    },
    reset(keep = {}) {
      state = { ...defaultState(), ...keep };
      save(state);
      for (const l of listeners) l(state);
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
