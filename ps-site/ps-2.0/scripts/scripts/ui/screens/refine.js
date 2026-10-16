// Общий шаг «Уточнения» для обоих способов: бюджет, стоп-факторы, сезоны.

import { esc, observeReveal } from '../../app/dom.js';

const BUDGETS = [
  { id: 'budget', label: 'До 5 000 ₽' },
  { id: 'mid', label: '5 000–15 000 ₽' },
  { id: 'premium', label: 'От 15 000 ₽' },
  { id: 'any', label: 'Не важно' },
];

export function render(ctx) {
  const { state, data } = ctx;
  const r = state.refine;
  const chip = (group, id, labelText, on) =>
    `<button type="button" class="chip-toggle" data-action="toggle" data-group="${group}" data-id="${id}" aria-pressed="${on}">${esc(labelText)}</button>`;
  const stops = data.dimensions.stopFactors;
  return `
  <section class="screen">
    <div class="container refine">
      <button class="btn btn--text back-link" type="button" data-action="back">← Назад</button>
      <div class="step-head" data-reveal>
        <p class="eyebrow">Последний шаг</p>
        <h1 class="step-head__title">Уточним детали</h1>
        <p class="step-head__hint">Всё необязательно. Стоп-факторы задаются только здесь — отклонённые образы ничего не запрещают.</p>
      </div>

      <div class="refine__block" data-reveal>
        <h2 class="refine__title">Бюджет на флакон</h2>
        <div class="chip-row" role="radiogroup" aria-label="Бюджет">
          ${BUDGETS.map((b) => `<button type="button" class="chip-toggle" role="radio" data-action="budget" data-id="${b.id}" aria-checked="${r.budget === b.id}" aria-pressed="${r.budget === b.id}">${b.label}</button>`).join('')}
        </div>
        <p class="muted refine__note">Цены пока ориентировочные: реальные предложения магазинов появятся на следующем этапе.</p>
      </div>

      <div class="refine__block" data-reveal>
        <h2 class="refine__title">Терпеть не могу</h2>
        <p class="muted refine__note">Такие ароматы не попадут в подборку вообще.</p>
        <div class="chip-row">${stops.map((s) => chip('hard', s.id, s.label, r.hardStops.includes(s.id))).join('')}</div>
      </div>

      <div class="refine__block" data-reveal>
        <h2 class="refine__title">Лучше без</h2>
        <p class="muted refine__note">Можно, но с осторожностью: оценка снизится, а в карточке появится предупреждение.</p>
        <div class="chip-row">${stops.map((s) => chip('soft', s.id, s.label, r.softStops.includes(s.id))).join('')}</div>
      </div>

      ${state.method === 'moods' ? `
      <div class="refine__block" data-reveal>
        <h2 class="refine__title">Когда планируешь носить?</h2>
        <div class="chip-row">${data.dimensions.seasons.map((s) => chip('season', s.id, s.label, r.seasons.includes(s.id))).join('')}</div>
      </div>` : ''}

      <label class="toggle-row" data-reveal>
        <input type="checkbox" data-action="include-other" ${state.includeOther ? 'checked' : ''} />
        <span>Показывать также ароматы вне выбранной категории</span>
      </label>

      <div class="question-nav">
        <span></span>
        <button class="btn btn--primary" type="button" data-action="go">Подобрать ароматы</button>
      </div>
    </div>
  </section>`;
}

export function mount(root, ctx) {
  const stop = observeReveal(root);
  const onClick = (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const { action, id, group } = el.dataset;
    if (action === 'back') ctx.nav(ctx.store.get().method === 'moods' ? 'moods' : 'quiz');
    if (action === 'go') ctx.nav('results');
    if (action === 'budget') {
      ctx.store.update((s) => ({ ...s, refine: { ...s.refine, budget: id } }));
      root.querySelectorAll('[data-action="budget"]').forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.id === id));
        b.setAttribute('aria-checked', String(b.dataset.id === id));
      });
    }
    if (action === 'toggle') {
      ctx.store.update((s) => {
        const r = { ...s.refine };
        const flip = (list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
        if (group === 'hard') { r.hardStops = flip(r.hardStops); r.softStops = r.softStops.filter((x) => x !== id); }
        if (group === 'soft') { r.softStops = flip(r.softStops); r.hardStops = r.hardStops.filter((x) => x !== id); }
        if (group === 'season') r.seasons = flip(r.seasons);
        return { ...s, refine: r };
      });
      // Один и тот же фактор не может быть одновременно «терпеть не могу» и «лучше без».
      const r = ctx.store.get().refine;
      root.querySelectorAll('[data-action="toggle"]').forEach((b) => {
        const list = b.dataset.group === 'hard' ? r.hardStops : b.dataset.group === 'soft' ? r.softStops : r.seasons;
        b.setAttribute('aria-pressed', String(list.includes(b.dataset.id)));
      });
    }
  };
  const onChange = (e) => {
    if (e.target.matches('[data-action="include-other"]')) ctx.store.update((s) => ({ ...s, includeOther: e.target.checked }));
  };
  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  return () => { stop(); root.removeEventListener('click', onClick); root.removeEventListener('change', onChange); };
}
