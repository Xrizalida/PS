// Подбор через ощущения: два вида — «Все образы» (сетка) и «Листать карточки» (свайп).
// Оба вида читают и меняют одно состояние выбора (scripts/app/selection.js).

import { moodArt } from '../art.js';
import { esc, pad2, toast, prefersReducedMotion } from '../../app/dom.js';
import * as Sel from '../../app/selection.js';
import { openModal } from '../modal.js';

const SWIPE_COMMIT = 110; // px
const FLY_MS = 320;

function moodsOf(ctx) {
  return ctx.state.gender === 'female' ? ctx.data.moods.filter((m) => m.id.startsWith('f-')) : ctx.data.moods.filter((m) => m.id.startsWith('m-'));
}

function tagsLine(mood, data) {
  return mood.tags.slice(0, 3).map((t) => data.dimensions.tags.find((x) => x.id === t)?.label ?? t).join(' · ');
}

function moodCard(mood, index, status, data, variant) {
  const marks = { liked: '♡', maybe: '◇', rejected: '×' };
  return `
  <article class="mood-card mood-card--${variant} is-${status}" data-id="${mood.id}">
    <div class="mood-card__top">
      <span>PS. / ${pad2(index + 1)}</span>
      ${status !== 'none' ? `<span class="mood-card__mark" aria-hidden="true">${marks[status]}</span>` : ''}
    </div>
    <div class="mood-card__art" aria-hidden="true">${moodArt(mood.id)}</div>
    <div class="mood-card__body">
      <h3 class="mood-card__title">${esc(mood.title)}</h3>
      <p class="mood-card__text">${esc(mood.hint)}</p>
      <p class="mood-card__tags">${esc(tagsLine(mood, data))}</p>
    </div>
  </article>`;
}

function gridItem(mood, index, sel, data) {
  const status = Sel.statusOf(sel, mood.id);
  const statusText = { liked: 'выбран', maybe: 'возможно', rejected: 'не моё', none: 'не выбран' }[status];
  return `
  <div class="mood-cell">
    <button type="button" class="mood-cell__btn" role="checkbox" aria-checked="${status === 'liked'}" data-action="toggle" data-id="${mood.id}" aria-label="${esc(mood.title)}, ${statusText}">
      ${moodCard(mood, index, status, data, 'grid')}
      <span class="mood-cell__check" aria-hidden="true"></span>
    </button>
    <button type="button" class="mood-cell__more" data-action="details" data-id="${mood.id}" aria-label="Подробнее об образе «${esc(mood.title)}»">Подробнее</button>
  </div>`;
}

function selectionBar(sel, ctx) {
  const titles = sel.liked.map((id) => ctx.data.moods.find((m) => m.id === id)?.title ?? id);
  const can = sel.liked.length > 0 || sel.maybe.length > 0;
  return `
    <div class="selbar__info">
      <span class="selbar__count">Выбрано: ${sel.liked.length} из ${Sel.MAX_LIKED}</span>
      <span class="selbar__chips">${sel.liked.map((id, i) => `<button type="button" class="selbar__chip" data-action="unlike" data-id="${id}" aria-label="Убрать «${esc(titles[i])}»">${i + 1}. ${esc(titles[i])} <span aria-hidden="true">×</span></button>`).join('')}${sel.maybe.length ? `<span class="selbar__maybe">◇ возможно: ${sel.maybe.length}</span>` : ''}</span>
    </div>
    <button type="button" class="btn btn--primary selbar__go" data-action="continue" ${can ? '' : 'disabled'}>Продолжить</button>`;
}

export function render(ctx) {
  const { state } = ctx;
  return `
  <section class="screen screen--moods">
    <div class="container">
      <button class="btn btn--text back-link" type="button" data-action="back">← Назад</button>
      <div class="step-head step-head--compact">
        <p class="eyebrow">Через ощущения</p>
        <h1 class="step-head__title">Какие образы тебе близки?</h1>
        <p class="step-head__hint">Выбери до трёх. Первый выбранный — главный. «Не моё» — не запрет на ноты, а просто не твоё настроение.</p>
      </div>
      <div class="segmented view-switch" role="group" aria-label="Вид">
        <button type="button" class="segmented__btn" data-action="view" data-view="grid" aria-pressed="${state.moodView === 'grid'}">Все образы</button>
        <button type="button" class="segmented__btn" data-action="view" data-view="swipe" aria-pressed="${state.moodView === 'swipe'}">Листать карточки</button>
      </div>
      <div class="moods-view" data-slot="view"></div>
    </div>
    <div class="selbar" data-slot="bar"></div>
  </section>`;
}

