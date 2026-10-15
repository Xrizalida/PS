// Способ подбора: «По ощущениям» или «По анкете». Две большие карточки — фирменный элемент PS.

import { icons } from '../core/dom.js';

const LEAD = 'Оба пути приводят к короткому списку с объяснением. Можно вернуться и попробовать другой.';

export function render(ctx) {
  const { method, gender } = ctx.state;
  return `
  <section class="screen">
    <div class="wrap">
      <button type="button" class="back" data-act="back">${icons.back} Назад</button>
      <div class="head">
        <p class="eyebrow">Шаг 2 · ${gender === 'female' ? 'женское' : 'мужское'}</p>
        <h1 class="display h2">Как удобнее подобрать?</h1>
        <p class="lead">${LEAD}</p>
      </div>
      <div class="bigcards">
        <button type="button" class="bigcard" data-method="moods" aria-pressed="${method === 'moods'}">
          <span class="slot slot--circle" data-tone="${gender === 'female' ? 'powder' : 'steel'}" aria-hidden="true"></span>
          <span class="bigcard__veil"></span>
          <span class="bigcard__num">01</span>
          <span class="bigcard__arrow">${icons.arrow}</span>
          <span class="bigcard__title display">По ощущениям</span>
          <span class="bigcard__text">Выбери образы, которые откликаются</span>
          <span class="bigcard__meta">около минуты</span>
        </button>
        <button type="button" class="bigcard" data-method="quiz" aria-pressed="${method === 'quiz'}">
          <span class="schema schema--quiz" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <span class="bigcard__veil"></span>
          <span class="bigcard__num">02</span>
          <span class="bigcard__arrow">${icons.arrow}</span>
          <span class="bigcard__title display">По анкете</span>
          <span class="bigcard__text">Простые вопросы без терминов</span>
          <span class="bigcard__meta">3, 6 или 9 вопросов</span>
        </button>
      </div>
    </div>
  </section>`;
}

export function mount(root, ctx) {
  const onClick = (e) => {
    const el = e.target.closest('[data-act], [data-method]');
    if (!el) return;
    if (el.dataset.act === 'back') return ctx.nav('', { focus: 'choose' });
    if (el.dataset.method) {
      const method = el.dataset.method;
      ctx.store.update((s) => ({ ...s, method }));
      ctx.nav(method === 'moods' ? 'feel' : 'tier');
    }
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
