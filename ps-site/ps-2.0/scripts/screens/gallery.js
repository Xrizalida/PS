// Галерея ароматов — самостоятельный путь: поиск, фильтры, сортировка, карточки или список. Пол и анкета не нужны.

import { esc, icons, plural } from '../core/dom.js';
import { STOPS } from '../core/format.js';
import {
  CHARACTERS, PROJECTIONS, OCCASIONS, GENDERS, BUDGETS, LEVEL_DIMS, LEVELS, SORTS,
  defaultFilters, filterGallery, activeCount, searchIndex, eligiblePerfumes,
} from '../core/gallery.js';
import { perfumeCard, perfumeRow, handleAct } from '../ui/perfume.js';
import { slot } from '../ui/slot.js';

const label = (o, lang) => (lang === 'expert' && o.expert) || o.plain;
const narrow = () => window.matchMedia('(max-width: 719px)').matches;

export function render(ctx) {
  const g = ctx.display.media.gallery;
  const banner = g?.src ? `<div class="gbanner">${slot({ tone: 'cocoa', motif: 'frame', src: g.src, srcset: g.srcset, alt: g.alt, focus: g.focus, sizes: '(min-width: 1180px) 1180px, 100vw', priority: true })}</div>` : '';
  return `
  <section class="screen gallery">
    <div class="wrap">
      <button type="button" class="back" data-act="back">${icons.back} К началу</button>
      <div class="head">
        <p class="eyebrow">100 проверенных ароматов</p>
        <h1 class="display h2">Галерея ароматов</h1>
        <p class="lead">Найди то, что подходит именно тебе. Поиск, фильтры и подробные описания — без анкеты.</p>
      </div>
      ${banner}
      <div class="search gsearch">
        <input type="search" data-slot="q" placeholder="Бренд или название" aria-label="Поиск по бренду, названию и линейке" autocomplete="off" enterkeyhint="search">
      </div>
      <div class="gfilters" data-slot="quick"></div>
      <button type="button" class="btn btn--ghost btn--sm gmore-toggle" data-act="more" aria-expanded="false" aria-controls="gmore">Больше фильтров</button>
      <div class="gmore" id="gmore" data-slot="more" hidden></div>
      <div class="gactive" data-slot="active"></div>
      <div class="gbar" data-slot="bar"></div>
      <div data-slot="list" aria-live="polite"></div>
      <div class="deeper gcta">
        <p class="eyebrow">Персональный подбор</p>
        <p class="display h3">Не знаешь, что выбрать? Попробуй подбор PS</p>
        <p class="muted small">Выбери образы или ответь на несколько простых вопросов — PS предложит короткий список с объяснением.</p>
        <div class="deeper__actions"><button type="button" class="btn btn--ghost" data-act="to-selection">К подбору ${icons.arrow}</button></div>
      </div>
    </div>
  </section>`;
}

