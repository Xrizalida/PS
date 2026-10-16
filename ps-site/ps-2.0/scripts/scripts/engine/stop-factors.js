// Стоп-факторы: жёсткие исключают аромат, мягкие снижают оценку и дают предупреждение.

import { dimValue } from './vector.js';

// Как выражен стоп-фактор в аромате: по официальным нотам, по шкалам или только по восприятию.
export function stopFactorPresence(perfume, factorId, config) {
  const confirmed = perfume.stopFactors?.confirmed?.includes(factorId) ?? false;
  const possible = perfume.stopFactors?.possible?.includes(factorId) ?? false;
  const rules = config.stopFactorRules[factorId] ?? [];
  const byValue = rules.some((r) => dimValue(perfume, r.dim) >= r.min);
  return { confirmed, byValue, possible };
}

export function checkStopFactors(perfume, { hard = [], soft = [] }, config) {
  const excludedBy = [];
  const warnings = [];
  let penalty = 0;

  for (const id of hard) {
    const p = stopFactorPresence(perfume, id, config);
    if (p.confirmed || p.byValue || (config.hardStopIncludesPossible && p.possible)) excludedBy.push(id);
  }

  for (const id of soft) {
    if (hard.includes(id)) continue;
    const p = stopFactorPresence(perfume, id, config);
    if (p.confirmed || p.byValue) {
      penalty += config.softStopPenalty;
      warnings.push({ factor: id, basis: p.confirmed ? 'confirmed' : 'value' });
    } else if (p.possible) {
      penalty += config.possibleStopPenalty;
      warnings.push({ factor: id, basis: 'possible' });
    }
  }

  return { excluded: excludedBy.length > 0, excludedBy, warnings, penalty };
}
