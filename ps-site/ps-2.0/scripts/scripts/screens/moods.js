// Выбор образов: «Каталог» (2 в ряд на телефоне) и «По одной» (свайп). Состояние выбора общее.
// Для подбора нужно минимум 3 понравившихся образа, отметить можно до 7 — об ограничении говорим,
// только когда человек пытается отметить восьмой.

import { esc, icons, deckIcons, toast, reducedMotion } from '../core/dom.js';
import * as Sel from '../core/selection.js';
import { slot, preloadImages } from '../ui/slot.js';
import { openSheet, closeSheet } from '../ui/sheet.js';

const SWIPE_COMMIT = 100; // px
const FLY_MS = 300;
const FULL_MSG = 'Чтобы добавить этот образ, сними отметку с одного из выбранных';

const moodSlot = (m, opts = {}) => slot({ tone: m.tone, motif: m.motif, src: m.image?.src, srcset: m.image?.srcset, alt: m.image?.alt, focus: m.image?.focus, sizes: opts.sizes ?? '(min-width: 1040px) 25vw, (min-width: 720px) 33vw, 50vw', ...opts });

const needText = (n) => `Выбери ещё ${n === 1 ? 'один образ' : n === 2 ? 'два образа' : 'три образа'}`;

export function render(ctx) {
  const { moodGroup } = ctx.state;
  const moodView = ctx.state.moodView ?? 'catalog';
  const groups = ctx.display.moods.groups;
  return `
  <section class="screen">
    <div class="wrap">
      <button type="button" class="back" data-act="back">${icons.back} Назад</button>
      <div class="head">
        <h1 class="display h2">Что тебе ближе?</h1>
        <p class="lead">Отметь образы, которые откликаются.</p>
      </div>
      <div class="moods-top">
        <div class="seg" role="group" aria-label="Вид">
          <button type="button" class="seg__btn" data-act="view" data-view="catalog" aria-pressed="${moodView === 'catalog'}">Каталог</button>
          <button type="button" class="seg__btn" data-act="view" data-view="swipe" aria-pressed="${moodView === 'swipe'}">По одной</button>
        </div>
      </div>
      <div class="moods-filter chips chips--scroll" data-slot="filter" ${moodView === 'swipe' ? 'hidden' : ''} role="group" aria-label="Фильтр образов">
        <button type="button" class="chip" data-act="group" data-group="all" aria-pressed="${moodGroup === 'all'}">Все</button>
        ${groups.map((g) => `<button type="button" class="chip" data-act="group" data-group="${g.id}" aria-pressed="${moodGroup === g.id}">${esc(g.label)}</button>`).join('')}
      </div>
      <div data-slot="view"></div>
    </div>
    <div class="dock dock--glass" data-slot="tray"></div>
  </section>`;
}

