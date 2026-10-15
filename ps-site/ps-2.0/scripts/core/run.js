// Запуск подбора: запрос PS 2.0 → общий алгоритм → объяснения → короткие тексты 2.0.

import { recommend } from '../../../scripts/engine/index.js';
import { explain } from '../../../scripts/engine/explain.js';
import { buildRequest } from './request.js';

export function runSelection(state, ctx) {
  const { data, questions, texts, display } = ctx;
  const request = buildRequest(state, data, questions);
  const out = recommend(request, data);
  const items = out.results.map((r) => ({
    ...r,
    ...explain(r, out.profile, request, data, texts),
    display: display.perfumes[r.id] ?? null,
  }));
  return {
    request,
    items,
    profile: out.profile,
    candidates: out.candidates,
    wanted: data.config.tiers[request.tier].results,
  };
}
