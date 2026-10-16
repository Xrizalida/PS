// Архитектурные SVG-композиции PS. Без фотографий: линии, арки, окружности, свет.
// 7 художественных семейств; 40 образов — их вариации (пропорции, масштаб, расположение, цвет).
// Всё детерминировано: одна и та же карточка всегда рисуется одинаково.

const W = 300;
const H = 300;

// Простой детерминированный генератор чисел по строке (не случайность в подборе — только в рисунке).
function seeded(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n) => Math.round(n * 10) / 10;
let uidCounter = 0;

// Палитры композиций. Цвета берутся из токенов темы, чтобы плавно меняться вместе с ней.
const LINE = 'var(--art-line)';
const LINE_SOFT = 'var(--art-line-soft)';
const GLOW = 'var(--art-glow)';
const GLOW_2 = 'var(--art-glow-2)';

function glow(id, cx, cy, r, color = GLOW) {
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${color}" stop-opacity="0.9"/>
      <stop offset="1" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>`;
}

const line = (d, o = 1, color = LINE, extra = '') =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-opacity="${r1(o)}" stroke-width="1" vector-effect="non-scaling-stroke" pathLength="1" class="art-line"${extra}/>`;

const circle = (cx, cy, r, o = 1, color = LINE) =>
  `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}" fill="none" stroke="${color}" stroke-opacity="${r1(o)}" stroke-width="1" vector-effect="non-scaling-stroke" pathLength="1" class="art-line"/>`;

function archPath(x, bottom, width, height) {
  const r = width / 2;
  const top = bottom - height;
  return `M${r1(x)} ${r1(bottom)} V${r1(top + r)} A${r1(r)} ${r1(r)} 0 0 1 ${r1(x + width)} ${r1(top + r)} V${r1(bottom)}`;
}

// ---------- 1. Архитектурные арки: анфилада с перспективой ----------
function arches(rand, o) {
  const n = o.count ?? 4 + Math.floor(rand() * 3);
  const cx = W * (o.cx ?? 0.5);
  const parts = [];
  for (let i = 0; i < n; i++) {
    const k = 1 - i / (n + 0.6);
    const w = 150 * k * (o.scale ?? 1);
    const h = 220 * k * (o.scale ?? 1) * (o.tall ?? 1);
    const bottom = 262 - i * (o.depth ?? 6);
    parts.push(line(archPath(cx - w / 2, bottom, w, h), 0.95 - i * 0.14));
  }
  for (let i = 0; i < (o.guides ?? 3); i++) {
    const x = r1(40 + (220 / ((o.guides ?? 3) - 1 || 1)) * i);
    parts.push(line(`M${x} 18 V282`, 0.22, LINE_SOFT));
  }
  parts.push(line('M24 262 H276', 0.5, LINE_SOFT));
  return { glow: [cx, 120, 150], parts };
}

// ---------- 2. Концентрические окружности ----------
function rings(rand, o) {
  const cx = W * (o.cx ?? 0.5 + (rand() - 0.5) * 0.15);
  const cy = H * (o.cy ?? 0.48);
  const n = o.count ?? 5 + Math.floor(rand() * 3);
  const step = o.step ?? 14 + rand() * 6;
  const parts = [];
  for (let i = 0; i < n; i++) parts.push(circle(cx, cy, 24 + i * step, 0.9 - i * 0.1));
  if (o.offset !== false) {
    const ox = cx + (rand() > 0.5 ? 1 : -1) * (40 + rand() * 30);
    parts.push(circle(ox, cy + 18, 54 + rand() * 20, 0.45, LINE_SOFT));
  }
  return { glow: [cx, cy, 130], parts };
}

// ---------- 3. Плавные волнообразные линии ----------
function waves(rand, o) {
  const n = o.count ?? 6 + Math.floor(rand() * 3);
  const amp = o.amp ?? 14 + rand() * 12;
  const top = o.top ?? 70;
  const gap = o.gap ?? 22;
  const parts = [];
  for (let i = 0; i < n; i++) {
    const y = top + i * gap;
    const phase = rand() * 40 + i * (o.shift ?? 9);
    const a = amp * (1 - i * 0.06);
    parts.push(line(`M10 ${r1(y)} C${r1(80 + phase)} ${r1(y - a)}, ${r1(150 + phase)} ${r1(y + a)}, 290 ${r1(y - a * 0.3)}`, 0.9 - i * 0.08));
  }
  return { glow: [W * 0.62, top + gap * 2, 140], parts };
}

// ---------- 4. Тонкие вертикальные структуры ----------
function verticals(rand, o) {
  const n = o.count ?? 11 + Math.floor(rand() * 6);
  const parts = [];
  const left = 34;
  const span = 232;
  for (let i = 0; i < n; i++) {
    const x = left + (span / (n - 1)) * i;
    const h = (o.flat ? 150 : 90 + rand() * 150) * (o.scale ?? 1);
    const bottom = o.hanging ? 30 + h : 262;
    const y1 = o.hanging ? 30 : 262 - h;
    parts.push(line(`M${r1(x)} ${r1(y1)} V${r1(bottom)}`, 0.25 + rand() * 0.65));
  }
  parts.push(line(o.hanging ? 'M24 30 H276' : 'M24 262 H276', 0.55, LINE_SOFT));
  if (o.sun) parts.push(circle(W * (0.3 + rand() * 0.4), 92, 26 + rand() * 10, 0.7));
  return { glow: [W * 0.5, 150, 150], parts };
}

// ---------- 5. Радиальные формы ----------
function radial(rand, o) {
  const cx = W * (o.cx ?? 0.5);
  const cy = H * (o.cy ?? 0.55);
  const n = o.count ?? 18 + Math.floor(rand() * 10);
  const inner = o.inner ?? 26;
  const parts = [circle(cx, cy, inner, 0.85)];
  const spread = o.spread ?? Math.PI * 2;
  const start = o.start ?? -Math.PI / 2 - spread / 2;
  for (let i = 0; i < n; i++) {
    const a = start + (spread / (spread >= Math.PI * 2 ? n : n - 1)) * i;
    const len = inner + 40 + rand() * (o.length ?? 70);
    parts.push(line(`M${r1(cx + Math.cos(a) * (inner + 8))} ${r1(cy + Math.sin(a) * (inner + 8))} L${r1(cx + Math.cos(a) * len)} ${r1(cy + Math.sin(a) * len)}`, 0.3 + rand() * 0.6));
  }
  return { glow: [cx, cy, 120], parts };
}

// ---------- 6. Мягкие пересекающиеся дуги ----------
function arcs(rand, o) {
  const n = o.count ?? 4 + Math.floor(rand() * 3);
  const parts = [];
  for (let i = 0; i < n; i++) {
    const r = 60 + rand() * 70;
    const cx = 60 + rand() * 180;
    const cy = (o.low ? 245 : 195) + rand() * 40;
    const a1 = Math.PI * (1.05 + rand() * 0.3);
    const a2 = Math.PI * (1.65 + rand() * 0.3);
    const x1 = cx + Math.cos(a1) * r;
    const y1 = cy + Math.sin(a1) * r;
    const x2 = cx + Math.cos(a2) * r;
    const y2 = cy + Math.sin(a2) * r;
    parts.push(line(`M${r1(x1)} ${r1(y1)} A${r1(r)} ${r1(r)} 0 0 1 ${r1(x2)} ${r1(y2)}`, 0.95 - i * 0.12));
  }
  if (o.dot !== false) parts.push(circle(W * (0.35 + rand() * 0.3), 96 + rand() * 30, 8 + rand() * 6, 0.8));
  return { glow: [W * 0.45, 150, 140], parts };
}

// ---------- 7. Геометрическая перспектива ----------
function perspective(rand, o) {
  const vx = W * (o.vx ?? 0.5 + (rand() - 0.5) * 0.3);
  const vy = H * (o.vy ?? 0.42);
  const parts = [line(`M14 ${r1(vy)} H286`, 0.55, LINE_SOFT)];
  const n = o.count ?? 9;
  for (let i = 0; i < n; i++) {
    const x = -40 + (380 / (n - 1)) * i;
    parts.push(line(`M${r1(vx)} ${r1(vy)} L${r1(x)} 290`, 0.2 + (1 - Math.abs(i - (n - 1) / 2) / n) * 0.6));
  }
  for (let j = 1; j <= (o.floors ?? 4); j++) {
    const y = vy + (290 - vy) * Math.pow(j / (o.floors ?? 4), 1.6);
    parts.push(line(`M14 ${r1(y)} H286`, 0.18 + j * 0.08, LINE_SOFT));
  }
  if (o.frame) {
    const fw = 70 + rand() * 30;
    parts.push(line(archPath(vx - fw / 2, vy + 4, fw, 120), 0.85));
  }
  return { glow: [vx, vy, 150], parts };
}

export const FAMILIES = { arches, rings, waves, verticals, radial, arcs, perspective };

export const FAMILY_LABELS = {
  arches: 'Архитектурные арки',
  rings: 'Концентрические окружности',
  waves: 'Плавные волны',
  verticals: 'Вертикальные структуры',
  radial: 'Радиальные формы',
  arcs: 'Пересекающиеся дуги',
  perspective: 'Геометрическая перспектива',
};

/**
 * Рисует композицию. family — ключ из FAMILIES, key — строка для детерминированных вариаций,
 * options — пропорции и расположение. Возвращает строку <svg>.
 */
export function composition(family, key, options = {}) {
  const rand = seeded(`${family}:${key}`);
  const art = FAMILIES[family](rand, options);
  const id = `ps-glow-${++uidCounter}`;
  const [gx, gy, gr] = art.glow;
  return `<svg class="art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
    <defs>${glow(id, r1(gx), r1(gy), gr)}${glow(`${id}b`, r1(W - gx * 0.6), r1(H - gy * 0.5), gr * 0.7, GLOW_2)}</defs>
    <rect width="${W}" height="${H}" fill="url(#${id}b)" class="art-glow"/>
    <rect width="${W}" height="${H}" fill="url(#${id})" class="art-glow"/>
    <g class="art-lines">${art.parts.join('')}</g>
  </svg>`;
}

// Визуальная карта 40 образов: семейство и пропорции подобраны по характеру образа.
// Это оформление интерфейса, а не данные каталога.
const MOOD_ART = {
  // мужские
  'm-expensive-clean': ['verticals', { flat: true, count: 13 }],
  'm-night-city': ['arches', { count: 5, depth: 10, guides: 4 }],
  'm-warm-vanilla': ['rings', { count: 6, step: 15 }],
  'm-modern-minimal': ['verticals', { count: 9, scale: 0.9 }],
  'm-coffee-books': ['arcs', { count: 4, low: true }],
  'm-sea-morning': ['waves', { count: 7, amp: 10, top: 120 }],
  'm-autumn-park': ['arcs', { count: 6 }],
  'm-bar-midnight': ['rings', { count: 4, step: 22, cy: 0.62 }],
  'm-dark-suit': ['verticals', { count: 17, hanging: true }],
  'm-hot-air': ['radial', { spread: Math.PI, start: Math.PI, cy: 0.78, length: 110 }],
  'm-young-luxury': ['perspective', { frame: true, floors: 3 }],
  'm-fruity-fresh': ['rings', { count: 4, step: 12, cx: 0.4, cy: 0.44 }],
  'm-evening-trail': ['waves', { count: 9, amp: 28, gap: 16, top: 80, shift: 14 }],
  'm-cold-elegance': ['arches', { count: 3, tall: 1.15, guides: 2 }],
  'm-after-rain': ['verticals', { count: 21, hanging: true, scale: 0.8 }],
  'm-clean-linen': ['waves', { count: 5, amp: 8, gap: 28, top: 90 }],
  'm-green-tea': ['rings', { count: 5, step: 10, offset: false, cy: 0.55 }],
  'm-fireplace': ['radial', { count: 26, length: 50, inner: 34, cy: 0.6 }],
  'm-skin-scent': ['arcs', { count: 3, dot: false }],
  'm-sport-fresh': ['perspective', { vx: 0.72, vy: 0.36, count: 11 }],
  // женские
  'f-tender-luxury': ['arches', { count: 4, depth: 4, guides: 0, scale: 1.05 }],
  'f-floral-morning': ['radial', { count: 14, length: 40, inner: 30, cy: 0.5 }],
  'f-silk-cream': ['rings', { count: 5, step: 18, cy: 0.5 }],
  'f-white-shirt': ['verticals', { count: 9, flat: true }],
  'f-vanilla-tender': ['rings', { count: 7, step: 12, cx: 0.55 }],
  'f-after-shower': ['waves', { count: 6, amp: 9, gap: 24, top: 96 }],
  'f-berry-dessert': ['rings', { count: 3, step: 16, cx: 0.38, cy: 0.58 }],
  'f-candle-evening': ['arches', { count: 3, tall: 0.9, guides: 1, depth: 12 }],
  'f-garden-rain': ['verticals', { count: 15, hanging: true, scale: 0.7 }],
  'f-summer-vacation': ['waves', { count: 6, amp: 18, gap: 20, top: 140 }],
  'f-modern-powder': ['arcs', { count: 5 }],
  'f-tea-garden': ['arcs', { count: 4, low: true }],
  'f-citrus-light': ['radial', { count: 22, length: 60, inner: 22, cy: 0.48 }],
  'f-dark-rose': ['rings', { count: 6, step: 9, cy: 0.5, offset: false }],
  'f-calm-confidence': ['perspective', { frame: true, vx: 0.5, floors: 3 }],
  'f-sunwarmed-skin': ['radial', { spread: Math.PI * 0.9, start: Math.PI * 1.05, cy: 0.82, length: 90 }],
  'f-cashmere-coat': ['waves', { count: 8, amp: 22, gap: 15, top: 90, shift: 4 }],
  'f-quiet-beauty': ['arcs', { count: 3, dot: true }],
  'f-bold-femininity': ['arches', { count: 5, depth: 8, cx: 0.55 }],
  'f-warm-memory': ['rings', { count: 5, step: 20, cx: 0.6, cy: 0.56 }],
};

export function moodArt(moodId) {
  const [family, options] = MOOD_ART[moodId] ?? ['arcs', {}];
  return composition(family, moodId, options);
}

export function moodFamily(moodId) {
  return (MOOD_ART[moodId] ?? ['arcs'])[0];
}
