// Подбор ароматов: ответы → профиль → фильтры → оценка → разнообразие → открытие.
// Никакой случайности: одинаковый запрос и одинаковые данные дают одинаковый результат.

import { allDims } from './vector.js';
import { buildProfile } from './profile.js';
import { checkStopFactors } from './stop-factors.js';
import { scorePerfume, matchLabel } from './scoring.js';
import { selectDiverse, pickDiscovery } from './diversity.js';

/**
 * Готовит данные один раз: каталог, образы, справочник, настройки.
 * raw = { catalog, moodsMale, moodsFemale, dimensions, config }
 */
export function prepareData(raw) {
  const perfumes = raw.catalog.perfumes;
  return {
    perfumes,
    byId: new Map(perfumes.map((p) => [p.id, p])),
    moods: [...raw.moodsMale.moods, ...raw.moodsFemale.moods],
    dimensions: raw.dimensions,
    config: raw.config,
    dims: allDims(raw.dimensions),
  };
}

export function isEligible(perfume, config) {
  return config.eligibleStatuses.includes(perfume.dataStatus) && config.eligibleListStatuses.includes(perfume.listStatus);
}

export function genderAllowed(perfume, mode, includeOtherCategory) {
  if (!mode || perfume.gender === 'unisex' || includeOtherCategory) return true;
  return perfume.gender === mode;
}

export function budgetAllowed(perfume, budget, config) {
  if (!budget || budget === 'any') return true;
  const order = config.segmentOrder;
  return order.indexOf(perfume.segment) <= order.indexOf(budget);
}

/**
 * request = {
 *   mode: 'male' | 'female', includeOtherCategory, tier: 'edt' | 'edp' | 'parfum',
 *   budget: 'budget' | 'mid' | 'premium' | 'any', exactSegment (только для проверок покрытия),
 *   moods: [{ id, priority }], dims, adjustments, avoidDims,
 *   hardStops: [], softStops: [], seasons: [], occasions: [], likedIds: [], dislikedIds: []
 * }
 */
export function recommend(request, data) {
  const { config, dims } = data;
  const tier = config.tiers[request.tier ?? 'edt'];
  const profile = buildProfile(request, data);
  const excluded = { status: 0, gender: 0, budget: 0, stopFactors: 0, lowScore: 0 };

  const owned = new Set(request.ownedIds ?? []);
  const scored = [];
  for (const perfume of data.perfumes) {
    if (!isEligible(perfume, config)) { excluded.status++; continue; }
    if (owned.has(perfume.id)) { excluded.owned = (excluded.owned ?? 0) + 1; continue; }
    if (!genderAllowed(perfume, request.mode, request.includeOtherCategory)) { excluded.gender++; continue; }
    if (request.exactSegment ? perfume.segment !== request.budget : !budgetAllowed(perfume, request.budget, config)) {
      excluded.budget++;
      continue;
    }
    const stops = checkStopFactors(perfume, { hard: request.hardStops, soft: request.softStops }, config);
    if (stops.excluded) { excluded.stopFactors++; continue; }
    const s = scorePerfume(perfume, profile, request, data, dims);
    const score = s.score - stops.penalty;
    // Слабые совпадения не показываются: лучше короткая подборка, чем добор случайными ароматами.
    if (score < config.minResultScore) { excluded.lowScore++; continue; }
    scored.push({ perfume, score, parts: s.parts, warnings: stops.warnings });
  }

  scored.sort((a, b) => b.score - a.score || a.perfume.id.localeCompare(b.perfume.id));

  const caps = { maxPerBrand: tier.maxPerBrand, maxPerLine: tier.maxPerLine };
  // Готовность к экспериментам: «классика» — без открытия, «хочу удивиться» — мягче пороги открытия.
  const exp = config.discovery.byExperiment?.[request.experiment] ?? {};
  const discoverySettings = { ...config.discovery, ...exp };
  const discoveryEnabled = tier.results > 1 && exp.enabled !== false;
  const main = selectDiverse(scored, discoveryEnabled ? tier.results - 1 : tier.results, caps, config.diversity.lambda, dims);
  const discovery = discoveryEnabled ? pickDiscovery(scored, main, caps, discoverySettings, dims) : null;
  let results = [...main];
  if (discovery) results.push({ ...discovery, isDiscovery: true });
  else results = selectDiverse(scored, tier.results, caps, config.diversity.lambda, dims);

  return {
    results: results.map((r) => ({
      id: r.perfume.id,
      perfume: r.perfume,
      score: r.score,
      label: matchLabel(r.score, config),
      parts: r.parts,
      warnings: r.warnings,
      isDiscovery: Boolean(r.isDiscovery),
    })),
    candidates: scored.length,
    excluded,
    profile,
  };
}
