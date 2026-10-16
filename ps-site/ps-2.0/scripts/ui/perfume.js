// Аромат в PS 2.0: карточка, строка списка, подробности, сохранённое и сравнение.
// Один язык — простые слова. Ноты остаются в каталоге для подбора, человеку показываем редакционные тексты.
// Порядок карточек — как рассчитал алгоритм, но номера не показываем: это не жёсткий рейтинг.

import { esc, icons, toast } from '../core/dom.js';
import { typeLabel, segmentLine, presenceWords, perfumeTone, perfumeMotif, perfumeTexts } from '../core/format.js';
import { slot } from './slot.js';
import { openSheet, closeSheet } from './sheet.js';

const MAX_COMPARE = 3;

const textsOf = (p, ctx) => perfumeTexts(ctx.display, p.id);
const shortOf = (p, ctx) => textsOf(p, ctx).short;
const bottle = (p, ratio) => slot({ tone: perfumeTone(p), motif: perfumeMotif(p), ratio });
// Главная причина, почему аромат подходит, — одной строкой.
const reasonOf = (item) => item?.why?.[0] ?? '';

// ---------- Карточка и строка ----------

export function perfumeCard(item, i, ctx) {
  const p = item.perfume;
  const s = ctx.store.get();
  const saved = s.saved.includes(p.id);
  const inCmp = s.compare.includes(p.id);
  const why = reasonOf(item);
  return `
  <article class="pcard" style="--i:${Math.min(i, 12)}">
    <button type="button" class="pcard__media" data-act="open" data-id="${p.id}" aria-label="Подробнее: ${esc(p.brand)} ${esc(p.name)}">
      ${bottle(p)}
      ${item.isDiscovery ? '<span class="pcard__tag pcard__tag--disc">Открытие PS</span>' : ''}
    </button>
    <div class="pcard__body">
      <p class="pcard__brand">${esc(p.brand)}</p>
      <h3 class="pcard__name">${esc(p.name)}</h3>
      <p class="pcard__short">${esc(shortOf(p, ctx))}</p>
      ${why ? `<p class="pcard__why">${esc(why)}</p>` : ''}
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
  const why = reasonOf(item);
  return `
  <li class="prow" style="--i:${Math.min(i, 12)}">
    <button type="button" class="prow__btn" data-act="open" data-id="${p.id}">
      <span class="prow__title"><span class="prow__brand">${esc(p.brand)}</span><span class="prow__name">${esc(p.name)}</span></span>
      <span class="prow__short">${esc(shortOf(p, ctx))}</span>
      ${item.isDiscovery || why ? `<span class="prow__meta">${item.isDiscovery ? '<span class="prow__disc">Открытие PS</span> · ' : ''}${esc(why)}</span>` : ''}
      <span class="prow__go"><span class="sr-only">Подробнее</span>${icons.chevron}</span>
    </button>
  </li>`;
}

// ---------- Подробности ----------

// Порядок: как пахнет → ощущение → почему подходит → учти → коротко о практичном.
// Пирамида нот не выводится: ноты остаются в каталоге для подбора.
function detailHtml(p, item, ctx) {
  const t = textsOf(p, ctx);
  const why = item?.why?.length ? `<section class="pd__sec"><p class="eyebrow">Почему подходит</p><ul class="why">${item.why.slice(0, 3).map((w) => `<li>${esc(w)}</li>`).join('')}</ul></section>` : '';
  // «Учти»: предупреждение подбора (если человек отметил «лучше без») и редакционный риск PS — не больше двух строк.
  const softWarn = (item?.warnings ?? []).filter((w) => !(p.risks ?? []).some((r) => r.text === w));
  const warn = [...softWarn, t.risk].filter(Boolean).slice(0, 2);
  const warnHtml = warn.length ? `<section class="pd__warn"><p class="eyebrow">Учти</p>${warn.map((w) => `<p>${esc(w)}</p>`).join('')}</section>` : '';
  const disc = item?.discovery ? `<p class="note note--box">${esc(item.discovery.unexpected)} ${esc(item.discovery.tryFirst)}</p>` : '';
  const facts = [['Заметность', presenceWords(p)], ['Когда носить', p.texts?.whenToWear], ['Цена', segmentLine(p)]].filter(([, v]) => v);
  return `
  <article class="pd">
    <div class="pd__media">${bottle(p)}</div>
    <header class="pd__head">
      ${item ? `<p class="eyebrow accent-dot">${esc(item.isDiscovery ? 'Открытие PS' : item.label)}</p>` : ''}
      <p class="pcard__brand">${esc(p.brand)}</p>
      <h2 class="pd__name">${esc(p.name)}</h2>
      <p class="pcard__type">${esc(typeLabel(p))}</p>
    </header>
    ${disc}
    ${t.smell ? `<section class="pd__sec"><p class="eyebrow">Как пахнет</p><p>${esc(t.smell)}</p></section>` : ''}
    ${t.feeling ? `<section class="pd__feel"><p class="eyebrow">Ощущение</p><p>${esc(t.feeling)}</p></section>` : ''}
    ${why}
    ${warnHtml}
    <dl class="pd__facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
  </article>`;
}

function detailFoot(p, ctx) {
  const s = ctx.store.get();
  const saved = s.saved.includes(p.id);
  const inCmp = s.compare.includes(p.id);
  return `
    <button type="button" class="btn btn--ghost btn--sm" data-act="save" data-id="${p.id}" aria-pressed="${saved}">${saved ? icons.heartFill : icons.heart}<span>${saved ? 'Сохранено' : 'Сохранить'}</span></button>
    <button type="button" class="btn btn--ghost btn--sm" data-act="compare" data-id="${p.id}" aria-pressed="${inCmp}">${inCmp ? 'В сравнении' : 'Сравнить'}</button>`;
}

export function openPerfume(id, ctx, item = null) {
  const p = ctx.data.byId.get(id);
  if (!p) return;
  openSheet({
    title: `${p.brand} ${p.name}`,
    html: detailHtml(p, item, ctx),
    foot: detailFoot(p, ctx),
    onMount: (panel) => {
      panel.addEventListener('click', (e) => {
        const el = e.target.closest('[data-act]');
        if (!el) return;
        handleAct(el.dataset.act, el.dataset.id, ctx);
        panel.querySelector('.sheet__foot').innerHTML = detailFoot(p, ctx);
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
  const col = (p) => `
    <div class="cmp__col">
      <p class="pcard__brand">${esc(p.brand)}</p>
      <h3 class="prow__name">${esc(p.name)}</h3>
      <p class="small">${esc(shortOf(p, ctx))}</p>
      <div>${BARS.map(([k, label]) => `<div class="bar"><span>${label}</span><i style="--v:${p.scales[k]}"></i></div>`).join('')}</div>
      <button type="button" class="btn btn--text" data-act="compare" data-id="${p.id}">Убрать</button>
    </div>`;
  openSheet({
    title: 'Сравнение',
    wide: true,
    html: `<div class="head"><h2 class="display h3">${ps.length ? 'Сравнение' : 'Пока пусто'}</h2></div>
      ${ps.length ? `<div class="cmp">${ps.map(col).join('')}</div>` : '<p class="muted">Нажми «Сравнить» на карточке аромата.</p>'}`,
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
  const html = `<div class="head"><h2 class="display h3">${ps.length ? 'Сохранённое' : 'Пока пусто'}</h2></div>
    ${ps.length
      ? ps.map((p) => `<div class="srow"><button type="button" class="srow__open" data-act="open" data-id="${p.id}"><span class="prow__brand">${esc(p.brand)}</span><span class="prow__name">${esc(p.name)}</span><span class="small muted">${esc(shortOf(p, ctx))}</span></button><button type="button" class="icon-btn" data-act="save" data-id="${p.id}" aria-label="Убрать">${icons.close}</button></div>`).join('')
      : '<p class="muted">Нажми на сердечко на карточке аромата — он появится здесь.</p>'}`;
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

