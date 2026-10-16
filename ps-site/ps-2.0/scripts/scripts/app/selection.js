// Единое состояние выбора образов — одно для сетки и для свайпа (ТЗ Design 2.0, раздел 7).
// liked — основные образы (до 3, порядок = приоритет), maybe — «возможно», rejected — «не моё».
// «Не моё» — не стоп-фактор: такие образы просто не участвуют в расчёте.

export const MAX_LIKED = 3;

export function emptySelection() {
  return { liked: [], maybe: [], rejected: [] };
}

const without = (list, id) => list.filter((x) => x !== id);

function clean(sel, id) {
  return { liked: without(sel.liked, id), maybe: without(sel.maybe, id), rejected: without(sel.rejected, id) };
}

export function statusOf(sel, id) {
  if (sel.liked.includes(id)) return 'liked';
  if (sel.maybe.includes(id)) return 'maybe';
  if (sel.rejected.includes(id)) return 'rejected';
  return 'none';
}

// «Нравится». Если основных уже три — образ попадает в «возможно», и об этом сообщается (overflow).
export function like(sel, id) {
  if (sel.liked.includes(id)) return { sel, overflow: false };
  const base = clean(sel, id);
  if (base.liked.length >= MAX_LIKED) return { sel: { ...base, maybe: [...base.maybe, id] }, overflow: true };
  return { sel: { ...base, liked: [...base.liked, id] }, overflow: false };
}

export function maybe(sel, id) {
  const base = clean(sel, id);
  return { ...base, maybe: [...base.maybe, id] };
}

export function reject(sel, id) {
  const base = clean(sel, id);
  return { ...base, rejected: [...base.rejected, id] };
}

export function reset(sel, id) {
  return clean(sel, id);
}

// Для сетки: нажатие на карточку включает или снимает «нравится».
export function toggleLike(sel, id) {
  return sel.liked.includes(id) ? { sel: reset(sel, id), overflow: false } : like(sel, id);
}

// Колода свайпа: образы без решения в исходном порядке; режим «пропущенные» — отклонённые и «возможно».
export function deck(moodIds, sel, mode = 'new') {
  if (mode === 'revisit') return moodIds.filter((id) => sel.rejected.includes(id) || sel.maybe.includes(id));
  return moodIds.filter((id) => statusOf(sel, id) === 'none');
}

export function decidedCount(sel) {
  return sel.liked.length + sel.maybe.length + sel.rejected.length;
}
