// Превращает ответы человека (образы, анкету, уточнения) в запрос к алгоритму подбора.
// Сетка и свайп дают одно и то же состояние, поэтому и запрос у них одинаковый.

function mergeDim(dims, dim, { target, weight }) {
  const prev = dims[dim];
  dims[dim] = prev
    ? { target: (prev.target * prev.weight + target * weight) / (prev.weight + weight), weight: Math.max(prev.weight, weight) }
    : { target, weight };
}

export function questionsForTier(questions, tier) {
  return questions.filter((q) => q.tiers.includes(tier));
}

export function buildRequest(state, data, questions) {
  const gender = state.gender;
  const request = {
    mode: gender,
    includeOtherCategory: state.includeOther,
    tier: state.tier ?? 'edt',
    budget: state.refine.budget ?? 'any',
    moods: [],
    dims: {},
    adjustments: {},
    hardStops: [...state.refine.hardStops],
    softStops: [...state.refine.softStops],
    seasons: [...(state.refine.seasons ?? [])],
    occasions: [],
    likedIds: [],
    dislikedIds: [],
    ownedIds: [],
    experiment: 'mid',
  };

  if (state.method === 'moods') {
    const sel = state.moods[gender];
    sel.liked.forEach((id, i) => request.moods.push({ id, priority: i + 1 }));
    sel.maybe.slice(0, data.config.maxMaybeMoods).forEach((id, i) => request.moods.push({ id, priority: 4 + i }));
  }

  if (state.method === 'quiz') {
    const moodIds = [];
    for (const q of questionsForTier(questions, request.tier)) {
      const answer = state.quiz.answers[q.id];
      if (answer == null) continue;
      if (q.type === 'perfumes') {
        const ids = Array.isArray(answer) ? answer : [];
        if (q.effect.role === 'liked') request.likedIds.push(...ids);
        if (q.effect.role === 'disliked') request.dislikedIds.push(...ids);
        if (q.effect.role === 'owned') request.ownedIds.push(...ids);
        continue;
      }
      const chosen = (Array.isArray(answer) ? answer : [answer]).map((id) => q.options.find((o) => o.id === id)).filter(Boolean);
      for (const o of chosen) {
        const e = o.effect ?? {};
        for (const [dim, v] of Object.entries(e.dims ?? {})) mergeDim(request.dims, dim, v);
        for (const s of e.seasons ?? []) if (!request.seasons.includes(s)) request.seasons.push(s);
        for (const s of e.occasions ?? []) if (!request.occasions.includes(s)) request.occasions.push(s);
        for (const m of e.moods?.[gender] ?? []) if (!moodIds.includes(m)) moodIds.push(m);
        if (e.experiment) request.experiment = e.experiment;
      }
    }
    moodIds.forEach((id, i) => request.moods.push({ id, priority: i + 1 }));
  }

  // Тонкая настройка Le Parfum — настоящий пересчёт: сдвигает профиль и фильтры.
  for (const tid of state.tier === 'parfum' ? state.tuning : []) {
    const t = data.config.tuning.find((x) => x.id === tid);
    if (!t) continue;
    for (const [dim, delta] of Object.entries(t.adjustments ?? {})) request.adjustments[dim] = (request.adjustments[dim] ?? 0) + delta;
    for (const s of t.hardStops ?? []) if (!request.hardStops.includes(s)) request.hardStops.push(s);
    for (const s of t.occasions ?? []) if (!request.occasions.includes(s)) request.occasions.push(s);
    if (t.preferWearable) request.preferWearable = true;
    if (t.preferOriginal) request.preferOriginal = true;
    if (t.experiment) request.experiment = t.experiment;
  }

  return request;
}
