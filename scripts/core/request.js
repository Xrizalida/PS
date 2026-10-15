// Ответы PS 2.0 → запрос к общему алгоритму подбора (scripts/engine).
// Сам алгоритм не меняется: 2.0 только собирает для него запрос в том же формате, что и версия 1.
// Режим «Просто / Нотами» сюда не попадает — он меняет язык, а не результат.

export const TIER_ORDER = ['edt', 'edp', 'parfum'];

export function questionsForTier(questions, tier) {
  return questions.filter((q) => q.tiers.includes(tier));
}

// Сколько ароматов показываем: уровень анкеты или глубина выдачи в режиме образов.
export function activeTier(state) {
  return state.method === 'quiz' ? state.tier : state.resultTier;
}

function mergeDim(dims, dim, { target, weight }) {
  const prev = dims[dim];
  dims[dim] = prev
    ? { target: (prev.target * prev.weight + target * weight) / (prev.weight + weight), weight: Math.max(prev.weight, weight) }
    : { target, weight };
}

export function buildRequest(state, data, questions) {
  const gender = state.gender;
  const tier = activeTier(state);
  const request = {
    mode: gender,
    includeOtherCategory: false,
    tier,
    budget: state.finish.budget ?? 'any',
    moods: [],
    dims: {},
    adjustments: {},
    hardStops: [...state.finish.stops],
    softStops: [],
    seasons: [],
    occasions: [],
    likedIds: [],
    dislikedIds: [],
    ownedIds: [],
    // Три аромата — это три лучших совпадения, без «открытия». Открытие появляется с 7 и 15.
    experiment: tier === 'edt' ? 'low' : 'mid',
  };

  if (state.method === 'moods') {
    const sel = state.moods[gender];
    sel.liked.forEach((id, i) => request.moods.push({ id, priority: i + 1 }));
    sel.maybe.slice(0, data.config.maxMaybeMoods).forEach((id, i) => request.moods.push({ id, priority: 4 + i }));
  }

  if (state.method === 'quiz') {
    const moodIds = [];
    for (const q of questionsForTier(questions, tier)) {
      const answer = state.quiz.answers[q.id];
      if (answer == null) continue;
      if (q.type === 'perfumes') {
        const ids = Array.isArray(answer) ? answer : [];
        if (q.effect?.role === 'liked') request.likedIds.push(...ids);
        continue;
      }
      const chosen = (Array.isArray(answer) ? answer : [answer]).map((id) => q.options.find((o) => o.id === id)).filter(Boolean);
      for (const o of chosen) {
        const e = o.effect ?? {};
        for (const [dim, v] of Object.entries(e.dims ?? {})) mergeDim(request.dims, dim, v);
        for (const s of e.seasons ?? []) if (!request.seasons.includes(s)) request.seasons.push(s);
        for (const s of e.occasions ?? []) if (!request.occasions.includes(s)) request.occasions.push(s);
        for (const m of e.moods?.[gender] ?? []) if (!moodIds.includes(m)) moodIds.push(m);
        if (e.experiment && tier !== 'edt') request.experiment = e.experiment;
      }
    }
    moodIds.forEach((id, i) => request.moods.push({ id, priority: i + 1 }));
  }

  // Тонкая настройка доступна на уровне Le Parfum — настоящий пересчёт профиля и фильтров.
  if (tier === 'parfum') {
    for (const tid of state.tuning) {
      const t = data.config.tuning.find((x) => x.id === tid);
      if (!t) continue;
      for (const [dim, delta] of Object.entries(t.adjustments ?? {})) request.adjustments[dim] = (request.adjustments[dim] ?? 0) + delta;
      for (const s of t.hardStops ?? []) if (!request.hardStops.includes(s)) request.hardStops.push(s);
      for (const s of t.occasions ?? []) if (!request.occasions.includes(s)) request.occasions.push(s);
      if (t.preferWearable) request.preferWearable = true;
      if (t.preferOriginal) request.preferOriginal = true;
      if (t.experiment) request.experiment = t.experiment;
    }
  }

  return request;
}

// Можно ли показывать подборку: есть хотя бы один образ или хотя бы один ответ анкеты.
export function canShowResults(state, questions) {
  if (!state.gender || !state.method) return false;
  if (state.method === 'moods') {
    const sel = state.moods[state.gender];
    return sel.liked.length > 0 || sel.maybe.length > 0;
  }
  return questionsForTier(questions, state.tier).some((q) => state.quiz.answers[q.id] != null);
}
