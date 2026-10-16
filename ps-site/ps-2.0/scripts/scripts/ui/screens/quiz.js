// Анкета: один вопрос на экран, прогресс, назад/далее, необязательные вопросы можно пропустить.
// В анкете нет больших декоративных композиций — интерфейс должен оставаться предельно удобным.

import { esc } from '../../app/dom.js';
import { questionsForTier } from '../../app/request.js';
import { isEligible } from '../../engine/index.js';
import { TIERS } from './tier.js';

function list(ctx) {
  return questionsForTier(ctx.questions, ctx.state.tier);
}

function answered(q, a) {
  if (a == null) return false;
  return Array.isArray(a) ? a.length > 0 : true;
}

function optionsHtml(q, a) {
  const multi = q.type === 'multi';
  const chosen = multi ? (Array.isArray(a) ? a : []) : [a];
  return `<div class="answer-grid${q.options.length > 4 ? ' answer-grid--many' : ''}" role="${multi ? 'group' : 'radiogroup'}" aria-label="${esc(q.title)}">
    ${q.options.map((o) => `
      <button type="button" class="choice" role="${multi ? 'checkbox' : 'radio'}" aria-checked="${chosen.includes(o.id)}" data-action="answer" data-option="${o.id}">
        <span class="choice__check" aria-hidden="true"></span>
        <span class="choice__title">${esc(o.label)}</span>
        ${o.text ? `<span class="choice__text">${esc(o.text)}</span>` : ''}
      </button>`).join('')}
  </div>`;
}

function perfumesHtml(q, a, ctx, query = '') {
  const chosen = Array.isArray(a) ? a : [];
  const pool = ctx.data.perfumes.filter((p) => isEligible(p, ctx.data.config));
  const norm = (s) => s.toLowerCase().replaceAll('ё', 'е');
  const found = query.trim().length >= 2
    ? pool.filter((p) => norm(`${p.brand} ${p.name}`).includes(norm(query.trim()))).slice(0, 8)
    : [];
  const byId = (id) => ctx.data.byId.get(id);
  return `
    <div class="picker">
      <div class="picker__chosen">${chosen.map((id) => `<button type="button" class="selbar__chip" data-action="unpick" data-id="${id}">${esc(byId(id)?.brand)} ${esc(byId(id)?.name)} <span aria-hidden="true">×</span></button>`).join('') || '<span class="muted">Пока ничего не выбрано</span>'}</div>
      <label class="picker__label" for="picker-input">Название или бренд</label>
      <input id="picker-input" class="input" type="search" autocomplete="off" placeholder="Например, Encre Noire или Kilian" value="${esc(query)}" data-action="search" ${chosen.length >= q.max ? 'disabled' : ''} />
      <ul class="picker__results" role="listbox" aria-label="Найденные ароматы">
        ${found.map((p) => `<li><button type="button" class="picker__item" data-action="pick" data-id="${p.id}" ${chosen.includes(p.id) ? 'disabled' : ''}>${esc(p.brand)} <strong>${esc(p.name)}</strong> <span class="muted">${esc(p.concentration)}</span></button></li>`).join('')}
        ${query.trim().length >= 2 && !found.length ? '<li class="muted picker__empty">В проверенном каталоге PS такого пока нет.</li>' : ''}
      </ul>
      <p class="muted picker__note">Поиск по ${pool.length} проверенным ароматам каталога PS. Можно выбрать до ${q.max}.</p>
    </div>`;
}

export function render(ctx) {
  return `<section class="screen screen--quiz"><div class="container quiz" data-slot="quiz"></div></section>`;
}

