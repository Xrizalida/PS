// Аромат в PS 2.0: карточка, строка списка, подробности, сохранённое и сравнение.

import { esc, icons, toast } from '../core/dom.js';
import { typeLabel, segmentLine, segmentShort, PRICE_NOTE, whenLine, presenceWords, perfumeTone, perfumeMotif } from '../core/format.js';
import { slot } from './slot.js';
import { openSheet, closeSheet } from './sheet.js';

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const MAX_COMPARE = 3;

const textOf = (p, ctx, key) => ctx.display.perfumes[p.id]?.[key] ?? '';
const shortOf = (p, ctx) => textOf(p, ctx, 'short');
const plainOf = (p, ctx) => textOf(p, ctx, 'plain');
const bottle = (p, ratio) => slot({ tone: perfumeTone(p), motif: perfumeMotif(p), ratio });

// ---------- Карточка и строка ----------

// opts.tag = false — без номера (в галерее порядок не означает близость к запросу).
export function perfumeCard(item, i, ctx, opts = {}) {
  const p = item.perfume;
  const s = ctx.store.get();
  const saved = s.saved.includes(p.id);
  const inCmp = s.compare.includes(p.id);
  const tag = item.isDiscovery
    ? '<span class="pcard__tag pcard__tag--disc">Открытие PS</span>'
    : opts.tag === false ? '' : `<span class="pcard__tag">${String(i + 1).padStart(2, '0')}</span>`;
  return `
  <article class="pcard" style="--i:${Math.min(i, 12)}">
    <button type="button" class="pcard__media" data-act="open" data-id="${p.id}" aria-label="Подробнее: ${esc(p.brand)} ${esc(p.name)}">
      ${bottle(p)}
      ${tag}
    </button>
    <div class="pcard__body">
      ${item.label ? `<p class="pcard__label">${esc(item.label)}</p>` : ''}
      <p class="pcard__brand">${esc(p.brand)}</p>
      <h3 class="pcard__name">${esc(p.name)}</h3>
      <p class="pcard__type">${esc(typeLabel(p))}</p>
      <p class="pcard__short">${esc(shortOf(p, ctx))}</p>
      <p class="pcard__price">${esc(segmentShort(p))} <span>· цена уточняется</span></p>
      <div class="pcard__actions">
        <button type="button" class="icon-btn" data-act="save" data-id="${p.id}" aria-pressed="${saved}" aria-label="${saved ? 'Убрать из сохранённого' : 'Сохранить'}">${saved ? icons.heartFill : icons.heart}</button>
        <button type="button" class="btn btn--ghost btn--sm" data-act="compare" data-id="${p.id}" aria-pressed="${inCmp}">${inCmp ? 'В сравнении' : 'Сравнить'}</button>
        <button type="button" class="btn btn--primary btn--sm" data-act="open" data-id="${p.id}">Подробнее</button>
      </div>
    </div>
  </article>`;
}

// opts.save — кнопка «сохранить» прямо в строке (галерея).
export function perfumeRow(item, i, ctx, opts = {}) {
  const p = item.perfume;
  const saved = ctx.store.get().saved.includes(p.id);
  const save = opts.save
    ? `<button type="button" class="icon-btn prow__save" data-act="save" data-id="${p.id}" aria-pressed="${saved}" aria-label="${saved ? 'Убрать из сохранённого' : 'Сохранить'}: ${esc(p.name)}">${saved ? icons.heartFill : icons.heart}</button>`
    : '';
  return `
  <li class="prow${opts.save ? ' prow--save' : ''}" style="--i:${Math.min(i, 12)}">
    <button type="button" class="prow__btn" data-act="open" data-id="${p.id}">
      <span class="prow__title"><span class="prow__brand">${esc(p.brand)}</span><span class="prow__name">${esc(p.name)}</span></span>
      <span class="prow__short">${esc(shortOf(p, ctx))}</span>
      <span class="prow__meta">${item.isDiscovery ? '<span class="prow__disc">Открытие PS</span> · ' : ''}${esc(segmentShort(p))}</span>
      <span class="prow__go"><span class="sr-only">Подробнее</span>${icons.chevron}</span>
    </button>
    ${save}
  </li>`;
}

// ---------- Подробности ----------

