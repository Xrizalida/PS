// Подписи PS 2.0: тип аромата, ценовой сегмент, сезоны, профиль запроса.

export const CONCENTRATION = {
  EDT: 'Eau de Toilette',
  EDP: 'Eau de Parfum',
  EDC: 'Eau de Cologne',
  Parfum: 'Parfum',
  Extrait: 'Extrait de Parfum',
};

export const typeLabel = (p) => CONCENTRATION[p.concentration] ?? p.concentration;

// Только ориентир по сегменту: проверенных цен пока нет, конкретные суммы не выдумываем.
export const SEGMENTS = {
  budget: { label: 'Доступный', range: 'обычно до 5 000 ₽' },
  mid: { label: 'Средний', range: 'обычно 5 000–15 000 ₽' },
  premium: { label: 'Премиальный', range: 'обычно от 15 000 ₽' },
};
export const PRICE_NOTE = 'Точная цена уточняется: реальные цены и наличие ещё не подтверждены, сегменты предварительные.';

export const segmentLine = (p) => {
  const s = SEGMENTS[p.segment];
  return s ? `Ценовой сегмент: ${s.label.toLowerCase()} (${s.range}). Точная цена уточняется.` : 'Уточнить цену в магазине';
};

export const segmentShort = (p) => {
  const s = SEGMENTS[p.segment];
  return s ? `Сегмент: ${s.label.toLowerCase()} · ${s.range.replace('обычно ', '')}` : 'Цена уточняется';
};

// Заметность словами — по шкалам интенсивности и шлейфа каталога.
export function presenceWords(p) {
  const i = p.scales.intensity;
  const s = p.scales.sillage;
  const power = i <= 2 ? 'Мягкий, негромкий' : i === 3 ? 'Средней насыщенности' : 'Насыщенный, громкий';
  const trail = s <= 2 ? 'держится близко к коже' : s === 3 ? 'чувствуется на расстоянии вытянутой руки' : 'оставляет заметный шлейф';
  return `${power}, ${trail}.`;
}

// Редакционные тексты аромата (data/perfumes-display.json): short — строка в списке, smell — «Как пахнет»,
// feeling — «Ощущение», risk — «Учти». Если нового поля нет, smell берётся из старого detail.
const clean = (s) => (typeof s === 'string' ? s.trim() : '');
export function perfumeTexts(display, id) {
  const d = display?.perfumes?.[id] ?? {};
  return { short: clean(d.short), smell: clean(d.smell) || clean(d.detail), feeling: clean(d.feeling), risk: clean(d.risk) };
}

export const BUDGETS = [
  { id: 'budget', label: 'До 5 000 ₽' },
  { id: 'mid', label: 'До 15 000 ₽' },
  { id: 'any', label: 'Не важно' },
];

export const TIERS = [
  { id: 'edt', name: 'Eau de Toilette', questions: 3, time: 'около 30 секунд', price: 'Бесплатно', lead: 'Быстрое знакомство' },
  { id: 'edp', name: 'Eau de Parfum', questions: 6, time: 'около минуты', price: '250 ₽', lead: 'Подробнее и точнее' },
  { id: 'parfum', name: 'Le Parfum', questions: 9, time: 'около двух минут', price: '500 ₽', lead: 'Максимально точно + тонкая настройка' },
];
export const FREE_NOTE = 'сейчас бесплатно в рамках тестирования';

