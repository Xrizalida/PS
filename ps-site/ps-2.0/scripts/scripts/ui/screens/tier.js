// Выбор глубины подбора. Все три уровня на время тестирования бесплатны (ТЗ, раздел 8).

import { observeReveal } from '../../app/dom.js';
import { questionsForTier } from '../../app/request.js';

export const TIERS = [
  { id: 'edt', name: 'Eau de Toilette', price: 'Бесплатно', lead: 'Быстрое знакомство с PS' },
  { id: 'edp', name: 'Eau de Parfum', price: '250 ₽', lead: 'Глубокий подбор' },
  { id: 'parfum', name: 'Le Parfum', price: '500 ₽', lead: 'Максимальная персонализация' },
];

export function render({ state, data, questions }) {
  const moods = state.method === 'moods';
  const cards = TIERS.map((t, i) => {
    const results = data.config.tiers[t.id].results;
    const q = questionsForTier(questions, t.id).length;
    const how = moods ? 'До трёх образов и уточнения' : `${q} вопросов и уточнения`;
    return `
    <button type="button" class="tier-card" data-action="tier" data-tier="${t.id}" aria-pressed="${state.tier === t.id}">
      <span class="tier-card__num">0${i + 1}</span>
      <span class="tier-card__name">${t.name}</span>
      <span class="tier-card__lead">${t.lead}</span>
      <span class="tier-card__facts">
        <span>${how}</span>
        <span>${results} ${results === 3 ? 'рекомендации' : 'рекомендаций'}</span>
        ${t.id === 'parfum' ? '<span>Тонкая настройка результата</span>' : ''}
      </span>
      <span class="tier-card__price">${t.price}${t.id === 'edt' ? '' : ' · <span class="tier-card__free">сейчас бесплатно в рамках тестирования</span>'}</span>
    </button>`;
  }).join('');
  return `
  <section class="screen">
    <div class="container">
      <button class="btn btn--text back-link" type="button" data-action="back">← Назад</button>
      <div class="step-head" data-reveal>
        <p class="eyebrow">Шаг 3 · ${moods ? 'через ощущения' : 'через анкету'}</p>
        <h1 class="step-head__title">Выбери глубину подбора</h1>
        <p class="step-head__hint">Уровни различаются глубиной анализа и числом рекомендаций. Оплаты нет.</p>
      </div>
      <div class="tier-grid" data-reveal>${cards}</div>
    </div>
  </section>`;
}

export function mount(root, ctx) {
  const stop = observeReveal(root);
  const onClick = (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    if (el.dataset.action === 'back') ctx.nav('method');
    if (el.dataset.action === 'tier') {
      const tier = el.dataset.tier;
      ctx.store.update((s) => ({ ...s, tier, quiz: s.tier === tier ? s.quiz : { ...s.quiz, index: 0 } }));
      ctx.nav(ctx.store.get().method === 'moods' ? 'moods' : 'quiz');
    }
  };
  root.addEventListener('click', onClick);
  return () => { stop(); root.removeEventListener('click', onClick); };
}
