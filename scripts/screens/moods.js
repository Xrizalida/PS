// Выбор образов: «Каталог» (2 в ряд на телефоне) и «По одной» (свайп). Состояние выбора общее.

import { esc, icons, pad2, toast, reducedMotion } from '../core/dom.js';
import * as Sel from '../core/selection.js';
import { slot } from '../ui/slot.js';
import { openSheet, closeSheet } from '../ui/sheet.js';

const SWIPE_COMMIT = 100; // px
const FLY_MS = 300;

const moodSlot = (m) => slot({ tone: m.tone, motif: m.motif, src: m.image?.src, alt: m.image?.alt });

export function render(ctx) {
  const { moodGroup } = ctx.state;
  const moodView = ctx.state.moodView ?? 'catalog';
  const groups = ctx.display.moods.groups;
  return `
  <section class="screen">
    <div class="wrap">
      <button type="button" class="back" data-act="back">${icons.back} Назад</button>
      <div class="head">
        <p class="eyebrow">По ощущениям</p>
        <h1 class="display h2">Что тебе ближе?</h1>
        <p class="lead">До трёх образов. Первый выбранный — главный.</p>
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

  // ---------- Панель выбранного ----------
  const renderTray = () => {
    const s = sel();
    const chips = s.liked.map((id, i) => `<button type="button" class="tray__chip" data-act="unlike" data-id="${id}" aria-label="Убрать «${esc(byId.get(id)?.title)}»"><b>${i + 1}</b>${esc(byId.get(id)?.title)}<span class="chip__x" aria-hidden="true">×</span></button>`).join('');
    const maybeNote = s.maybe.length ? `<span class="tray__chip">◇ возможно: ${s.maybe.length}</span>` : '';
    traySlot.innerHTML = `
      <div class="wrap dock__inner">
        <div class="tray__info">
          <span class="tray__count">Выбрано ${s.liked.length} из ${Sel.MAX_LIKED}</span>
          ${s.liked.length || s.maybe.length ? `<div class="tray__chips">${chips}${maybeNote}</div>` : '<span class="tray__empty">Отметь хотя бы один образ</span>'}
        </div>
        <button type="button" class="btn btn--primary" data-act="next" ${Sel.hasChoice(s) ? '' : 'disabled'}>Дальше ${icons.arrow}</button>
      </div>`;
  };

  // ---------- Каталог ----------
  const cell = (m, i) => {
    const st = Sel.statusOf(sel(), m.id);
    const pos = sel().liked.indexOf(m.id);
    const stText = { liked: `выбран, приоритет ${pos + 1}`, maybe: 'возможно', rejected: 'не моё', none: 'не выбран' }[st];
    return `
    <div class="mcard is-${st}" data-cell="${m.id}">
      <button type="button" class="mcard__btn" data-act="toggle" data-id="${m.id}" role="checkbox" aria-checked="${st === 'liked'}" aria-label="${esc(m.title)}: ${esc(m.hint)}. ${stText}">
        ${moodSlot(m)}
        <span class="mcard__veil"></span>
        <span class="mcard__body"><span class="mcard__title">${esc(m.title)}</span><span class="mcard__hint">${esc(m.hint)}</span></span>
        <span class="mcard__check" aria-hidden="true">${pos >= 0 ? pos + 1 : ''}</span>
      </button>
      <button type="button" class="mcard__info" data-act="info" data-id="${m.id}" aria-label="Подробнее: ${esc(m.title)}"><span>i</span></button>
    </div>`;
  };
  const renderCatalog = () => {
    const group = ctx.store.get().moodGroup;
    const list = moods.filter((m) => group === 'all' || m.group === group);
    viewSlot.innerHTML = `<div class="mgrid">${list.map((m) => cell(m, ids.indexOf(m.id))).join('')}</div>`;
  };
  // Номера приоритета меняются у всех выбранных, поэтому обновляем все карточки, а не одну.
  const refreshCatalog = (focusId) => {
    viewSlot.querySelectorAll('[data-cell]').forEach((el) => {
      const tmp = document.createElement('div');
      tmp.innerHTML = cell(byId.get(el.dataset.cell), 0);
      el.replaceWith(tmp.firstElementChild);
    });
    if (focusId) viewSlot.querySelector(`[data-cell="${focusId}"] .mcard__btn`)?.focus({ preventScroll: true });
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
          <p class="muted">${Sel.hasChoice(s) ? 'Можно переходить к подборке.' : 'Ничего не отмечено — можно вернуться к отложенным или открыть каталог.'}</p>
          <div class="chips">
            ${s.rejected.length || s.maybe.length ? '<button type="button" class="chip" data-act="revisit">Вернуться к отложенным</button>' : ''}
            <button type="button" class="chip" data-act="view" data-view="catalog">Открыть каталог</button>
          </div>
        </div>`;
      return;
    }
    const decided = Sel.decidedCount(sel());
    const counter = mode === 'revisit' ? `отложенные · ${list.length}` : `${pad2(Math.min(decided + 1, ids.length))} / ${ids.length}`;
    viewSlot.innerHTML = `
      <div class="deck">
        <div class="deck__stack">
          ${list.slice(0, 3).reverse().map((id, k, arr) => {
            const depth = arr.length - 1 - k;
            const m = byId.get(id);
            return `<div class="deck__card" data-depth="${depth}" data-id="${id}" ${depth === 0 ? `tabindex="0" role="group" aria-label="${esc(m.title)}. Стрелка вправо — моё, влево — не моё, вверх — возможно"` : 'aria-hidden="true"'}>
              ${moodSlot(m)}
              <div class="deck__veil"></div>
              <div class="deck__body">
                <p class="deck__title">${esc(m.title)}</p>
                <p class="deck__hint">${esc(m.hint)}</p>
                <p class="deck__story">${esc(m.story)}</p>
              </div>
              <span class="deck__stamp deck__stamp--like" aria-hidden="true">Моё</span>
              <span class="deck__stamp deck__stamp--nope" aria-hidden="true">Не моё</span>
              <span class="deck__stamp deck__stamp--maybe" aria-hidden="true">Возможно</span>
            </div>`;
          }).join('')}
        </div>
        <div class="deck__meta"><span>${counter}</span>
          ${mode === 'new' && (sel().rejected.length || sel().maybe.length) ? '<button type="button" class="btn btn--text" data-act="revisit">К отложенным</button>' : ''}
          ${mode === 'revisit' ? '<button type="button" class="btn btn--text" data-act="fresh">К новым</button>' : ''}
        </div>
        <div class="deck__controls">
          <button type="button" class="deck__btn" data-act="swipe" data-dir="nope"><span class="deck__icon">${icons.nope}</span>Не моё</button>
          <button type="button" class="deck__btn deck__btn--small" data-act="swipe" data-dir="maybe"><span class="deck__icon">${icons.maybe}</span>Возможно</button>
          <button type="button" class="deck__btn deck__btn--like" data-act="swipe" data-dir="like"><span class="deck__icon">${icons.like}</span>Моё</button>
        </div>
      </div>`;
    attachDrag();
  };

  function decide(id, dir) {
    if (dir === 'like') {
      const r = Sel.like(sel(), id);
      setSel(r.sel);
      if (r.overflow) toast('Основных образов уже три — этот отмечен как «возможно»');
      else if (r.sel.liked.length === Sel.MAX_LIKED) toast('Три образа выбраны — можно переходить к подборке');
    }
    if (dir === 'maybe') setSel(Sel.maybe(sel(), id));
    if (dir === 'nope') setSel(Sel.reject(sel(), id));
  }

  function fly(card, dir) {
    const id = card.dataset.id;
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
      if (e.button !== 0) return;
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
      card.style.transform = '';
      ['--like', '--nope', '--maybe'].forEach((v) => card.style.setProperty(v, 0));
      next?.style.setProperty('--promote', '0');
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);
    card.addEventListener('keydown', (e) => {
      const dir = { ArrowRight: 'like', ArrowLeft: 'nope', ArrowUp: 'maybe' }[e.key];
      if (dir) { e.preventDefault(); fly(card, dir); }
    });
  }

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
        <div class="pd__media">${slot({ tone: m.tone, motif: m.motif, src: m.image?.src, alt: m.image?.alt, ratio: '16 / 10' })}</div>
        <div class="pd__head"><p class="eyebrow">Образ</p><h2 class="pd__name">${esc(m.title)}</h2><p class="pd__atm">${esc(m.story)}</p></div>
        <section class="pd__sec"><p class="eyebrow">В аромате</p><p>${esc(ctx.store.get().lang === 'expert' ? m.hintExpert : m.hint)}</p></section>
      </div>`,
      foot: `<button type="button" class="btn btn--primary btn--block" data-pick="${m.id}" ${st === 'liked' ? 'disabled' : ''}>${st === 'liked' ? 'Уже выбран' : 'Это моё'}</button>`,
      onMount: (panel) => panel.querySelector('[data-pick]')?.addEventListener('click', () => {
        const r = Sel.like(sel(), m.id);
        setSel(r.sel);
        if (r.overflow) toast('Основных образов уже три — этот отмечен как «возможно»');
        closeSheet();
        renderView();
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
      if (r.overflow) toast('Можно выбрать до трёх — этот отмечен как «возможно»');
      refreshCatalog(id);
    }
    if (act === 'info') openInfo(byId.get(id));
    if (act === 'unlike') {
      setSel(Sel.reset(sel(), id));
      renderView();
    }
    if (act === 'swipe') {
      const card = viewSlot.querySelector('.deck__card[data-depth="0"]');
      if (card) fly(card, el.dataset.dir);
    }
    if (act === 'revisit' || act === 'fresh') {
      ctx.store.update((s) => ({ ...s, swipeMode: act === 'revisit' ? 'revisit' : 'new' }));
      renderSwipe();
    }
    if (act === 'next') ctx.nav('finish');
  };

  const unsub = ctx.store.subscribe(renderTray);
  root.addEventListener('click', onClick);
  renderView();
  renderTray();
  return () => {
    unsub();
    root.removeEventListener('click', onClick);
    document.documentElement.style.setProperty('--tray', '0px');
  };
}
