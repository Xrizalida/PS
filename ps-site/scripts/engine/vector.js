// Работа с характеристиками аромата как с числами 0–5.

// Значение характеристики: сначала шкала, потом оттенок; если не указано — 0.
export function dimValue(perfume, dim) {
  if (perfume.scales && dim in perfume.scales) return perfume.scales[dim];
  return perfume.facets?.[dim] ?? 0;
}

// Все идентификаторы характеристик из справочника (шкалы + оттенки).
export function allDims(dimensions) {
  return [...dimensions.scales.map((s) => s.id), ...dimensions.facets.map((f) => f.id)];
}

// Вектор и его длина запоминаются: сходство считается тысячи раз за одну подборку.
const vectorCache = new WeakMap();

function cachedVector(perfume, dims) {
  let entry = vectorCache.get(perfume);
  if (!entry || entry.dims !== dims) {
    const v = dims.map((d) => dimValue(perfume, d));
    entry = { dims, v, norm: Math.sqrt(v.reduce((s, x) => s + x * x, 0)) };
    vectorCache.set(perfume, entry);
  }
  return entry;
}

export function vectorOf(perfume, dims) {
  return cachedVector(perfume, dims).v;
}

// Косинусное сходство двух ароматов: 1 — одинаковый характер, 0 — ничего общего.
export function similarity(a, b, dims) {
  const ea = cachedVector(a, dims);
  const eb = cachedVector(b, dims);
  if (!ea.norm || !eb.norm) return 0;
  let dot = 0;
  for (let i = 0; i < ea.v.length; i++) dot += ea.v[i] * eb.v[i];
  return dot / (ea.norm * eb.norm);
}

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