export function mount(root, ctx) {
  const moods = moodsOf(ctx);
  const ids = moods.map((m) => m.id);
  const gender = ctx.state.gender;
  const sel = () => ctx.store.get().moods[gender];
  const setSel = (next) => ctx.store.update((s) => ({ ...s, moods: { ...s.moods, [gender]: next } }));
  const viewSlot = root.querySelector('[data-slot="view"]');
  const barSlot = root.querySelector('[data-slot="bar"]');

  const renderBar = () => { barSlot.innerHTML = selectionBar(sel(), ctx); };

  // ---------- Сетка ----------
  const renderGrid = () => {
    viewSlot.innerHTML = `<div class="mood-grid">${moods.map((m, i) => gridItem(m, i, sel(), ctx.data)).join('')}</div>`;
  };
  const updateGridCell = (id) => {
    const i = ids.indexOf(id);
    const cell = viewSlot.querySelector(`.mood-cell__btn[data-id="${id}"]`)?.parentElement;
    if (!cell) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = gridItem(moods[i], i, sel(), ctx.data);
    const fresh = tmp.firstElementChild;
    fresh.classList.add('just-changed');
    cell.replaceWith(fresh);
    fresh.querySelector('.mood-cell__btn').focus({ preventScroll: true });
  };

  // ---------- Свайп ----------
  let drag = null;
  const currentDeck = () => Sel.deck(ids, sel(), ctx.store.get().swipeMode);

  const renderSwipe = () => {
    const mode = ctx.store.get().swipeMode;
    const list = currentDeck();
    const decided = Sel.decidedCount(sel());
    if (!list.length) {
      viewSlot.innerHTML = `
      <div class="deck-empty">
        <p class="deck-empty__title">${mode === 'revisit' ? 'Пропущенных образов больше нет.' : 'Все образы просмотрены.'}</p>
        <p class="muted">Можно вернуться к отложенным или перейти к подбору.</p>
        <div class="deck-empty__actions">
          ${sel().rejected.length || sel().maybe.length ? '<button type="button" class="btn btn--ghost" data-action="revisit">Вернуться к пропущенным</button>' : ''}
          <button type="button" class="btn btn--ghost" data-action="view" data-view="grid">Все образы</button>
        </div>
      </div>`;
      return;
    }
    const counter = mode === 'revisit' ? `пропущенные · ${list.length}` : `${pad2(Math.min(decided + 1, ids.length))} / ${ids.length}`;
    viewSlot.innerHTML = `
      <div class="deck" aria-live="polite">
        <div class="deck__stack">
          ${list.slice(0, 3).reverse().map((id, k, arr) => {
            const depth = arr.length - 1 - k;
            const m = moods[ids.indexOf(id)];
            return `<div class="deck__card" data-depth="${depth}" data-id="${id}" ${depth === 0 ? 'tabindex="0" aria-label="Образ ' + esc(m.title) + '. Стрелка вправо — нравится, влево — не моё, вверх — возможно"' : 'aria-hidden="true"'}>
              ${moodCard(m, ids.indexOf(id), Sel.statusOf(sel(), id), ctx.data, 'swipe')}
              <span class="deck__stamp deck__stamp--like" aria-hidden="true">Нравится</span>
              <span class="deck__stamp deck__stamp--nope" aria-hidden="true">Не моё</span>
              <span class="deck__stamp deck__stamp--maybe" aria-hidden="true">Возможно</span>
            </div>`;
          }).join('')}
        </div>
        <div class="deck__progress"><span>${counter}</span>${mode === 'new' && (sel().rejected.length || sel().maybe.length) ? '<button type="button" class="btn btn--text" data-action="revisit">К пропущенным</button>' : ''}${mode === 'revisit' ? '<button type="button" class="btn btn--text" data-action="fresh">К новым</button>' : ''}</div>
        <div class="deck__controls">
          <button type="button" class="deck__btn" data-action="swipe" data-dir="nope"><span class="deck__icon" aria-hidden="true">×</span><span class="deck__label">Не моё</span></button>
          <button type="button" class="deck__btn deck__btn--small" data-action="swipe" data-dir="maybe"><span class="deck__icon" aria-hidden="true">◇</span><span class="deck__label">Возможно</span></button>
          <button type="button" class="deck__btn deck__btn--like" data-action="swipe" data-dir="like"><span class="deck__icon" aria-hidden="true">♡</span><span class="deck__label">Нравится</span></button>
        </div>
      </div>`;
    attachDrag();
  };

  function applyDecision(id, dir) {
    if (dir === 'like') {
      const r = Sel.like(sel(), id);
      setSel(r.sel);
      if (r.overflow) toast('Основных образов уже три — этот добавлен в «Возможно».');
      else if (r.sel.liked.length === Sel.MAX_LIKED) toast('Три образа выбраны — можно продолжать подбор.');
    }
    if (dir === 'maybe') setSel(Sel.maybe(sel(), id));
    if (dir === 'nope') setSel(Sel.reject(sel(), id));
  }

  function fly(card, dir) {
    const id = card.dataset.id;
    if (prefersReducedMotion()) {
      applyDecision(id, dir);
      renderSwipe();
      return;
    }
    card.classList.add('is-flying');
    const x = dir === 'like' ? 1 : dir === 'nope' ? -1 : 0;
    card.style.transform = dir === 'maybe' ? 'translate(0, -120%) scale(0.92)' : `translate(${x * 130}%, 4%) rotate(${x * 18}deg)`;
    card.style.opacity = '0';
    root.querySelector('.deck__card[data-depth="1"]')?.classList.add('is-promoting');
    setTimeout(() => {
      applyDecision(id, dir);
      renderSwipe();
    }, FLY_MS);
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
      card.style.transform = `translate(${drag.dx}px, ${drag.dy * 0.4}px) rotate(${drag.dx / 18}deg)`;
      const k = Math.min(1, Math.abs(drag.dx) / SWIPE_COMMIT);
      card.style.setProperty('--like', drag.dx > 0 ? k : 0);
      card.style.setProperty('--nope', drag.dx < 0 ? k : 0);
      card.style.setProperty('--maybe', drag.dy < -40 ? Math.min(1, -drag.dy / SWIPE_COMMIT) : 0);
      if (next) next.style.setProperty('--promote', String(Math.max(k, Math.min(1, -drag.dy / SWIPE_COMMIT))));
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
      if (next) next.style.setProperty('--promote', '0');
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);
    card.addEventListener('keydown', (e) => {
      const dir = { ArrowRight: 'like', ArrowLeft: 'nope', ArrowUp: 'maybe' }[e.key];
      if (dir) { e.preventDefault(); fly(card, dir); }
    });
  }

  const renderView = () => (ctx.store.get().moodView === 'swipe' ? renderSwipe() : renderGrid());
  // В режиме свайпа прокручиваем к колоде: карточка и кнопки должны помещаться на экране вместе.
  const focusDeck = (smooth) => root.querySelector('.view-switch')?.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });

  const onClick = (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const { action, id } = el.dataset;
    if (action === 'back') ctx.nav('tier');
    if (action === 'view') {
      ctx.store.update((s) => ({ ...s, moodView: el.dataset.view }));
      root.querySelectorAll('.view-switch .segmented__btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === el.dataset.view)));
      renderView();
      if (el.dataset.view === 'swipe') focusDeck(true);
    }
    if (action === 'toggle') {
      const r = Sel.toggleLike(sel(), id);
      setSel(r.sel);
      if (r.overflow) toast('Можно выбрать до трёх основных образов — этот добавлен в «Возможно».');
      updateGridCell(id);
    }
    if (action === 'details') {
      const m = moods[ids.indexOf(id)];
      openModal({
        title: m.title,
        html: `<p class="eyebrow">PS. / ${pad2(ids.indexOf(id) + 1)}</p><h2 class="modal__title">${esc(m.title)}</h2><p class="modal__hint">${esc(m.hint)}</p><p class="modal__text">${esc(m.description)}</p><p class="mood-card__tags">${esc(tagsLine(m, ctx.data))}</p>
          <div class="modal__actions"><button type="button" class="btn btn--primary" data-modal-like="${m.id}">${Sel.statusOf(sel(), m.id) === 'liked' ? 'Уже выбран' : 'Нравится'}</button><button type="button" class="btn btn--ghost" data-modal-close>Закрыть</button></div>`,
        onMount: (panel) => panel.querySelector('[data-modal-like]').addEventListener('click', () => {
          const r = Sel.like(sel(), m.id);
          setSel(r.sel);
          if (r.overflow) toast('Основных образов уже три — этот добавлен в «Возможно».');
          panel.querySelector('[data-modal-close]').click();
          renderView();
        }),
      });
    }
    if (action === 'unlike') {
      setSel(Sel.reset(sel(), id));
      renderView();
    }
    if (action === 'swipe') {
      const card = viewSlot.querySelector('.deck__card[data-depth="0"]');
      if (card) fly(card, el.dataset.dir);
    }
    if (action === 'revisit' || action === 'fresh') {
      ctx.store.update((s) => ({ ...s, moodView: 'swipe', swipeMode: action === 'revisit' ? 'revisit' : 'new' }));
      root.querySelectorAll('.view-switch .segmented__btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === 'swipe')));
      renderSwipe();
    }
    if (action === 'continue') ctx.nav('refine');
  };

  const unsub = ctx.store.subscribe(renderBar);
  root.addEventListener('click', onClick);
  renderView();
  renderBar();
  if (ctx.store.get().moodView === 'swipe') setTimeout(() => focusDeck(false), 250);
  return () => { unsub(); root.removeEventListener('click', onClick); };
}
