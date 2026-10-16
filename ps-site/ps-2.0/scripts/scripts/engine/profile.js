// Профиль предпочтений: из выбранных образов, ответов анкеты и уточнений.

import { clamp } from './vector.js';

/**
 * request.moods       — [{ id, priority }] (priority 1 — главный образ)
 * request.dims        — { dim: { target, weight } } из анкеты или свободного текста
 * request.adjustments — { dim: сдвиг } из уточняющих вопросов
 * request.avoidDims   — { dim: max }
 */
export function buildProfile(request, data) {
  const { config } = data;
  const moodById = new Map(data.moods.map((m) => [m.id, m]));
  const selected = [...(request.moods ?? [])]
    .filter((m) => moodById.has(m.id))
    .sort((a, b) => (a.priority ?? 1) - (b.priority ?? 1) || a.id.localeCompare(b.id));

  const sums = {};
  let priorityTotal = 0;
  selected.forEach((sel, index) => {
    const pw = config.moodPriorityWeights[index] ?? config.moodPriorityWeights.at(-1);
    priorityTotal += pw;
    for (const [dim, { target, weight }] of Object.entries(moodById.get(sel.id).profile)) {
      sums[dim] ??= { t: 0, w: 0 };
      sums[dim].t += pw * weight * target;
      sums[dim].w += pw * weight;
    }
  });

  const targets = {};
  for (const [dim, s] of Object.entries(sums)) {
    targets[dim] = { target: s.t / s.w, weight: s.w / priorityTotal };
  }

  for (const [dim, v] of Object.entries(request.dims ?? {})) {
    targets[dim] = { target: clamp(v.target, 0, 5), weight: clamp(v.weight ?? 1, 0, 1) };
  }

  for (const [dim, delta] of Object.entries(request.adjustments ?? {})) {
    if (targets[dim]) targets[dim].target = clamp(targets[dim].target + delta, 0, 5);
    else targets[dim] = { target: delta > 0 ? clamp(2 + delta, 0, 5) : 0, weight: config.adjustmentNewDimWeight };
  }

  const avoid = {};
  // request.avoidMoodLimit (необязательно): ограничения «лучше без» берутся только из N главных образов.
  // PS 2.0 разрешает до 7 образов — без этого запреты всех семи складывались бы и сужали подбор.
  // Версия 1 параметр не передаёт: для неё поведение прежнее.
  const avoidFrom = request.avoidMoodLimit ? selected.slice(0, request.avoidMoodLimit) : selected;
  for (const sel of avoidFrom) {
    for (const [dim, { max }] of Object.entries(moodById.get(sel.id).avoid ?? {})) {
      avoid[dim] = Math.min(avoid[dim] ?? 5, max);
    }
  }
  for (const [dim, max] of Object.entries(request.avoidDims ?? {})) {
    avoid[dim] = Math.min(avoid[dim] ?? 5, max);
  }

  return { targets, avoid, moods: selected };
}
