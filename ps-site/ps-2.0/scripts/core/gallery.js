// Галерея ароматов: поиск, фильтры и сортировка по 100 допущенным ароматам общего каталога.
// Все фильтры привязаны к реальным полям каталога (шкалы 0–5, сезоны, ситуации, сегмент, семейство, стоп-факторы).
// Фильтры — жёсткие: аромат, который не проходит условие, не показывается. Одинаковые настройки → одинаковый список.

import { isEligible } from '../../../scripts/engine/index.js';
import { stopFactorPresence } from '../../../scripts/engine/stop-factors.js';
import { dimValue } from '../../../scripts/engine/vector.js';

const s = (p, dim) => dimValue(p, dim);

// Характер запаха. plain — для режима «Просто», expert — для режима «Нотами».
export const CHARACTERS = [
  { id: 'fresh', plain: 'Свежий и лёгкий', expert: 'Свежие: свежесть от 3, интенсивность до 3', test: (p) => s(p, 'fresh') >= 3 && s(p, 'intensity') <= 3 },
  { id: 'clean', plain: 'Чистый и мягкий', expert: 'Мускусные, альдегидные, мыльные', test: (p) => (s(p, 'musky') >= 3 || s(p, 'aldehydic') >= 3 || s(p, 'soapy') >= 3) && s(p, 'sweet') <= 3 },
  { id: 'warm', plain: 'Тёплый и уютный', expert: 'Амбровые, ванильные, тёплые пряные', test: (p) => s(p, 'amber') >= 3 || s(p, 'vanilla') >= 3 || (s(p, 'spicy') >= 3 && s(p, 'sweet') >= 2) },
  { id: 'sweet', plain: 'Сладкий', expert: 'Сладость от 3 из 5', test: (p) => s(p, 'sweet') >= 3 },
  { id: 'woody', plain: 'Древесный', expert: 'Древесные: от 3 из 5', test: (p) => s(p, 'woody') >= 3 },
  { id: 'floral', plain: 'Цветочный', expert: 'Цветочные: от 3 из 5', test: (p) => s(p, 'floral') >= 3 },
  { id: 'spicy', plain: 'Пряный', expert: 'Пряные: от 3 из 5', test: (p) => s(p, 'spicy') >= 3 },
  { id: 'unusual', plain: 'Необычный', expert: 'Оригинальность от 4 из 5 (оценка PS)', test: (p) => (p.originality ?? 0) >= 4 },
];

// Заметность — по шлейфу (sillage).
export const PROJECTIONS = [
  { id: 'soft', plain: 'Почти не ощущается окружающими', expert: 'Шлейф 0–2 из 5', test: (p) => s(p, 'sillage') <= 2 },
  { id: 'moderate', plain: 'Умеренный', expert: 'Шлейф 3 из 5', test: (p) => s(p, 'sillage') === 3 },
  { id: 'strong', plain: 'Выразительный', expert: 'Шлейф 4–5 из 5', test: (p) => s(p, 'sillage') >= 4 },
];

export const OCCASIONS = [
  { id: 'daily', plain: 'Каждый день', occasions: ['daily'] },
  { id: 'office', plain: 'На работу', occasions: ['office'] },
  { id: 'date', plain: 'На свидание', occasions: ['date'] },
  { id: 'evening', plain: 'На вечер', occasions: ['evening', 'party'] },
  { id: 'special', plain: 'На особый случай', occasions: ['special'] },
];

export const GENDERS = [
  { id: 'all', plain: 'Все' },
  { id: 'male', plain: 'Мужские' },
  { id: 'female', plain: 'Женские' },
  { id: 'unisex', plain: 'Унисекс' },
];

// Сегменты предварительные: точные цены не подтверждены.
export const BUDGETS = [
  { id: 'any', plain: 'Любой' },
  { id: 'budget', plain: 'До 5 000 ₽' },
  { id: 'mid', plain: '5 000–15 000 ₽' },
  { id: 'premium', plain: 'От 15 000 ₽' },
];

// Уровни шкал для «Больше фильтров».
export const LEVEL_DIMS = [
  { id: 'sweet', plain: 'Сладость', expert: 'Сладость (sweet)' },
  { id: 'woody', plain: 'Древесность', expert: 'Древесные ноты (woody)' },
  { id: 'floral', plain: 'Цветочность', expert: 'Цветочные ноты (floral)' },
  { id: 'fresh', plain: 'Свежесть', expert: 'Свежесть (fresh)' },
  { id: 'spicy', plain: 'Пряность', expert: 'Пряности (spicy)' },
  { id: 'intensity', plain: 'Насыщенность', expert: 'Интенсивность (intensity)' },
];
export const LEVELS = [
  { id: 'low', plain: 'Мало', expert: '0–1', test: (v) => v <= 1 },
  { id: 'mid', plain: 'Средне', expert: '2–3', test: (v) => v >= 2 && v <= 3 },
  { id: 'high', plain: 'Много', expert: '4–5', test: (v) => v >= 4 },
];

