// «Последний штрих»: бюджет и то, что категорически не нравится. Оба пункта можно пропустить.

import { esc, icons } from '../core/dom.js';
import { BUDGETS, STOPS } from '../core/format.js';

export const stopsChips = (stops, showAll) =>
  STOPS.filter((s) => showAll || s.main || stops.includes(s.id))
    .map((s) => `<button type="button" class="chip" data-act="stop" data-id="${s.id}" aria-pressed="${stops.includes(s.id)}">${esc(s.plain)}</button>`)
    .join('');

export const budgetSeg = (budget) =>
  `<div class="seg seg--full" role="group" aria-label="Бюджет">${BUDGETS.map((b) => `<button type="button" class="seg__btn" data-act="budget" data-id="${b.id}" aria-pressed="${budget === b.id}">${esc(b.label)}</button>`).join('')}</div>`;

export function render(ctx) {
  const { finish } = ctx.state;
  const allShown = finish.stops.some((id) => !STOPS.find((s) => s.id === id)?.main);
  return `
  <section class="screen">
    <div class="wrap" style="max-width:720px">
      <button type="button" class="back" data-act="back">${icons.back} Назад</button>
      <div class="head">
        <h1 class="display h2">Последний штрих</h1>
        <p class="lead">Можно пропустить.</p>
      </div>
      <div class="block">
        <h2 class="display block__title">Бюджет на флакон</h2>
        ${budgetSeg(finish.budget)}
        <p class="small muted">Цены ориентировочные.</p>
      </div>
      <div class="block">
        <h2 class="display block__title">Что точно не нравится?</h2>
        <div class="chips" data-slot="stops">${stopsChips(finish.stops, allShown)}</div>
        ${allShown ? '' : '<button type="button" class="btn btn--text more" data-act="more">Показать ещё</button>'}
      </div>
    </div>
    <div class="dock"><div class="wrap dock__inner" style="max-width:720px">
      <button type="button" class="btn btn--primary btn--block" data-act="go">Показать ароматы ${icons.arrow}</button>
    </div></div>
  </section>`;
}

export function mount(root, ctx) {
  const stopsSlot = root.querySelector('[data-slot="stops"]');
  const onClick = (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const { act, id } = el.dataset;
    if (act === 'back') return ctx.nav(ctx.store.get().method === 'moods' ? 'moods' : 'quiz');
    if (act === 'budget') {
      ctx.store.update((s) => ({ ...s, finish: { ...s.finish, budget: id } }));
      root.querySelectorAll('[data-act="budget"]').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
    }
    if (act === 'stop') {
      const on = el.getAttribute('aria-pressed') === 'true';
      ctx.store.update((s) => ({ ...s, finish: { ...s.finish, stops: on ? s.finish.stops.filter((x) => x !== id) : [...s.finish.stops, id] } }));
      el.setAttribute('aria-pressed', String(!on));
    }
    if (act === 'more') {
      stopsSlot.innerHTML = stopsChips(ctx.store.get().finish.stops, true);
      el.remove();
    }
    if (act === 'go') ctx.nav('results');
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