function smellsBlock(p, ctx, lang) {
  const n = p.notes ?? {};
  const layers = n.single?.length
    ? [['Звучание', n.single]]
    : [['Начало', n.top], ['Сердце', n.heart], ['База', n.base]];
  if (lang === 'expert') {
    const rows = layers.filter(([, list]) => list?.length).map(([k, list]) => `<li><span class="steps__k">${k}</span><span class="steps__v"><span>${esc(list.map(cap).join(', '))}</span></span></li>`).join('');
    const facts = [`Интенсивность ${p.scales.intensity}/5`, `Шлейф ${p.scales.sillage}/5`, ctx.data.dimensions.families.find((f) => f.id === p.family)?.label].filter(Boolean);
    return `<p class="muted">${esc(p.texts.smells)}</p><ul class="steps">${rows}</ul><div class="facts">${facts.map((f) => `<span class="chip chip--static">${esc(f)}</span>`).join('')}</div>`;
  }
  const rows = layers
    .map(([k, list]) => [k, ctx.glossary.layer(list).slice(0, 2)])
    .filter(([, hits]) => hits.length)
    .map(([k, hits]) => `<li><span class="steps__k">${k}</span><span class="steps__v">${hits.map((h) => `<b>${esc(cap(h.note))}</b> <span>— ${esc(h.entry.plain)}</span>`).join('<br>')}</span></li>`)
    .join('');
  const detail = textOf(p, ctx, 'detail');
  return `${detail ? `<p>${esc(detail)}</p>` : ''}${rows ? `<ul class="steps">${rows}</ul><p class="small muted">Сравнения примерные: как звучит нота, зависит от всей композиции.</p>` : ''}`;
}

function detailHtml(p, item, ctx) {
  const lang = ctx.store.get().lang;
  const langSeg = `<div class="seg" role="group" aria-label="Язык описания">
      <button type="button" class="seg__btn" data-act="lang" data-lang="plain" aria-pressed="${lang === 'plain'}">Без терминов</button>
      <button type="button" class="seg__btn" data-act="lang" data-lang="expert" aria-pressed="${lang === 'expert'}">На языке нот</button>
    </div>`;
  const why = item?.why?.length ? `<section class="pd__sec"><p class="eyebrow">Почему подходит</p><ul class="why">${item.why.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></section>` : '';
  // «Учти»: в режиме «Просто» — короткая строка PS и предупреждения подбора; «Нотами» — полные риски из каталога.
  const softWarn = (item?.warnings ?? []).filter((w) => !(p.risks ?? []).some((r) => r.text === w));
  const warn = lang === 'expert'
    ? [...softWarn, ...(p.risks ?? []).map((r) => r.text)].slice(0, 4)
    : [...softWarn, textOf(p, ctx, 'risk')].filter(Boolean).slice(0, 3);
  const warnHtml = warn.length ? `<section class="pd__sec"><p class="eyebrow">Учти</p><ul class="why why--warn">${warn.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></section>` : '';
  const disc = item?.discovery ? `<p class="note note--box">${esc(item.discovery.unexpected)} ${esc(item.discovery.anyway)} ${esc(item.discovery.tryFirst)}</p>` : '';
  return `
  <article class="pd">
    <div class="pd__media">${bottle(p)}</div>
    <header class="pd__head">
      ${item ? `<p class="eyebrow accent-dot">${esc(item.isDiscovery ? 'Открытие PS' : item.label)}</p>` : ''}
      <p class="pcard__brand">${esc(p.brand)}</p>
      <h2 class="pd__name">${esc(p.name)}</h2>
      <p class="pcard__type">${esc(typeLabel(p))}${p.year ? ` · ${p.year}` : ''}</p>
      <p class="pd__atm">${esc(p.texts.atmosphere)}</p>
    </header>
    ${disc}
    <section class="pd__sec"><p class="eyebrow">Если говорить просто</p><p class="pd__plain">${esc(plainOf(p, ctx))}</p></section>
    <section class="pd__sec"><div class="pd__sec-head"><p class="eyebrow">Как он пахнет</p>${langSeg}</div>${smellsBlock(p, ctx, lang)}</section>
    <section class="pd__sec"><p class="eyebrow">Заметность</p><p>${lang === 'expert' ? `Интенсивность ${p.scales.intensity} из 5 · шлейф ${p.scales.sillage} из 5` : esc(presenceWords(p))}</p></section>
    <section class="pd__sec"><p class="eyebrow">Когда носить</p><p>${esc(p.texts.whenToWear)}</p><p class="small muted">${esc(whenLine(p, ctx.data.dimensions))}</p></section>
    ${why}
    ${warnHtml}
    <section class="pd__sec"><p class="eyebrow">Цена</p><p>${esc(segmentLine(p))}</p><p class="small muted">${esc(PRICE_NOTE)}</p></section>
  </article>`;
}

function detailFoot(p, ctx) {
  const s = ctx.store.get();
  const saved = s.saved.includes(p.id);
  const inCmp = s.compare.includes(p.id);
  return `
    <button type="button" class="btn btn--ghost btn--sm" data-act="save" data-id="${p.id}" aria-pressed="${saved}">${saved ? icons.heartFill : icons.heart}<span>${saved ? 'Сохранено' : 'Сохранить'}</span></button>
    <button type="button" class="btn btn--ghost btn--sm" data-act="compare" data-id="${p.id}" aria-pressed="${inCmp}">${inCmp ? 'В сравнении' : 'Сравнить'}</button>
    <button type="button" class="btn btn--ghost btn--sm" disabled title="Скоро">Где купить · скоро</button>`;
}