export function mount(root, ctx) {
  const slot = root.querySelector('[data-slot="quiz"]');
  const qs = list(ctx);
  const tierName = TIERS.find((t) => t.id === ctx.state.tier)?.name ?? '';
  let query = '';

  const state = () => ctx.store.get();
  const index = () => Math.min(state().quiz.index, qs.length - 1);
  const setAnswer = (qid, value) => ctx.store.update((s) => ({ ...s, quiz: { ...s.quiz, answers: { ...s.quiz.answers, [qid]: value } } }));
  const go = (i) => ctx.store.update((s) => ({ ...s, quiz: { ...s.quiz, index: i } }));

  function draw(direction = 0) {
    const i = index();
    const q = qs[i];
    const a = state().quiz.answers[q.id];
    const gender = state().gender;
    const title = q.titleByGender?.[gender] ?? q.title;
    const canNext = q.optional || answered(q, a);
    slot.innerHTML = `
      <button class="btn btn--text back-link" type="button" data-action="prev">← Назад</button>
      <div class="progress" aria-label="Прогресс анкеты">
        <span class="progress__label">Вопрос ${i + 1} из ${qs.length} · ${tierName}</span>
        <div class="progress__track"><div class="progress__bar" style="width:${((i + 1) / qs.length) * 100}%"></div></div>
      </div>
      <div class="question ${direction ? `question--in-${direction > 0 ? 'next' : 'prev'}` : ''}">
        <div class="step-head">
          <h1 class="step-head__title" tabindex="-1">${esc(title)}</h1>
          <p class="step-head__hint">${esc(q.hint?.[gender] ?? '')}</p>
        </div>
        ${q.type === 'perfumes' ? perfumesHtml(q, a, ctx, query) : optionsHtml(q, a)}
      </div>
      <div class="question-nav">
        ${q.optional ? '<button class="btn btn--text" type="button" data-action="skip">Пропустить</button>' : '<span></span>'}
        <button class="btn btn--primary" type="button" data-action="next" ${canNext ? '' : 'disabled'}>${i === qs.length - 1 ? 'К уточнениям' : 'Далее'}</button>
      </div>`;
  }

  function next() {
    query = '';
    if (index() >= qs.length - 1) return ctx.nav('refine');
    go(index() + 1);
    draw(1);
    slot.querySelector('h1')?.focus({ preventScroll: true });
  }

  const onClick = (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const q = qs[index()];
    const a = state().quiz.answers[q.id];
    const { action } = el.dataset;
    if (action === 'prev') {
      query = '';
      if (index() === 0) return ctx.nav('tier');
      go(index() - 1);
      draw(-1);
    }
    if (action === 'answer') {
      const id = el.dataset.option;
      if (q.type === 'multi') {
        const cur = Array.isArray(a) ? a : [];
        const nextVal = cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= q.max ? [...cur.slice(1), id] : [...cur, id];
        setAnswer(q.id, nextVal);
        draw();
      } else {
        setAnswer(q.id, id);
        draw();
        // Одиночный выбор — сразу дальше, с короткой паузой, чтобы был виден выбор.
        setTimeout(() => { if (qs[index()].id === q.id) next(); }, 240);
      }
    }
    if (action === 'next') next();
    if (action === 'skip') { setAnswer(q.id, null); next(); }
    if (action === 'pick') {
      const cur = Array.isArray(a) ? a : [];
      if (cur.length < q.max && !cur.includes(el.dataset.id)) setAnswer(q.id, [...cur, el.dataset.id]);
      query = '';
      draw();
      slot.querySelector('#picker-input')?.focus();
    }
    if (action === 'unpick') {
      setAnswer(q.id, (Array.isArray(a) ? a : []).filter((x) => x !== el.dataset.id));
      draw();
    }
  };
  const onInput = (e) => {
    if (!e.target.matches('[data-action="search"]')) return;
    query = e.target.value;
    const pos = e.target.selectionStart;
    draw();
    const input = slot.querySelector('#picker-input');
    input.focus();
    input.setSelectionRange(pos, pos);
  };

  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  draw();
  return () => { root.removeEventListener('click', onClick); root.removeEventListener('input', onInput); };
}
