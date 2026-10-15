// Выбор образов PS 2.0 — одно состояние для каталога и для карточек по одной.
// liked — основные образы (до 3, порядок = приоритет), maybe — «возможно», rejected — «не моё».
// Своя копия логики версии 1, чтобы изменения в одной версии не ломали другую.

export const MAX_LIKED = 3;

export const emptySelection = () => ({ liked: [], maybe: [], rejected: [] });

const without = (list, id) => list.filter((x) => x !== id);
const clean = (sel, id) => ({ liked: without(sel.liked, id), maybe: without(sel.maybe, id), rejected: without(sel.rejected, id) });

export function statusOf(sel, id) {
  if (sel.liked.includes(id)) return 'liked';
  if (sel.maybe.includes(id)) return 'maybe';
  if (sel.rejected.includes(id)) return 'rejected';
  return 'none';
}

// «Моё». Если основных уже три — образ уходит в «возможно» (overflow = true).
export function like(sel, id) {
  if (sel.liked.includes(id)) return { sel, overflow: false };
  const base = clean(sel, id);
  if (base.liked.length >= MAX_LIKED) return { sel: { ...base, maybe: [...base.maybe, id] }, overflow: true };
  return { sel: { ...base, liked: [...base.liked, id] }, overflow: false };
}

export const maybe = (sel, id) => {
  const base = clean(sel, id);
  return { ...base, maybe: [...base.maybe, id] };
};

export const reject = (sel, id) => {
  const base = clean(sel, id);
  return { ...base, rejected: [...base.rejected, id] };
};

export const reset = (sel, id) => clean(sel, id);

export const toggleLike = (sel, id) => (sel.liked.includes(id) ? { sel: reset(sel, id), overflow: false } : like(sel, id));

// Колода: образы без решения в исходном порядке; «revisit» — отложенные и отклонённые.
export function deck(ids, sel, mode = 'new') {
  if (mode === 'revisit') return ids.filter((id) => sel.rejected.includes(id) || sel.maybe.includes(id));
  return ids.filter((id) => statusOf(sel, id) === 'none');
}

export const decidedCount = (sel) => sel.liked.length + sel.maybe.length + sel.rejected.length;

export const hasChoice = (sel) => sel.liked.length > 0 || sel.maybe.length > 0;