export function openPerfume(id, ctx, item = null) {
  const p = ctx.data.byId.get(id);
  if (!p) return;
  openSheet({
    title: `${p.brand} ${p.name}`,
    html: detailHtml(p, item, ctx),
    foot: detailFoot(p, ctx),
    onMount: (panel) => {
      const refresh = () => {
        panel.querySelector('.sheet__body').innerHTML = detailHtml(p, item, ctx);
        panel.querySelector('.sheet__foot').innerHTML = detailFoot(p, ctx);
      };
      panel.addEventListener('click', (e) => {
        const el = e.target.closest('[data-act]');
        if (!el) return;
        if (el.dataset.act === 'lang') ctx.setLang(el.dataset.lang);
        else handleAct(el.dataset.act, el.dataset.id, ctx);
        refresh();
      });
    },
  });
}

// ---------- Сохранить / сравнить ----------

export function handleAct(act, id, ctx, item = null) {
  const { store } = ctx;
  if (act === 'open') return openPerfume(id, ctx, item);
  if (act === 'save') {
    const on = store.get().saved.includes(id);
    store.update((s) => ({ ...s, saved: on ? s.saved.filter((x) => x !== id) : [...s.saved, id] }));
    toast(on ? 'Убрано из сохранённого' : 'Сохранено — список под сердечком в шапке');
  }
  if (act === 'compare') {
    const list = store.get().compare;
    if (list.includes(id)) store.update((s) => ({ ...s, compare: s.compare.filter((x) => x !== id) }));
    else if (list.length >= MAX_COMPARE) toast('Сравнивать можно до трёх ароматов');
    else {
      store.update((s) => ({ ...s, compare: [...s.compare, id] }));
      if (list.length === 0) toast('Добавь ещё один аромат, чтобы сравнить');
    }
  }
}

const BARS = [['sweet', 'Сладость'], ['fresh', 'Свежесть'], ['woody', 'Дерево'], ['floral', 'Цветы'], ['powdery', 'Пудра'], ['spicy', 'Пряность'], ['musky', 'Мускус'], ['smoky', 'Дым'], ['intensity', 'Громкость'], ['sillage', 'Шлейф']];

export function openCompare(ctx) {
  const ids = ctx.store.get().compare;
  const ps = ids.map((id) => ctx.data.byId.get(id)).filter(Boolean);
  const expert = ctx.store.get().lang === 'expert';
  const col = (p) => `
    <div class="cmp__col">
      <p class="pcard__brand">${esc(p.brand)}</p>
      <h3 class="prow__name">${esc(p.name)}</h3>
      <p class="pcard__type">${esc(typeLabel(p))}</p>
      <p class="small">${esc(shortOf(p, ctx))}</p>
      <div>${BARS.map(([k, label]) => `<div class="bar"><span>${label}${expert ? ` ${p.scales[k]}` : ''}</span><i style="--v:${p.scales[k]}"></i></div>`).join('')}</div>
      <p class="small muted">${esc(whenLine(p, ctx.data.dimensions))}</p>
      <p class="small">${esc(segmentShort(p))}</p>
      <button type="button" class="btn btn--text" data-act="compare" data-id="${p.id}">Убрать из сравнения</button>
    </div>`;
  openSheet({
    title: 'Сравнение',
    wide: true,
    html: `<div class="head"><p class="eyebrow">Сравнение</p><h2 class="display h3">${ps.length ? 'Рядом — чтобы было видно разницу' : 'Пока пусто'}</h2></div>
      ${ps.length ? `<div class="cmp">${ps.map(col).join('')}</div><p class="note">${esc(PRICE_NOTE)}</p>` : '<p class="muted">Нажми «Сравнить» на карточке аромата.</p>'}`,
    onMount: (panel) => panel.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act="compare"]');
      if (!el) return;
      handleAct('compare', el.dataset.id, ctx);
      closeSheet(true);
      if (ctx.store.get().compare.length) openCompare(ctx);
    }),
  });
}

export function openSaved(ctx) {
  const ids = ctx.store.get().saved;
  const ps = ids.map((id) => ctx.data?.byId.get(id)).filter(Boolean);
  const html = `<div class="head"><p class="eyebrow">Сохранённое</p><h2 class="display h3">${ps.length ? 'Твои ароматы' : 'Пока пусто'}</h2></div>
    ${ps.length
      ? ps.map((p) => `<div class="srow"><button type="button" class="srow__open" data-act="open" data-id="${p.id}"><span class="prow__brand">${esc(p.brand)}</span><span class="prow__name">${esc(p.name)}</span><span class="small muted">${esc(shortOf(p, ctx))}</span></button><button type="button" class="icon-btn" data-act="save" data-id="${p.id}" aria-label="Убрать">${icons.close}</button></div>`).join('')
      : '<p class="muted">Нажми на сердечко на карточке аромата — он появится здесь. Список хранится только в этом браузере.</p>'}`;
  openSheet({
    title: 'Сохранённое',
    html,
    onMount: (panel) => panel.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]');
      if (!el) return;
      if (el.dataset.act === 'open') return openPerfume(el.dataset.id, ctx);
      handleAct('save', el.dataset.id, ctx);
      closeSheet(true);
      openSaved(ctx);
    }),
  });
}
