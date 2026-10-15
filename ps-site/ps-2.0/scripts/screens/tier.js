// Глубина анкеты: Eau de Toilette — 3 вопроса, Eau de Parfum — 6, Le Parfum — 9.

import { esc, icons, plural } from '../core/dom.js';
import { TIERS, FREE_NOTE } from '../core/format.js';
import { questionsForTier } from '../core/request.js';

export function render(ctx) {
  const cur = ctx.state.tier;
  const cards = TIERS.map((t) => {
    const q = questionsForTier(ctx.questions, t.id).length;
    const n = ctx.config.tiers[t.id].results;
    return `
    <button type="button" class="tier" data-tier="${t.id}" aria-pressed="${cur === t.id}">
      <span class="tier__row"><span class="display tier__name">${esc(t.name)}</span><span class="bigcard__arrow" style="position:static">${icons.arrow}</span></span>
      <span class="muted small">${esc(t.lead)}</span>
      <span class="tier__facts"><span>${q} ${plural(q, ['вопрос', 'вопроса', 'вопросов'])}</span><span>${esc(t.time)}</span><span>до ${n} ${plural(n, ['аромата', 'ароматов', 'ароматов'])}</span></span>
      <span class="tier__price"><b>${esc(t.price)}</b>${t.id === 'edt' ? '' : ` · ${FREE_NOTE}`}</span>
    </button>`;
  }).join('');
  return `
  <section class="screen">
    <div class="wrap">
      <button type="button" class="back" data-act="back">${icons.back} Назад</button>
      <div class="head">
        <p class="eyebrow">По анкете</p>
        <h1 class="display h2">Сколько вопросов готов ответить?</h1>
        <p class="lead">Чем больше ответов, тем точнее подборка и тем больше в ней ароматов.</p>
      </div>
      <div class="tiers">${cards}</div>
    </div>
  </section>`;
}

export function mount(root, ctx) {
  const onClick = (e) => {
    const el = e.target.closest('[data-act], [data-tier]');
    if (!el) return;
    if (el.dataset.act === 'back') return ctx.nav('method');
    if (el.dataset.tier) {
      const tier = el.dataset.tier;
      ctx.store.update((s) => ({ ...s, tier, quiz: { ...s.quiz, index: 0 } }));
      ctx.nav('quiz');
    }
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
