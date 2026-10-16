// Результаты: короткий честный расчёт → сводка профиля → карточки ароматов с объяснениями.
// Приоритет — аромат, соответствие и предупреждения; декор здесь второстепенный.

import { esc, observeReveal, prefersReducedMotion } from '../../app/dom.js';
import { buildRequest } from '../../app/request.js';
import { recommend } from '../../engine/index.js';
import { explain } from '../../engine/explain.js';
import { renderPerfumeCard } from '../perfume-card.js';
import { openModal } from '../modal.js';
import { TIERS } from './tier.js';

let compare = [];

function summary(ctx, request, out) {
  const { data, state } = ctx;
  const label = (list, id) => data.dimensions[list].find((x) => x.id === id)?.label ?? id;
  const tier = TIERS.find((t) => t.id === request.tier);
  const expected = data.config.tiers[request.tier].results;
  const moodTitles = request.moods.map((m) => data.moods.find((x) => x.id === m.id)?.title).filter(Boolean);
  const budget = { budget: 'до 5 000 ₽', mid: '5 000–15 000 ₽', premium: 'от 15 000 ₽', any: 'не важен' }[request.budget];
  const rows = [
    ['Режим', state.gender === 'female' ? 'женский' : 'мужской', state.includeOther ? ' + ароматы вне категории' : ''],
    ['Уровень', tier?.name ?? '', ''],
    ['Способ', state.method === 'moods' ? 'через ощущения' : 'через анкету', ''],
    moodTitles.length ? ['Образы', moodTitles.join(', '), ''] : null,
    ['Бюджет', budget, ''],
    request.hardStops.length ? ['Исключено', request.hardStops.map((s) => label('stopFactors', s).toLowerCase()).join(', '), ''] : null,
    request.softStops.length ? ['Лучше без', request.softStops.map((s) => label('stopFactors', s).toLowerCase()).join(', '), ''] : null,
  ].filter(Boolean);
  return `
    <div class="summary" data-reveal>
      <dl class="summary__list">${rows.map(([k, v, x]) => `<div><dt>${k}</dt><dd>${esc(v)}${esc(x)}</dd></div>`).join('')}</dl>
      <p class="summary__count">${out.results.length} ${out.results.length === 1 ? 'аромат' : out.results.length < 5 ? 'аромата' : 'ароматов'} из ${expected} по тарифу${out.results.length < expected ? ' — подходящих вариантов меньше, и мы не добавляем неподходящие ради количества' : ''}.</p>
    </div>`;
}

function tuningHtml(ctx) {
  if (ctx.state.tier !== 'parfum') return '';
  return `
    <div class="tuning" data-reveal>
      <p class="perfume-card__label">Тонкая настройка</p>
      <div class="chip-row">${ctx.data.config.tuning.map((t) => `<button type="button" class="chip-toggle" data-action="tune" data-id="${t.id}" aria-pressed="${ctx.state.tuning.includes(t.id)}">${esc(t.label)}</button>`).join('')}</div>
    </div>`;
}

export function render() {
  return `<section class="screen screen--results"><div class="container" data-slot="results">
    <div class="calc" role="status"><span class="calc__ring" aria-hidden="true"></span><span>Сравниваем ответы с каталогом PS…</span></div>
  </div></section>`;
}

export function mount(root, ctx) {
  const slot = root.querySelector('[data-slot="results"]');
  let stopReveal = () => {};

  function draw() {
    const state = ctx.store.get();
    const request = buildRequest(state, ctx.data, ctx.questions);
    const out = recommend(request, ctx.data);
    const cards = out.results.map((r, i) => renderPerfumeCard({
      result: r,
      explanation: explain(r, out.profile, request, ctx.data, ctx.texts),
      index: i,
      data: ctx.data,
      saved: state.saved.includes(r.id),
      comparing: compare.includes(r.id),
    })).join('');
    slot.innerHTML = `
      <div class="results-head">
        <button class="btn btn--text back-link" type="button" data-action="back">← Изменить ответы</button>
        <p class="eyebrow" data-reveal>Твоя подборка</p>
        <h1 class="step-head__title" data-reveal>${out.results.length ? 'Вот что мы нашли' : 'Ничего не подошло'}</h1>
      </div>
      ${summary(ctx, request, out)}
      ${tuningHtml(ctx)}
      ${out.results.length ? `<div class="results-list">${cards}</div>` : `
        <div class="empty-state" data-reveal>
          <p>Под такие условия в проверенном каталоге нет подходящих ароматов. Попробуй убрать часть стоп-факторов, расширить бюджет или выбрать другие образы.</p>
          <button class="btn btn--ghost" type="button" data-action="back">Изменить ответы</button>
        </div>`}
      <div class="results-foot">
        <button class="btn btn--ghost" type="button" data-action="restart">Начать заново</button>
      </div>`;
    stopReveal();
    stopReveal = observeReveal(slot);
  }

  function showCompare() {
    const [a, b] = compare.map((id) => ctx.data.byId.get(id));
    const scales = ctx.data.dimensions.scales;
    const bar = (v) => `<span class="cmp-bar"><span style="width:${v * 20}%"></span></span>`;
    openModal({
      title: 'Сравнение',
      wide: true,
      html: `<h2 class="modal__title">Сравнение</h2>
        <div class="cmp">
          <div class="cmp__head"><span></span><strong>${esc(a.brand)} ${esc(a.name)}</strong><strong>${esc(b.brand)} ${esc(b.name)}</strong></div>
          ${scales.map((s) => `<div class="cmp__row"><span>${esc(s.label)}</span>${bar(a.scales[s.id])}${bar(b.scales[s.id])}</div>`).join('')}
        </div>
        <p class="muted">Шкалы — редакционная оценка PS по официальным нотам, от 0 до 5.</p>`,
    });
  }

  const onClick = (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const { action, id } = el.dataset;
    if (action === 'back') ctx.nav('refine');
    if (action === 'restart') {
      compare = [];
      ctx.store.reset({ saved: ctx.store.get().saved });
      ctx.nav('home');
    }
    if (action === 'save') {
      ctx.store.update((s) => ({ ...s, saved: s.saved.includes(id) ? s.saved.filter((x) => x !== id) : [...s.saved, id] }));
      const on = ctx.store.get().saved.includes(id);
      el.setAttribute('aria-pressed', String(on));
      el.className = `btn ${on ? 'btn--primary' : 'btn--ghost'}`;
      el.textContent = on ? '♥ Сохранено' : '♡ Сохранить';
    }
    if (action === 'compare') {
      compare = compare.includes(id) ? compare.filter((x) => x !== id) : [...compare, id].slice(-2);
      slot.querySelectorAll('[data-action="compare"]').forEach((b) => {
        const on = compare.includes(b.dataset.id);
        b.setAttribute('aria-pressed', String(on));
        b.textContent = on ? 'В сравнении' : 'Сравнить';
      });
      if (compare.length === 2) showCompare();
    }
    if (action === 'tune') {
      ctx.store.update((s) => ({ ...s, tuning: s.tuning.includes(id) ? s.tuning.filter((x) => x !== id) : [...s.tuning, id] }));
      const y = window.scrollY;
      draw();
      window.scrollTo({ top: y });
    }
  };

  root.addEventListener('click', onClick);
  // Короткий «расчёт» — не дольше секунды, только чтобы смена экрана не была резкой.
  const t = setTimeout(draw, prefersReducedMotion() ? 0 : 650);
  return () => { clearTimeout(t); stopReveal(); root.removeEventListener('click', onClick); };
}
