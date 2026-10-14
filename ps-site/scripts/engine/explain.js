// Объяснения к рекомендациям: собираются из готовых блоков data/texts.json по реальным совпадениям.
// Никакой генерации текста — только подстановка фактов, которые алгоритм действительно учёл.

import { dimValue, similarity } from './vector.js';
import { stopFactorPresence } from './stop-factors.js';

const fill = (tpl, values) => tpl.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? '');

// Детерминированный выбор варианта формулировки, чтобы тексты не начинались одинаково.
function pick(list, key) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

function joinRu(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} и ${items.at(-1)}`;
}

/**
 * result — элемент из recommend().results, profile — recommend().profile.
 * Возвращает { why: [строки], warnings: [строки], discovery: {...} | null }.
 */
export function explain(result, profile, request, data, texts) {
  const p = result.perfume;
  const { dimensions, config, dims } = data;
  const label = (list, id) => dimensions[list].find((x) => x.id === id)?.label ?? id;
  const moodTitle = (id) => data.moods.find((m) => m.id === id)?.title ?? id;
  const why = [];

  // 1. Совпадение с выбранными образами (редакционная отметка и/или близость характера).
  const matchedMood = profile.moods.find((m) => (p.moods ?? []).some((pm) => pm.id === m.id && pm.fit >= 2));
  // 2. Характеристики, которые совпали с желаемым: сначала самые важные.
  const traits = Object.entries(profile.targets)
    .filter(([, t]) => t.weight >= 0.5)
    .sort((a, b) => b[1].weight - a[1].weight || a[0].localeCompare(b[0]))
    .map(([dim, t]) => {
      const v = dimValue(p, dim);
      // Про громкость и шлейф говорим «заметный» только если человек сам хотел заметный аромат (от 4).
      const high = dim === 'intensity' || dim === 'sillage' ? 4 : 3;
      if (t.target >= high && v >= high && Math.abs(t.target - v) <= 1) return texts.dimHigh[dim];
      if (t.target <= 1 && v <= 1) return texts.dimLow[dim];
      return null;
    })
    .filter(Boolean)
    .slice(0, 3);

  if (matchedMood || traits.length) {
    const head = matchedMood ? fill(pick(texts.moodMatch, p.id), { mood: moodTitle(matchedMood.id) }) : '';
    const tail = traits.length ? joinRu(traits) : '';
    why.push(head && tail ? `${head}: ${tail}.` : `${(head || tail).charAt(0).toUpperCase()}${(head || tail).slice(1)}.`);
  }

  // 3. Похож на любимый аромат.
  const liked = (request.likedIds ?? []).map((id) => data.byId.get(id)).filter(Boolean);
  const closest = liked
    .map((l) => ({ l, s: similarity(p, l, dims) }))
    .sort((a, b) => b.s - a.s)[0];
  if (closest && closest.s >= 0.85) why.push(fill(texts.liked, { name: `${closest.l.brand} ${closest.l.name}` }) + '.');

  // 4. Сезоны и ситуации — только совпавшие.
  const seasons = (request.seasons ?? []).filter((s) => p.seasons?.includes(s));
  if (seasons.length) why.push(fill(texts.seasons, { list: seasons.map((s) => label('seasons', s).toLowerCase()).join(', ') }) + '.');
  const occasions = (request.occasions ?? []).filter((o) => p.occasions?.includes(o));
  if (occasions.length) why.push(fill(texts.occasions, { list: occasions.map((o) => label('occasions', o).toLowerCase()).join(', ') }) + '.');

  // 5. Учтённые жёсткие стоп-факторы (аромат их прошёл — значит, их нет).
  const stops = (request.hardStops ?? []).filter((id) => {
    const pr = stopFactorPresence(p, id, config);
    return !pr.confirmed && !pr.byValue && !pr.possible;
  });
  if (stops.length) {
    const names = stops.map((s) => label('stopFactors', s).toLowerCase());
    const list = names.length > 4 ? `${names.slice(0, 3).join(', ')} и ещё ${names.length - 3}` : names.join(', ');
    why.push(fill(texts.stopsRespected, { list }) + '.');
  }

  // Предупреждения: мягкие стоп-факторы + честные риски карточки.
  const warnings = [];
  for (const w of result.warnings ?? []) {
    warnings.push(fill(texts.softStopWarning[w.basis] ?? texts.softStopWarning.confirmed, { factor: label('stopFactors', w.factor).toLowerCase() }));
  }
  for (const r of p.risks ?? []) warnings.push(r.text);

  // «Ароматическое открытие PS».
  let discovery = null;
  if (result.isDiscovery) {
    const unexpected = p.recognizability === 'hidden' ? texts.discovery.whyUnexpected.hidden : texts.discovery.whyUnexpected.original;
    const reasons = [];
    if (matchedMood) reasons.push(`он отвечает образу «${moodTitle(matchedMood.id)}»`);
    if (traits.length) reasons.push(traits.slice(0, 2).join(', '));
    const tryReasons = [];
    if (p.lux || p.segment === 'premium') tryReasons.push(texts.discovery.tryFirstReasonExpensive);
    if ((p.originality ?? 0) >= 4 || (p.wearability?.score ?? 5) <= 2) tryReasons.push(texts.discovery.tryFirstReasonUnusual);
    discovery = {
      unexpected,
      anyway: reasons.length ? fill(texts.discovery.whyAnyway, { reasons: reasons.join('; ') }) : '',
      risk: p.risks?.[0]?.text ?? '',
      tryFirst: tryReasons.length ? `${texts.discovery.tryFirst} (${tryReasons.join(', ')})` : '',
    };
  }

  return { why, warnings, discovery };
}
