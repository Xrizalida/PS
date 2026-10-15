// Состояние PS 2.0. Хранится в браузере отдельно от версии 1 (ключ ps2-state).

import { emptySelection } from './selection.js';

export const STORAGE_KEY = 'ps2-state';
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
    lang: 'plain', // 'plain' | 'expert' — меняет только язык описаний
    saved: [],
    compare: [],
    gallery: null, // фильтры галереи; null — значения по умолчанию из gallery.json
    galleryView: null, // 'cards' | 'list'; null — список на телефоне, карточки на компьютере
  };
}

// Фильтры галереи из браузера: берём только поля правильного типа, остальное — по умолчанию.
function cleanGallery(g) {
  if (!g || typeof g !== 'object') return null;
  const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
  const str = (v, d) => (typeof v === 'string' ? v : d);
  return {
    q: str(g.q, ''),
    gender: str(g.gender, 'all'),
    budget: str(g.budget, 'any'),
    character: arr(g.character),
    projection: typeof g.projection === 'string' ? g.projection : null,
    occasion: arr(g.occasion),
    brand: str(g.brand, ''),
    seasons: arr(g.seasons),
    families: arr(g.families),
    levels: g.levels && typeof g.levels === 'object' && !Array.isArray(g.levels) ? Object.fromEntries(Object.entries(g.levels).filter(([, v]) => typeof v === 'string')) : {},
    avoid: arr(g.avoid),
    ...(typeof g.sort === 'string' ? { sort: g.sort } : {}),
  };
}

// Старые или повреждённые данные не ломают сайт: недостающее берётся из значений по умолчанию.
export function migrate(raw) {
  const d = defaultState();
  if (!raw || typeof raw !== 'object' || raw.v !== VERSION) return d;
  const sel = (s) => ({
    liked: Array.isArray(s?.liked) ? s.liked.slice(0, 3) : [],
    maybe: Array.isArray(s?.maybe) ? s.maybe : [],
    rejected: Array.isArray(s?.rejected) ? s.rejected : [],
  });
  return {
    ...d,
    ...raw,
    moods: { male: sel(raw.moods?.male), female: sel(raw.moods?.female) },
    quiz: { answers: raw.quiz?.answers ?? {}, index: Number.isInteger(raw.quiz?.index) ? raw.quiz.index : 0 },
    finish: { budget: raw.finish?.budget ?? 'any', stops: Array.isArray(raw.finish?.stops) ? raw.finish.stops : [] },
    tuning: Array.isArray(raw.tuning) ? raw.tuning : [],
    saved: Array.isArray(raw.saved) ? raw.saved : [],
    compare: Array.isArray(raw.compare) ? raw.compare.slice(0, 3) : [],
    gallery: cleanGallery(raw.gallery),
    galleryView: ['cards', 'list'].includes(raw.galleryView) ? raw.galleryView : null,
  };
}

export function createStore(storage = globalThis.localStorage) {
  let state;
  try {
    state = migrate(JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null'));
  } catch {
    state = defaultState();
  }
  const subs = new Set();
  return {
    get: () => state,
    update(fn) {
      state = fn(state);
      try {
        storage?.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        /* приватный режим: работаем без сохранения */
      }
      subs.forEach((f) => f(state));
    },
    subscribe(f) {
      subs.add(f);
      return () => subs.delete(f);
    },
  };
}
