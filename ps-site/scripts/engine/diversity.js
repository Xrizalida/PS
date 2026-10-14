// Разнообразие подборки и «Ароматическое открытие PS».

import { similarity } from './vector.js';

function capsAllow(candidate, selected, caps) {
  const sameBrand = selected.filter((s) => s.perfume.brand === candidate.perfume.brand).length;
  if (sameBrand >= caps.maxPerBrand) return false;
  const line = candidate.perfume.line;
  if (line && selected.filter((s) => s.perfume.line === line).length >= caps.maxPerLine) return false;
  return true;
}

function maxSimilarity(candidate, selected, dims) {
  return selected.reduce((m, s) => Math.max(m, similarity(candidate.perfume, s.perfume, dims)), 0);
}

/**
 * Жадный отбор: каждый следующий — хорош сам по себе и не повторяет уже выбранные.
 * scored — отсортирован по убыванию оценки, при равенстве по id (детерминированно).
 */
export function selectDiverse(scored, count, caps, lambda, dims) {
  const selected = [];
  const pool = [...scored];
  while (selected.length < count && pool.length) {
    let bestIndex = -1;
    let bestValue = -Infinity;
    pool.forEach((c, i) => {
      if (!capsAllow(c, selected, caps)) return;
      const value = lambda * c.score - (1 - lambda) * maxSimilarity(c, selected, dims);
      if (value > bestValue) {
        bestValue = value;
        bestIndex = i;
      }
    });
    if (bestIndex === -1) break;
    selected.push(pool.splice(bestIndex, 1)[0]);
  }
  return selected;
}

// Открытие: менее очевидный или оригинальный аромат, почти не уступающий лучшим по оценке.
export function pickDiscovery(scored, selected, caps, settings, dims) {
  if (!scored.length) return null;
  const top = scored[0].score;
  const chosen = new Set(selected.map((s) => s.perfume.id));
  const w = settings.rankWeights;
  let best = null;
  let bestRank = -Infinity;
  for (const c of scored) {
    if (chosen.has(c.perfume.id)) continue;
    if (c.score < settings.minScore || c.score < top * settings.minRelativeToTop) continue;
    const p = c.perfume;
    if (p.recognizability !== 'hidden' && (p.originality ?? 0) < settings.minOriginality) continue;
    if (!capsAllow(c, selected, caps)) continue;
    const rank = w.score * c.score + w.originality * ((p.originality ?? 0) / 5) + w.novelty * (1 - maxSimilarity(c, selected, dims));
    if (rank > bestRank) {
      bestRank = rank;
      best = c;
    }
  }
  return best;
}