export function mount(root, ctx) {
  const { data, display } = ctx;
  const cfg = display.gallery;
  const lang = ctx.store.get().lang;
  const perfumes = eligiblePerfumes(data);
  const fctx = { index: searchIndex(perfumes, cfg.brandAliases), config: data.config, popularity: display.popularity.perfumes };
  const brands = [...new Set(perfumes.map((p) => p.brand))].sort((a, b) => a.localeCompare(b, 'ru'));
  const families = data.dimensions.families.filter((fam) => perfumes.some((p) => p.family === fam.id));
  const seasons = data.dimensions.seasons;
  let shown = cfg.pageSize;

  const get = () => ({ ...defaultFilters(cfg), ...(ctx.store.get().gallery ?? {}) });
  const view = () => ctx.store.get().galleryView ?? (narrow() ? 'list' : 'cards');
  const set = (patch) => {
    ctx.store.update((s) => ({ ...s, gallery: { ...get(), ...patch } }));
    shown = cfg.pageSize;
    paint();
  };

  const slots = Object.fromEntries(['q', 'quick', 'more', 'active', 'bar', 'list'].map((k) => [k, root.querySelector(`[data-slot="${k}"]`)]));
  slots.q.value = get().q;

  const chip = (key, id, text, on) => `<button type="button" class="chip" data-f="${key}" data-id="${id}" aria-pressed="${on}">${esc(text)}</button>`;
  const row = (title, inner, note = '') => `<div class="frow"><p class="frow__label">${title}</p><div class="chips chips--scroll">${inner}</div>${note ? `<p class="frow__note">${note}</p>` : ''}</div>`;

  const paintQuick = (f) => {
    slots.quick.innerHTML = [
      row('Пол', GENDERS.map((g) => chip('gender', g.id, g.plain, f.gender === g.id)).join('')),
      row('Бюджет', BUDGETS.map((b) => chip('budget', b.id, b.plain, f.budget === b.id)).join(''), 'Сегменты предварительные: точные цены ещё не подтверждены.'),
      row('Характер запаха', CHARACTERS.map((c) => chip('character', c.id, label(c, lang), f.character.includes(c.id))).join('')),
      row('Заметность', PROJECTIONS.map((x) => chip('projection', x.id, label(x, lang), f.projection === x.id)).join('')),
      row('Когда носить', OCCASIONS.map((o) => chip('occasion', o.id, o.plain, f.occasion.includes(o.id))).join('')),
    ].join('');
  };

  const paintMore = (f) => {
    const levelRow = (d) => `<div class="frow"><p class="frow__label">${esc(label(d, lang))}</p><div class="seg seg--full" role="group" aria-label="${esc(d.plain)}">
      <button type="button" class="seg__btn" data-f="level" data-dim="${d.id}" data-id="" aria-pressed="${!f.levels[d.id]}">Любая</button>
      ${LEVELS.map((L) => `<button type="button" class="seg__btn" data-f="level" data-dim="${d.id}" data-id="${L.id}" aria-pressed="${f.levels[d.id] === L.id}">${esc(label(L, lang))}</button>`).join('')}
    </div></div>`;
    slots.more.innerHTML = `
      <div class="frow"><label class="frow__label" for="gbrand">Бренд</label>
        <select id="gbrand" class="gselect" data-f="brand"><option value="">Все бренды</option>${brands.map((b) => `<option value="${esc(b)}" ${f.brand === b ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></div>
      ${row('Сезон', seasons.map((x) => chip('seasons', x.id, x.label, f.seasons.includes(x.id))).join(''))}
      ${row(lang === 'expert' ? 'Парфюмерное семейство' : 'Направление', families.map((x) => chip('families', x.id, x.label, f.families.includes(x.id))).join(''))}
      ${LEVEL_DIMS.map(levelRow).join('')}
      ${row(lang === 'expert' ? 'Исключить ноты и аккорды' : 'Что точно не нравится', STOPS.map((x) => chip('avoid', x.id, x[lang] ?? x.plain, f.avoid.includes(x.id))).join(''))}`;
  };

  // Включённые фильтры одной строкой: каждый можно снять отдельно.
  const paintActive = (f) => {
    const items = [];
    const add = (key, id, text) => items.push(`<button type="button" class="chip" aria-pressed="true" data-f="${key}" data-id="${id}" aria-label="Снять фильтр: ${esc(text)}">${esc(text)} <span class="chip__x" aria-hidden="true">×</span></button>`);
    if (f.gender !== 'all') add('gender', 'all', GENDERS.find((g) => g.id === f.gender).plain);
    if (f.budget !== 'any') add('budget', 'any', BUDGETS.find((b) => b.id === f.budget).plain);
    f.character.forEach((id) => add('character', id, label(CHARACTERS.find((c) => c.id === id), lang)));
    if (f.projection) add('projection', f.projection, label(PROJECTIONS.find((x) => x.id === f.projection), lang));
    f.occasion.forEach((id) => add('occasion', id, OCCASIONS.find((o) => o.id === id).plain));
    if (f.brand) add('brand-off', '', f.brand);
    f.seasons.forEach((id) => add('seasons', id, seasons.find((x) => x.id === id).label));
    f.families.forEach((id) => add('families', id, families.find((x) => x.id === id)?.label ?? id));
    Object.entries(f.levels).forEach(([dim, lv]) => items.push(`<button type="button" class="chip" aria-pressed="true" data-f="level" data-dim="${dim}" data-id="">${esc(LEVEL_DIMS.find((d) => d.id === dim).plain)}: ${esc(LEVELS.find((L) => L.id === lv).plain.toLowerCase())} <span class="chip__x" aria-hidden="true">×</span></button>`));
    f.avoid.forEach((id) => add('avoid', id, `без: ${(STOPS.find((x) => x.id === id)?.[lang] ?? id).toLowerCase()}`));
    slots.active.innerHTML = items.length ? `<div class="chips">${items.join('')}<button type="button" class="btn btn--text" data-act="reset">Сбросить всё</button></div>` : '';
  };

  const paintList = (f) => {
    const found = filterGallery(data, f, fctx);
    const n = found.length;
    const sortOpts = SORTS.map((x) => `<option value="${x.id}" ${f.sort === x.id ? 'selected' : ''}>${esc(x.plain)}${x.id === 'popular' && !cfg.popularityApproved ? ' (предварительно)' : ''}</option>`).join('');
    slots.bar.innerHTML = `
      <p class="gcount"><b>${n}</b> ${plural(n, ['аромат', 'аромата', 'ароматов'])}</p>
      <label class="sr-only" for="gsort">Сортировка</label>
      <select id="gsort" class="gselect gselect--sm" data-f="sort">${sortOpts}</select>
      <div class="seg" role="group" aria-label="Вид">
        <button type="button" class="seg__btn" data-act="view" data-view="cards" aria-pressed="${view() === 'cards'}">Карточки</button>
        <button type="button" class="seg__btn" data-act="view" data-view="list" aria-pressed="${view() === 'list'}">Список</button>
      </div>`;
    if (!n) {
      slots.list.innerHTML = `
        <div class="empty">
          <p class="display h3">Ничего не нашлось</p>
          <p class="lead">${f.q ? `По запросу «${esc(f.q)}» ` : ''}${activeCount(f) ? `${f.q ? 'и выбранным фильтрам ' : 'Под все выбранные фильтры сразу '}не подходит ни один аромат.` : 'в каталоге PS ничего нет. Проверь написание или попробуй название бренда.'}</p>
          <div class="chips">
            ${f.q ? '<button type="button" class="chip" data-act="clear-q">Очистить поиск</button>' : ''}
            ${activeCount(f) ? '<button type="button" class="chip" data-act="reset">Сбросить фильтры</button>' : ''}
          </div>
        </div>`;
      return;
    }
    const items = found.slice(0, shown).map((p) => ({ id: p.id, perfume: p, label: data.dimensions.families.find((x) => x.id === p.family)?.label ?? '', isDiscovery: false }));
    const body = view() === 'list'
      ? `<ul class="plist">${items.map((it, i) => perfumeRow(it, i, ctx, { save: true })).join('')}</ul>`
      : `<div class="pgrid">${items.map((it, i) => perfumeCard(it, i, ctx, { tag: false })).join('')}</div>`;
    const more = n > shown ? `<div class="gmore-list"><button type="button" class="btn btn--ghost" data-act="page">Показать ещё · ${n - shown}</button></div>` : '';
    slots.list.innerHTML = body + more;
  };

  // Кнопки фильтров рисуются один раз, дальше меняется только их состояние —
  // так горизонтальная прокрутка строк с чипсами на телефоне не сбрасывается после нажатия.
  const isOn = (f, el) => {
    const { f: key, id, dim } = el.dataset;
    if (key === 'level') return (f.levels[dim] ?? '') === id;
    if (Array.isArray(f[key])) return f[key].includes(id);
    return f[key] === id;
  };
  const sync = (box, f) => box.querySelectorAll('[data-f][data-id]').forEach((el) => el.setAttribute('aria-pressed', String(isOn(f, el))));
  let moreDrawn = false;

  function paint({ list = true } = {}) {
    const f = get();
    if (!slots.quick.firstChild) paintQuick(f); else sync(slots.quick, f);
    if (!slots.more.hidden) {
      if (!moreDrawn) { paintMore(f); moreDrawn = true; } else sync(slots.more, f);
      const sel = slots.more.querySelector('#gbrand');
      if (sel) sel.value = f.brand;
    }
    paintActive(f);
    if (list) paintList(f);
    root.querySelector('[data-act="more"]').textContent = slots.more.hidden ? `Больше фильтров${moreCount(f) ? ` · ${moreCount(f)}` : ''}` : 'Скрыть фильтры';
  }
  const moreCount = (f) => Boolean(f.brand) + f.seasons.length + f.families.length + Object.keys(f.levels).length + f.avoid.length;

  const toggleIn = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const onClick = (e) => {
    const el = e.target.closest('[data-f], [data-act]');
    if (!el || el.tagName === 'SELECT') return;
    const f = get();
    const { id } = el.dataset;
    switch (el.dataset.f) {
      case 'gender': return set({ gender: f.gender === id ? 'all' : id });
      case 'budget': return set({ budget: f.budget === id ? 'any' : id });
      case 'projection': return set({ projection: f.projection === id ? null : id });
      case 'character': case 'occasion': case 'seasons': case 'families': case 'avoid':
        return set({ [el.dataset.f]: toggleIn(f[el.dataset.f], id) });
      case 'level': {
        const levels = { ...f.levels };
        if (id) levels[el.dataset.dim] = id; else delete levels[el.dataset.dim];
        return set({ levels });
      }
      case 'brand-off': return set({ brand: '' });
      default: break;
    }
    const act = el.dataset.act;
    if (act === 'back') return ctx.nav('', { focus: 'choose' });
    if (act === 'more') {
      slots.more.hidden = !slots.more.hidden;
      el.setAttribute('aria-expanded', String(!slots.more.hidden));
      return paint({ list: false });
    }
    if (act === 'reset') return set({ ...defaultFilters(cfg), q: f.q, sort: f.sort });
    if (act === 'clear-q') { slots.q.value = ''; return set({ q: '' }); }
    if (act === 'view') {
      ctx.store.update((s) => ({ ...s, galleryView: el.dataset.view }));
      return paintList(get());
    }
    if (act === 'page') { shown += cfg.pageSize; return paintList(get()); }
    if (act === 'to-selection') return ctx.nav(ctx.store.get().gender ? 'method' : '', { focus: 'choose' });
    if (['open', 'save', 'compare'].includes(act)) {
      handleAct(act, el.dataset.id, ctx);
      if (act !== 'open') {
        slots.list.classList.add('no-anim');
        paintList(get());
      }
    }
  };
  const onChange = (e) => {
    if (e.target.dataset.f === 'brand') set({ brand: e.target.value });
    if (e.target.dataset.f === 'sort') set({ sort: e.target.value });
  };
  // Поиск обновляет только список: поле ввода не перерисовывается, клавиатура телефона не прыгает.
  let t = null;
  const onInput = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      ctx.store.update((s) => ({ ...s, gallery: { ...get(), q: slots.q.value } }));
      shown = cfg.pageSize;
      slots.list.classList.remove('no-anim');
      paintList(get());
      paintActive(get());
    }, 120);
  };

  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  slots.q.addEventListener('input', onInput);
  slots.q.addEventListener('keydown', (e) => { if (e.key === 'Enter') slots.q.blur(); });
  paint();
  return () => {
    clearTimeout(t);
    root.removeEventListener('click', onClick);
    root.removeEventListener('change', onChange);
  };
}
