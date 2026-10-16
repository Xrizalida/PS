// Оценка соответствия аромата профилю: число от 0 до 1 и его составные части.

import { dimValue, similarity } from './vector.js';

// Близость характера: 1 − взвешенная средняя разница «хочется» и «есть», делённая на 5.
export function characterScore(perfume, targets) {
  let sum = 0;
  let weights = 0;
  for (const [dim, { target, weight }] of Object.entries(targets)) {
    sum += weight * (1 - Math.abs(target - dimValue(perfume, dim)) / 5);
    weights += weight;
  }
  return weights ? sum / weights : 0;
}

// Штраф за превышение ограничений образа («лучше без»).
export function avoidPenalty(perfume, avoid, config) {
  let points = 0;
  for (const [dim, max] of Object.entries(avoid)) {
    points += Math.max(0, dimValue(perfume, dim) - max);
  }
  return points * config.avoidPenaltyPerPoint;
}

function overlapShare(wanted = [], has = []) {
  if (!wanted.length) return null;
  return wanted.filter((x) => has.includes(x)).length / wanted.length;
}

export function scorePerfume(perfume, profile, request, data, dims) {
  const { config } = data;
  const parts = { character: characterScore(perfume, profile.targets) };

  if (profile.moods.length) {
    let best = 0;
    profile.moods.forEach((sel, index) => {
      const fit = perfume.moods?.find((m) => m.id === sel.id)?.fit ?? 0;
      const pw = config.moodPriorityWeights[index] ?? config.moodPriorityWeights.at(-1);
      best = Math.max(best, (fit / 3) * pw);
    });
    parts.moodFit = best;
  }

  const season = overlapShare(request.seasons, perfume.seasons);
  if (season !== null) parts.season = season;
  const occasion = overlapShare(request.occasions, perfume.occasions);
  if (occasion !== null) parts.occasion = occasion;

  if (request.budget && request.budget !== 'any') {
    parts.budget = perfume.segment === request.budget ? 1 : config.cheaperSegmentScore;
  }

  const liked = (request.likedIds ?? []).map((id) => data.byId.get(id)).filter(Boolean);
  if (liked.length) parts.liked = Math.max(...liked.map((l) => similarity(perfume, l, dims)));

  // Тонкая настройка Le Parfum: «более универсальный» и «больше необычных вариантов».
  if (request.preferWearable) parts.wearability = (perfume.wearability?.score ?? 0) / 5;
  if (request.preferOriginal) parts.originality = (perfume.originality ?? 0) / 5;

  let weighted = 0;
  let weights = 0;
  for (const [name, value] of Object.entries(parts)) {
    weighted += config.weights[name] * value;
    weights += config.weights[name];
  }

  let penalty = avoidPenalty(perfume, profile.avoid, config);
  const disliked = (request.dislikedIds ?? []).map((id) => data.byId.get(id)).filter(Boolean);
  if (disliked.length) {
    penalty += config.dislikedSimilarityPenalty * Math.max(...disliked.map((d) => similarity(perfume, d, dims)));
  }

  return { score: weights ? weighted / weights - penalty : 0, parts, penalty };
}

export function matchLabel(score, config) {
  return config.matchLabels.find((l) => score >= l.min).label;
}
