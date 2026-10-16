// Выбор образов PS 2.0 — одно состояние для каталога и для карточек по одной.
// liked — понравившиеся образы (порядок = приоритет), maybe — «отложить», rejected — «не нравится».
// Для подбора нужно минимум 3 понравившихся, отметить можно до 7. «Отложенные» в минимум не входят.
// Своя копия логики версии 1, чтобы изменения в одной версии не ломали другую.

export const MIN_LIKED = 3;
export const MAX_LIKED = 7;

export const emptySelection = () => ({ liked: [], maybe: [], rejected: [] });

const without = (list, id) => list.filter((x) => x !== id);
const clean = (sel, id) => ({ liked: without(sel.liked, id), maybe: without(sel.maybe, id), rejected: without(sel.rejected, id) });

export function statusOf(sel, id) {
  if (sel.liked.includes(id)) return 'liked';
  if (sel.maybe.includes(id)) return 'maybe';
  if (sel.rejected.includes(id)) return 'rejected';
  return 'none';
}

// «Нравится». Если уже отмечено 7 — ничего не меняем (full = true): сначала нужно снять одну отметку.
export function like(sel, id) {
  if (sel.liked.includes(id)) return { sel, full: false };
  if (sel.liked.length >= MAX_LIKED) return { sel, full: true };
  const base = clean(sel, id);
  return { sel: { ...base, liked: [...base.liked, id] }, full: false };
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

export const toggleLike = (sel, id) => (sel.liked.includes(id) ? { sel: reset(sel, id), full: false } : like(sel, id));

// Колода: образы без решения в исходном порядке; «revisit» — отложенные и отклонённые.
export function deck(ids, sel, mode = 'new') {
  if (mode === 'revisit') return ids.filter((id) => sel.rejected.includes(id) || sel.maybe.includes(id));
  return ids.filter((id) => statusOf(sel, id) === 'none');
}

export const decidedCount = (sel) => sel.liked.length + sel.maybe.length + sel.rejected.length;

// Можно ли подбирать: не меньше трёх понравившихся.
export const canProceed = (sel) => sel.liked.length >= MIN_LIKED;
export const missing = (sel) => Math.max(0, MIN_LIKED - sel.liked.length);