// «Что точно не нравится» — простыми словами. id — стоп-факторы из data/dimensions.json.
export const STOPS = [
  { id: 'cloying-sweet', plain: 'Приторно-сладкое', main: true },
  { id: 'smoky', plain: 'Дым и костёр', main: true },
  { id: 'heavy-leather', plain: 'Тяжёлая кожа', main: true },
  { id: 'oud', plain: 'Густое тёмное дерево (уд)', main: true },
  { id: 'powdery', plain: 'Пудра, как косметика', main: true },
  { id: 'loud', plain: 'Слишком громко', main: true },
  { id: 'white-floral', plain: 'Густые белые цветы', main: true },
  { id: 'incense', plain: 'Церковный ладан', main: true },
  { id: 'gourmand', plain: 'Запах десерта' },
  { id: 'tobacco', plain: 'Табак' },
  { id: 'rose', plain: 'Роза' },
  { id: 'marine', plain: 'Морской запах' },
  { id: 'soapy', plain: 'Мыло' },
  { id: 'boozy', plain: 'Алкоголь' },
  { id: 'animalic', plain: 'Звериные ноты' },
  { id: 'citrus-heavy', plain: 'Много цитруса' },
];

export const stopLabel = (id) => STOPS.find((x) => x.id === id)?.plain ?? id;

// Сезоны и ситуации одной строкой: «Осень, зима · офис, вечер».
export function whenLine(p, dimensions) {
  const label = (list, id) => dimensions[list].find((x) => x.id === id)?.label ?? id;
  const seasons = p.seasons ?? [];
  const s = seasons.length >= 4 ? 'Круглый год' : seasons.map((x, i) => (i ? label('seasons', x).toLowerCase() : label('seasons', x))).join(', ');
  const o = (p.occasions ?? []).slice(0, 3).map((x) => label('occasions', x).toLowerCase()).join(', ');
  return [s, o].filter(Boolean).join(' · ');
}

const FAMILY_TONE = {
  citrus: 'sand', aquatic: 'sea', green: 'olive', fougere: 'steel', woody: 'graphite', powder: 'powder', musk: 'cream',
  floral: 'powder', 'white-floral': 'cream', rose: 'rose', fruity: 'rose', gourmand: 'cocoa', amber: 'amber',
  leather: 'leather', oud: 'leather', smoky: 'graphite', tobacco: 'cocoa', boozy: 'amber', chypre: 'olive',
};
const FAMILY_MOTIF = { woody: 'verticals', smoky: 'verticals', aquatic: 'horizon', citrus: 'circle', green: 'horizon', gourmand: 'circle', amber: 'arch', oud: 'arch', rose: 'arch', floral: 'arch', musk: 'frame', powder: 'frame' };
export const perfumeTone = (p) => FAMILY_TONE[p.family] ?? 'graphite';
export const perfumeMotif = (p) => FAMILY_MOTIF[p.family] ?? 'frame';

// Короткие слова о запросе: «свежее · древесное · без сладости».
const WORDS = {
  sweet: ['сладкое', 'без сладости'], fresh: ['свежее', null], woody: ['древесное', null], floral: ['цветочное', 'без цветов'],
  powdery: ['пудровое', 'без пудры'], spicy: ['пряное', null], musky: ['чистое', null], leather: ['кожа', null],
  smoky: ['дымное', 'без дыма'], intensity: ['заметное', 'тихое'], vanilla: ['ваниль', null], coffee: ['кофе', null],
  tea: ['чай', null], citrus: ['цитрус', null], aquatic: ['море', null], amber: ['тёплое', null], fruity: ['фрукты', null],
  incense: ['ладан', null], green: ['зелень', null], iris: ['ирис', null], rose: ['роза', null], boozy: ['ром и коньяк', null],
};
export function profileWords(profile, max = 4) {
  return Object.entries(profile.targets)
    .filter(([dim, t]) => WORDS[dim] && t.weight >= 0.55)
    .sort((a, b) => b[1].weight - a[1].weight || a[0].localeCompare(b[0]))
    .map(([dim, t]) => (t.target >= 3.5 ? WORDS[dim][0] : t.target <= 1 ? WORDS[dim][1] : null))
    .filter(Boolean)
    .filter((w, i, arr) => arr.indexOf(w) === i)
    .slice(0, max);
}

export function quoteList(titles) {
  const q = titles.map((t) => `«${t}»`);
  if (q.length <= 1) return q.join('');
  return `${q.slice(0, -1).join(', ')} и ${q.at(-1)}`;
}