export function mount(root, ctx) {
  const gender = ctx.state.gender;
  const moods = ctx.moodsFor(gender);
  const ids = moods.map((m) => m.id);
  const byId = new Map(moods.map((m) => [m.id, m]));
  const sel = () => ctx.store.get().moods[gender];
  const setSel = (next) => ctx.store.update((s) => ({ ...s, moods: { ...s.moods, [gender]: next } }));
  const viewSlot = root.querySelector('[data-slot="view"]');
  const traySlot = root.querySelector('[data-slot="tray"]');
  const filterSlot = root.querySelector('[data-slot="filter"]');
  document.documentElement.style.setProperty('--tray', '92px');

  // ---------- Нижняя панель: подсказка, пока выбрано меньше трёх; потом — выбранные образы и кнопка подбора ----------
  const renderTray = () => {
    const s = sel();
    const chips = s.liked.map((id) => `<button type="button" class="tray__chip" data-act="unlike" data-id="${id}" aria-label="Убрать «${esc(byId.get(id)?.title)}»">${esc(byId.get(id)?.title)}<span class="chip__x" aria-hidden="true">×</span></button>`).join('');
    const ready = Sel.canProceed(s);
    traySlot.innerHTML = `
      <div class="wrap dock__inner">
        <div class="tray__info">
          ${ready ? `<div class="tray__chips">${chips}</div>` : `<span class="tray__empty">${needText(Sel.missing(s))}</span>`}
        </div>
        <button type="button" class="btn btn--primary" data-act="next" ${ready ? '' : 'disabled'}>Подобрать ароматы</button>
      </div>`;
  };

  // Когда набралось три — один раз мягко сообщаем, что уже можно подбирать.
  let announced = Sel.canProceed(sel());
  const afterLike = (r) => {
    if (r.full) return toast(FULL_MSG);
    if (!announced && Sel.canProceed(r.sel)) {
      announced = true;
      toast('Уже можно подобрать ароматы — или выбери ещё');
    }
  };

  // ---------- Каталог ----------
  const stateOf = (id) => {
    const st = Sel.statusOf(sel(), id);
    const stText = { liked: 'нравится', maybe: 'отложен', rejected: 'не нравится', none: 'не выбран' }[st];
    const mark = st === 'liked' ? icons.check : st === 'maybe' ? '?' : st === 'rejected' ? '×' : '';
    return { st, stText, mark };
  };
  // Первые карточки видны сразу — их фото грузим без очереди, остальные по мере прокрутки.
  const cell = (m, i) => {
    const { st, stText, mark } = stateOf(m.id);
    return `
    <div class="mcard is-${st}" data-cell="${m.id}">
      <button type="button" class="mcard__btn" data-act="toggle" data-id="${m.id}" role="checkbox" aria-checked="${st === 'liked'}" aria-label="${esc(m.title)}: ${esc(m.card)}. ${stText}">
        ${moodSlot(m, { priority: i < 4 })}
        <span class="mcard__veil"></span>
        <span class="mcard__body"><span class="mcard__title">${esc(m.title)}</span><span class="mcard__hint">${esc(m.card)}</span></span>
        <span class="mcard__check" aria-hidden="true">${mark}</span>
      </button>
      <button type="button" class="mcard__info" data-act="info" data-id="${m.id}" aria-label="Подробнее: ${esc(m.title)}"><span>i</span></button>
    </div>`;
  };
  const renderCatalog = () => {
    const group = ctx.store.get().moodGroup;
    const list = moods.filter((m) => group === 'all' || m.group === group);
    viewSlot.innerHTML = `<div class="mgrid">${list.map((m, i) => cell(m, i)).join('')}</div>`;
  };
  // Обновляем только отметки — фото не пересоздаются, карточки не мигают при выборе.
  const refreshCatalog = () => {
    viewSlot.querySelectorAll('[data-cell]').forEach((el) => {
      const m = byId.get(el.dataset.cell);
      const { st, stText, mark } = stateOf(m.id);
      el.className = `mcard is-${st}`;
      const btn = el.querySelector('.mcard__btn');
      btn.setAttribute('aria-checked', String(st === 'liked'));
      btn.setAttribute('aria-label', `${m.title}: ${m.card}. ${stText}`);
      el.querySelector('.mcard__check').innerHTML = mark;
    });
  };

  // ---------- По одной ----------
  let drag = null;
  const renderSwipe = () => {
    const mode = ctx.store.get().swipeMode;
    const list = Sel.deck(ids, sel(), mode);
    if (!list.length) {
      const s = sel();
      viewSlot.innerHTML = `
        <div class="deck-empty">
          <p class="display h3">${mode === 'revisit' ? 'Отложенных больше нет' : 'Все образы просмотрены'}</p>
          <p class="muted">${Sel.canProceed(s) ? 'Можно подбирать ароматы.' : needText(Sel.missing(s)) + '.'}</p>
          <div class="chips">
            ${s.rejected.length || s.maybe.length ? '<button type="button" class="chip" data-act="revisit">К отложенным</button>' : ''}
            <button type="button" class="chip" data-act="view" data-view="catalog">Открыть каталог</button>
          </div>
        </div>`;
      return;
    }
    viewSlot.innerHTML = `
      <div class="deck">
        <div class="deck__stack">
          ${list.slice(0, 3).reverse().map((id, k, arr) => {
            const depth = arr.length - 1 - k;
            const m = byId.get(id);
            return `<div class="deck__card" data-depth="${depth}" data-id="${id}" ${depth === 0 ? `tabindex="0" role="group" aria-label="${esc(m.title)}. Стрелка вправо — нравится, влево — не нравится, вверх — отложить"` : 'aria-hidden="true"'}>
              ${moodSlot(m, { sizes: '(min-width: 720px) 480px, 90vw', priority: depth === 0 })}
              <div class="deck__veil"></div>
              <div class="deck__body">
                <p class="deck__title">${esc(m.title)}</p>
                <p class="deck__hint">${esc(m.card)}</p>
              </div>
              ${depth === 0 ? `<button type="button" class="mcard__info deck__info" data-act="info" data-id="${id}" aria-label="Подробнее: ${esc(m.title)}"><span>i</span></button>` : ''}
              <span class="deck__stamp deck__stamp--like" aria-hidden="true">Нравится</span>
              <span class="deck__stamp deck__stamp--nope" aria-hidden="true">Не нравится</span>
              <span class="deck__stamp deck__stamp--maybe" aria-hidden="true">Отложить</span>
            </div>`;
          }).join('')}
        </div>
        <div class="deck__meta">
          ${mode === 'new' && (sel().rejected.length || sel().maybe.length) ? '<button type="button" class="btn btn--text" data-act="revisit">К отложенным</button>' : ''}
          ${mode === 'revisit' ? '<button type="button" class="btn btn--text" data-act="fresh">К новым</button>' : ''}
        </div>
        <div class="deck__controls">
          <button type="button" class="deck__btn deck__btn--nope" data-act="swipe" data-dir="nope" aria-label="Не нравится" title="Не нравится"><span class="deck__icon">${deckIcons.nope}</span></button>
          <button type="button" class="deck__btn deck__btn--small" data-act="swipe" data-dir="maybe" aria-label="Отложить" title="Отложить"><span class="deck__icon">${deckIcons.maybe}</span></button>
          <button type="button" class="deck__btn deck__btn--like" data-act="swipe" data-dir="like" aria-label="Нравится" title="Нравится"><span class="deck__icon">${deckIcons.like}</span></button>
        </div>
      </div>`;
    attachDrag();
    fitDeck(true);
    // Следующие фото подгружаем заранее, чтобы при свайпе не было пустой карточки.
    preloadImages(list.slice(1, 3).map((id) => byId.get(id)));
  };

  // Размер карточки — по реальному месту: карточка и кнопки должны поместиться над нижней панелью.
  // На низких экранах страница сама прокручивается так, чтобы колода оказалась под шапкой.
  function fitDeck(allowScroll = false) {
    const stack = viewSlot.querySelector('.deck__stack');
    if (!stack) return;
    const extra = viewSlot.querySelector('.deck__meta').offsetHeight + viewSlot.querySelector('.deck__controls').offsetHeight + 36;
    const trayH = traySlot.getBoundingClientRect().height;
    const space = () => window.innerHeight - trayH - extra - stack.getBoundingClientRect().top;
    let avail = space();
    if (avail < 300 && allowScroll) {
      const top = root.querySelector('.moods-top');
      const hdr = document.querySelector('.hdr').getBoundingClientRect().height;
      window.scrollTo(0, Math.max(0, top.getBoundingClientRect().top + window.scrollY - hdr - 8));
      avail = space();
    }
    const h = Math.max(220, Math.min(600, avail, viewSlot.clientWidth * 1.25));
    stack.style.height = `${Math.round(h)}px`;
  }
  const onResize = () => fitDeck(false);
  window.addEventListener('resize', onResize);

  // Возврат карточки на место (например, если отмечено уже 7 и новая отметка не добавляется).
  const snapBack = (card) => {
    card.style.transform = '';
    ['--like', '--nope', '--maybe'].forEach((v) => card.style.setProperty(v, 0));
    viewSlot.querySelector('.deck__card[data-depth="1"]')?.style.setProperty('--promote', '0');
  };

  function decide(id, dir) {
    if (dir === 'like') {
      const r = Sel.like(sel(), id);
      setSel(r.sel);
      afterLike(r);
    }
    if (dir === 'maybe') setSel(Sel.maybe(sel(), id));
    if (dir === 'nope') setSel(Sel.reject(sel(), id));
  }

  function fly(card, dir) {
    const id = card.dataset.id;
    if (dir === 'like' && Sel.like(sel(), id).full) {
      snapBack(card);
      return toast(FULL_MSG);
    }
    if (reducedMotion()) { decide(id, dir); return renderSwipe(); }
    const x = dir === 'like' ? 1 : dir === 'nope' ? -1 : 0;
    card.style.transform = dir === 'maybe' ? 'translate(0, -110%) scale(0.94)' : `translate(${x * 120}%, 3%) rotate(${x * 8}deg)`;
    card.style.opacity = '0';
    viewSlot.querySelector('.deck__card[data-depth="1"]')?.style.setProperty('--promote', '1');
    setTimeout(() => { decide(id, dir); renderSwipe(); }, FLY_MS);
  }

  function attachDrag() {
    const card = viewSlot.querySelector('.deck__card[data-depth="0"]');
    if (!card) return;
    const next = viewSlot.querySelector('.deck__card[data-depth="1"]');
    card.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('[data-act]')) return; // кнопка «i» на карточке — не свайп
      drag = { x: e.clientX, y: e.clientY, dx: 0, dy: 0, t: performance.now() };
      card.setPointerCapture(e.pointerId);
      card.classList.add('is-dragging');
    });
    card.addEventListener('pointermove', (e) => {
      if (!drag) return;
      drag.dx = e.clientX - drag.x;
      drag.dy = e.clientY - drag.y;
      const rot = Math.max(-8, Math.min(8, drag.dx / 22));
      card.style.transform = `translate(${drag.dx}px, ${drag.dy * 0.35}px) rotate(${rot}deg)`;
      const k = Math.min(1, Math.abs(drag.dx) / SWIPE_COMMIT);
      card.style.setProperty('--like', drag.dx > 0 ? k : 0);
      card.style.setProperty('--nope', drag.dx < 0 ? k : 0);
      card.style.setProperty('--maybe', drag.dy < -40 ? Math.min(1, -drag.dy / SWIPE_COMMIT) : 0);
      next?.style.setProperty('--promote', String(Math.max(k, Math.min(1, -drag.dy / SWIPE_COMMIT))));
    });
    const end = () => {
      if (!drag) return;
      const { dx, dy, t } = drag;
      drag = null;
      card.classList.remove('is-dragging');
      const fast = Math.abs(dx) / Math.max(1, performance.now() - t) > 0.6 && Math.abs(dx) > 40;
      if (dx > SWIPE_COMMIT || (fast && dx > 0)) return fly(card, 'like');
      if (dx < -SWIPE_COMMIT || (fast && dx < 0)) return fly(card, 'nope');
      if (dy < -SWIPE_COMMIT) return fly(card, 'maybe');
      snapBack(card);
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);
    card.addEventListener('keydown', (e) => {
      const dir = { ArrowRight: 'like', ArrowLeft: 'nope', ArrowUp: 'maybe' }[e.key];
      if (dir) { e.preventDefault(); fly(card, dir); }
    });
  }

  // Без пересоздания фото: в каталоге меняются только отметки, в колоде — текущая карточка.
  const refreshView = () => ((ctx.store.get().moodView ?? 'catalog') === 'swipe' ? renderSwipe() : refreshCatalog());
  const renderView = () => {
    const view = ctx.store.get().moodView ?? 'catalog';
    filterSlot.hidden = view === 'swipe';
    // В режиме «по одной» шапка экрана короче: карточка и кнопки должны поместиться на экране телефона целиком.
    root.querySelector('.screen').classList.toggle('is-swipe', view === 'swipe');
    root.querySelectorAll('[data-act="view"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    if (view === 'swipe') renderSwipe();
    else renderCatalog();
  };

  const openInfo = (m) => {
    const st = Sel.statusOf(sel(), m.id);
    openSheet({
      title: m.title,
      html: `<div class="pd">
        <div class="pd__media">${slot({ tone: m.tone, motif: m.motif, src: m.image?.src, srcset: m.image?.srcset, alt: m.image?.alt, ratio: '16 / 10' })}</div>
        <div class="pd__head"><h2 class="pd__name">${esc(m.title)}</h2><p class="pcard__short">${esc(m.card)}</p></div>
        <p class="pd__plain">${esc(m.detail)}</p>
      </div>`,
      foot: `<button type="button" class="btn btn--primary btn--block" data-pick="${m.id}" ${st === 'liked' ? 'disabled' : ''}>${st === 'liked' ? 'Уже выбран' : 'Нравится'}</button>`,
      onMount: (panel) => panel.querySelector('[data-pick]')?.addEventListener('click', () => {
        const r = Sel.like(sel(), m.id);
        setSel(r.sel);
        afterLike(r);
        closeSheet();
        refreshView();
      }),
    });
  };

  const onClick = (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const { act, id } = el.dataset;
    if (act === 'back') return ctx.nav('feel');
    if (act === 'view') {
      ctx.store.update((s) => ({ ...s, moodView: el.dataset.view, swipeMode: 'new' }));
      renderView();
    }
    if (act === 'group') {
      ctx.store.update((s) => ({ ...s, moodGroup: el.dataset.group }));
      filterSlot.querySelectorAll('[data-group]').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
      renderCatalog();
    }
    if (act === 'toggle') {
      const r = Sel.toggleLike(sel(), id);
      setSel(r.sel);
      afterLike(r);
      refreshCatalog();
    }
    if (act === 'info') openInfo(byId.get(id));
    if (act === 'unlike') {
      setSel(Sel.reset(sel(), id));
      refreshView();
    }
    if (act === 'swipe') {
      const card = viewSlot.querySelector('.deck__card[data-depth="0"]');
      if (card) fly(card, el.dataset.dir);
    }
    if (act === 'revisit' || act === 'fresh') {
      ctx.store.update((s) => ({ ...s, swipeMode: act === 'revisit' ? 'revisit' : 'new' }));
      renderSwipe();
    }
    if (act === 'next' && Sel.canProceed(sel())) ctx.nav('finish');
  };

  const unsub = ctx.store.subscribe(renderTray);
  root.addEventListener('click', onClick);
  renderTray(); // сначала панель: её высота нужна, чтобы подогнать карточку
  renderView();
  return () => {
    unsub();
    root.removeEventListener('click', onClick);
    window.removeEventListener('resize', onResize);
    document.documentElement.style.setProperty('--tray', '0px');
  };
}
