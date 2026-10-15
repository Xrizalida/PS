// «Каталог образов / Карточки по одной» — главный экран-идентичность PS. Появляется после пола и способа.

import { icons } from '../core/dom.js';

export function render(ctx) {
  const { moodView, gender } = ctx.state;
  const n = ctx.moodsFor(gender).length;
  return `
  <section class="screen">
    <div class="wrap">
      <button type="button" class="back" data-act="back">${icons.back} Назад</button>
      <div class="head">
        <p class="eyebrow">По ощущениям</p>
        <h1 class="display h2">Как смотреть образы?</h1>
        <p class="lead">Выбор общий: можно начать в одном виде и переключиться в другой — отмеченное сохранится.</p>
      </div>
      <div class="bigcards">
        <button type="button" class="bigcard" data-view="catalog" aria-pressed="${moodView === 'catalog'}">
          <span class="schema schema--grid" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <span class="bigcard__veil"></span>
          <span class="bigcard__num">01</span>
          <span class="bigcard__arrow">${icons.arrow}</span>
          <span class="bigcard__title display">Каталог образов</span>
          <span class="bigcard__text">Все ${n} на одном экране — выбирай, сравнивая</span>
        </button>
        <button type="button" class="bigcard" data-view="swipe" aria-pressed="${moodView === 'swipe'}">
          <span class="schema schema--stack" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="bigcard__veil"></span>
          <span class="bigcard__num">02</span>
          <span class="bigcard__arrow">${icons.arrow}</span>
          <span class="bigcard__title display">Карточки по одной</span>
          <span class="bigcard__text">Одна карточка — одно решение: моё или не моё</span>
        </button>
      </div>
    </div>
  </section>`;
}

export function mount(root, ctx) {
  const onClick = (e) => {
    const el = e.target.closest('[data-act], [data-view]');
    if (!el) return;
    if (el.dataset.act === 'back') return ctx.nav('method');
    if (el.dataset.view) {
      const moodView = el.dataset.view;
      ctx.store.update((s) => ({ ...s, moodView }));
      ctx.nav('moods');
    }
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
