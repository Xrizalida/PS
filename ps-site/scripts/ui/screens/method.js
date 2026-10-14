// Выбор способа подбора: через ощущения или через анкету. Оба варианта равноправны.

import { composition } from '../art.js';
import { observeReveal } from '../../app/dom.js';

export function render({ state }) {
  const card = (method, title, text, art) => `
    <button type="button" class="method-card" data-action="method" data-method="${method}" aria-pressed="${state.method === method}">
      <span class="method-card__art" aria-hidden="true">${art}</span>
      <span class="method-card__body">
        <span class="method-card__title">${title}</span>
        <span class="method-card__text">${text}</span>
        <span class="method-card__cta">Выбрать <span aria-hidden="true">→</span></span>
      </span>
    </button>`;
  return `
  <section class="screen">
    <div class="container">
      <button class="btn btn--text back-link" type="button" data-action="back">← Назад</button>
      <div class="step-head" data-reveal>
        <p class="eyebrow">Шаг 2</p>
        <h1 class="step-head__title">Как тебе удобнее найти свой аромат?</h1>
        <p class="step-head__hint">Оба способа работают на любом уровне подбора.</p>
      </div>
      <div class="method-grid" data-reveal>
        ${card('moods', 'Через ощущения', 'Выбирай образы, настроения и ассоциации, которые тебе близки.', composition('arcs', 'method-moods', { count: 5 }))}
        ${card('quiz', 'Через анкету', 'Ответь на несколько вопросов, и мы разберёмся в твоих предпочтениях.', composition('verticals', 'method-quiz', { count: 12, sun: true }))}
      </div>
    </div>
  </section>`;
}

export function mount(root, ctx) {
  const stop = observeReveal(root);
  const onClick = (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    if (el.dataset.action === 'back') ctx.nav('gender');
    if (el.dataset.action === 'method') {
      ctx.store.update((s) => ({ ...s, method: el.dataset.method }));
      ctx.nav('tier');
    }
  };
  root.addEventListener('click', onClick);
  return () => { stop(); root.removeEventListener('click', onClick); };
}
