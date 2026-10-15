// Аромат в PS 2.0: карточка, строка списка, подробности, сохранённое и сравнение.

import { esc, icons, toast } from '../core/dom.js';
import { typeLabel, segmentLine, SEGMENTS, PRICE_NOTE, whenLine, perfumeTone, perfumeMotif } from '../core/format.js';
import { slot } from './slot.js';
import { openSheet, closeSheet } from './sheet.js';

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const MAX_COMPARE = 3;

const shortOf = (p, ctx) => ctx.display.perfumes[p.id]?.short ?? '';
const plainOf = (p, ctx) => ctx.display.perfumes[p.id]?.plain ?? '';
const bottle = (p, ratio) => slot({ tone: perfumeTone(p), motif: perfumeMotif(p), ratio });

// ---------- Карточка и строка ----------

export function perfumeCard(item, i, ctx) {
  const p = item.perfume;
  const s = ctx.store.get();
  const saved = s.saved.includes(p.id);
  const inCmp = s.compare.includes(p.id);
  return `
  <article class="pcard" style="--i:${i}">
    <button type="button" class="pcard__media" data-act="open" data-id="${p.id}" aria-label="Подробнее: ${esc(p.brand)} ${esc(p.name)}">
      ${bottle(p)}
      ${item.isDiscovery ? '<span class="pcard__tag pcard__tag--disc">Открытие PS</span>' : `<span class="pcard__tag">${String(i + 1).padStart(2, '0')}</span>`}
    </button>
    <div class="pcard__body">
      <p class="pcard__label">${esc(item.label)}</p>
      <p class="pcard__brand">${esc(p.brand)}</p>
      <h3 class="pcard__name">${esc(p.name)}</h3>
      <p class="pcard__type">${esc(typeLabel(p))}</p>
      <p class="pcard__short">${esc(shortOf(p, ctx))}</p>
      <p class="pcard__price">${esc(segmentLine(p))} <span>· ориентир</span></p>
      <div class="pcard__actions">
        <button type="button" class="icon-btn" data-act="save" data-id="${p.id}" aria-pressed="${saved}" aria-label="${saved ? 'Убрать из сохранённого' : 'Сохранить'}">${saved ? icons.heartFill : icons.heart}</button>
        <button type="button" class="btn btn--ghost btn--sm" data-act="compare" data-id="${p.id}" aria-pressed="${inCmp}">${inCmp ? 'В сравнении' : 'Сравнить'}</button>
        <button type="button" class="btn btn--primary btn--sm" data-act="open" data-id="${p.id}">Подробнее</button>
      </div>
    </div>
  </article>`;
}

export function perfumeRow(item, i, ctx) {
  const p = item.perfume;
  return `
  <li class="prow" style="--i:${i}">
    <button type="button" class="prow__btn" data-act="open" data-id="${p.id}">
      <span class="prow__title"><span class="prow__brand">${esc(p.brand)}</span><span class="prow__name">${esc(p.name)}</span></span>
      <span class="prow__short">${esc(shortOf(p, ctx))}</span>
      <span class="prow__meta">${item.isDiscovery ? '<span class="prow__disc">Открытие PS</span> · ' : ''}${esc(SEGMENTS[p.segment]?.label ?? '')} · ${esc(SEGMENTS[p.segment]?.range ?? '')}</span>
      <span class="prow__go" aria-hidden="true">${icons.chevron}</span>
    </button>
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
  return rows ? `<ul class="steps">${rows}</ul>` : `<p class="muted">${esc(p.texts.smells)}</p>`;
}

function detailHtml(p, item, ctx) {
  const lang = ctx.store.get().lang;
  const langSeg = `<div class="seg" role="group" aria-label="Язык описания">
      <button type="button" class="seg__btn" data-act="lang" data-lang="plain" aria-pressed="${lang === 'plain'}">Просто</button>
      <button type="button" class="seg__btn" data-act="lang" data-lang="expert" aria-pressed="${lang === 'expert'}">Нотами</button>
    </div>`;
  const why = item?.why?.length ? `<section class="pd__sec"><p class="eyebrow">Почему подходит</p><ul class="why">${item.why.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></section>` : '';
  const warn = (item?.warnings ?? p.risks?.map((r) => r.text) ?? []).slice(0, 2);
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
    <section class="pd__sec"><p class="eyebrow">Когда носить</p><p>${esc(p.texts.whenToWear)}</p><p class="small muted">${esc(whenLine(p, ctx.data.dimensions))}</p></section>
    ${why}
    ${warnHtml}
    <section class="pd__sec"><p class="eyebrow">Ценовой ориентир</p><p>${esc(segmentLine(p))}</p><p class="small muted">${esc(PRICE_NOTE)}</p></section>
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
      <p class="small">${esc(segmentLine(p))}</p>
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