export const SORTS = [
  { id: 'alpha', plain: 'По алфавиту' },
  { id: 'popular', plain: 'Узнаваемые сначала' },
  { id: 'discovery', plain: 'Открытия PS' },
];

export function defaultFilters(config = {}) {
  return {
    q: '',
    gender: 'all',
    budget: 'any',
    character: [],
    projection: null,
    occasion: [],
    brand: '',
    seasons: [],
    families: [],
    levels: {},
    avoid: [],
    sort: config.defaultSort ?? 'alpha',
  };
}

// Нормализация для поиска: регистр, ё, диакритика (Hermès → hermes), апострофы и знаки.
export const normalize = (str) =>
  String(str ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’`]/g, '')
    .replace(/[^a-zа-я0-9&]+/g, ' ')
    .trim();

export function searchIndex(perfumes, aliases = {}) {
  const map = new Map();
  for (const p of perfumes) {
    const extra = aliases[p.brand] ?? [];
    const line = (p.line ?? '').replace(/-/g, ' ');
    map.set(p.id, normalize([p.brand, p.name, line, ...extra].join(' ')));
  }
  return map;
}

// Все слова запроса должны найтись (в любом порядке): «sauvage dior», «диор соваж» не нужен — только подтверждённые написания брендов.
export function matchesQuery(index, id, q) {
  const words = normalize(q).split(' ').filter(Boolean);
  if (!words.length) return true;
  const hay = ` ${index.get(id) ?? ''}`;
  return words.every((w) => hay.includes(` ${w}`) || hay.includes(w));
}

export function eligiblePerfumes(data) {
  return data.perfumes.filter((p) => isEligible(p, data.config));
}

// Проверка одного аромата по всем фильтрам. Внутри группы — «или», между группами — «и».
export function passes(p, f, ctx) {
  if (!matchesQuery(ctx.index, p.id, f.q)) return false;
  if (f.gender !== 'all' && p.gender !== f.gender) return false;
  if (f.budget !== 'any' && p.segment !== f.budget) return false;
  if (f.character.length && !f.character.some((id) => CHARACTERS.find((c) => c.id === id)?.test(p))) return false;
  if (f.projection && !PROJECTIONS.find((x) => x.id === f.projection)?.test(p)) return false;
  if (f.occasion.length) {
    const wanted = f.occasion.flatMap((id) => OCCASIONS.find((o) => o.id === id)?.occasions ?? []);
    if (!wanted.some((o) => p.occasions?.includes(o))) return false;
  }
  if (f.brand && p.brand !== f.brand) return false;
  if (f.seasons.length && !f.seasons.some((x) => p.seasons?.includes(x))) return false;
  if (f.families.length && !f.families.includes(p.family)) return false;
  for (const [dim, level] of Object.entries(f.levels)) {
    const L = LEVELS.find((x) => x.id === level);
    if (L && !L.test(dimValue(p, dim))) return false;
  }
  // Нежелательные ноты — как жёсткие стоп-факторы в подборе: исключаем и подтверждённые, и возможные.
  for (const stop of f.avoid) {
    const pr = stopFactorPresence(p, stop, ctx.config);
    if (pr.confirmed || pr.byValue || pr.possible) return false;
  }
  return true;
}

const byName = (a, b) => `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`, 'ru');

export function sortPerfumes(list, sort, popularity = {}) {
  const tier = (p) => popularity[p.id]?.popularityTier ?? 9;
  const out = [...list];
  if (sort === 'popular') out.sort((a, b) => tier(a) - tier(b) || byName(a, b));
  else if (sort === 'discovery') {
    // Открытия PS: менее очевидные и оригинальные — первыми, популярность не подавляет нишу.
    out.sort((a, b) => tier(b) - tier(a) || (b.originality ?? 0) - (a.originality ?? 0) || byName(a, b));
  } else out.sort(byName);
  return out;
}

export function filterGallery(data, f, ctx) {
  return sortPerfumes(eligiblePerfumes(data).filter((p) => passes(p, f, ctx)), f.sort, ctx.popularity);
}

// Сколько фильтров включено (без поиска и сортировки) — для счётчика и кнопки «Сбросить всё».
export function activeCount(f) {
  return (f.gender !== 'all') + (f.budget !== 'any') + f.character.length + Boolean(f.projection) + f.occasion.length
    + Boolean(f.brand) + f.seasons.length + f.families.length + Object.keys(f.levels).length + f.avoid.length;
}
