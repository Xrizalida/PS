// Анкета: один вопрос на экран. Одиночный выбор — автопереход, несколько — кнопка «Дальше».

import { esc, icons, pad2, reducedMotion } from '../core/dom.js';
import { questionsForTier } from '../core/request.js';
import { isEligible, genderAllowed } from '../../../scripts/engine/index.js';

const optLabel = (o, gender) => (gender === 'female' && o.female) || o.label;

export function render(ctx) {
  const { tier, quiz, gender } = ctx.state;
  const list = questionsForTier(ctx.questions, tier);
  const index = Math.min(quiz.index, list.length - 1);
  const q = list[index];
  const answer = quiz.answers[q.id];
  const title = (gender === 'female' && q.titleFemale) || q.title;
  const progress = list.map((_, i) => `<i class="${i < index ? 'is-done' : i === index ? 'is-now' : ''}"></i>`).join('');

  let body = '';
  if (q.type === 'perfumes') {
    const ids = Array.isArray(answer) ? answer : [];
    body = `
      <div class="search"><input type="search" data-slot="search" placeholder="Например, Layton или Lattafa" aria-label="Поиск аромата по названию" autocomplete="off"></div>
      <div class="chips" data-slot="picked" style="margin-top:12px">${ids.map((id) => `<button type="button" class="chip" aria-pressed="true" data-act="unpick" data-id="${id}">${esc(ctx.perfumeName(id))} <span class="chip__x">×</span></button>`).join('')}</div>
      <div class="found" data-slot="found"></div>`;
  } else {
    const chosen = Array.isArray(answer) ? answer : answer != null ? [answer] : [];
    body = `<div class="opts${q.options.length > 4 ? ' opts--two' : ''}" role="group" aria-label="${esc(title)}">
      ${q.options.map((o) => `<button type="button" class="opt${q.type === 'multi' ? ' opt--multi' : ''}" data-act="pick" data-id="${o.id}" aria-pressed="${chosen.includes(o.id)}"><span>${esc(optLabel(o, gender))}</span><span class="opt__mark" aria-hidden="true"></span></button>`).join('')}
    </div>`;
  }

  const needsNext = q.type !== 'single';
  const last = index === list.length - 1;
  return `
  <section class="screen">
    <div class="wrap" style="max-width:720px">
      <div class="q-top">
        <button type="button" class="back" data-act="back">${icons.back} Назад</button>
        <span class="eyebrow">${pad2(index + 1)} / ${pad2(list.length)}</span>
      </div>
      <div class="progress" aria-hidden="true">${progress}</div>
      <div class="q-head">
        <h1 class="display h2">${esc(title)}</h1>
        ${q.hint ? `<p class="lead">${esc(q.hint)}</p>` : ''}
      </div>
      ${body}
    </div>
    ${needsNext ? `<div class="dock"><div class="wrap dock__inner" style="max-width:720px"><button type="button" class="btn btn--primary btn--block" data-act="next">${(Array.isArray(answer) && answer.length) ? (last ? 'Готово' : 'Дальше') : 'Пропустить'} ${icons.arrow}</button></div></div>` : ''}
  </section>`;
}

export function mount(root, ctx) {
  const { tier, gender } = ctx.store.get();
  const list = questionsForTier(ctx.questions, tier);
  const index = Math.min(ctx.store.get().quiz.index, list.length - 1);
  const q = list[index];
  let locked = false;

  const setAnswer = (value) => ctx.store.update((s) => ({ ...s, quiz: { ...s.quiz, answers: { ...s.quiz.answers, [q.id]: value } } }));
  const go = (delta) => {
    const next = index + delta;
    if (next < 0) return ctx.nav('tier');
    if (next >= list.length) return ctx.nav('finish');
    ctx.store.update((s) => ({ ...s, quiz: { ...s.quiz, index: next } }));
    ctx.nav('quiz', { force: true });
  };

  // Поиск аромата по названию — только по допущенным ароматам каталога.
  if (q.type === 'perfumes') {
    const input = root.querySelector('[data-slot="search"]');
    const found = root.querySelector('[data-slot="found"]');
    ctx.ensureData().then((data) => {
      const pool = data.perfumes.filter((p) => isEligible(p, data.config) && genderAllowed(p, gender, false));
      const norm = (s) => s.toLowerCase().replace(/ё/g, 'е');
      input.addEventListener('input', () => {
        const t = norm(input.value.trim());
        const picked = ctx.store.get().quiz.answers[q.id] ?? [];
        const hits = t.length < 2 ? [] : pool.filter((p) => norm(`${p.brand} ${p.name}`).includes(t) && !picked.includes(p.id)).slice(0, 6);
        found.innerHTML = hits.map((p) => `<button type="button" class="found__item" data-act="add" data-id="${p.id}"><span><span class="found__brand">${esc(p.brand)}</span><br>${esc(p.name)}</span>${icons.arrow}</button>`).join('') || (t.length >= 2 ? '<p class="muted small">Не нашли такой аромат в каталоге PS.</p>' : '');
      });
    });
  }

  const onClick = (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || locked) return;
    const { act, id } = el.dataset;
    if (act === 'back') return go(-1);
    if (act === 'next') return go(1);
    if (act === 'pick' && q.type === 'single') {
      setAnswer(id);
      root.querySelectorAll('[data-act="pick"]').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
      locked = true;
      setTimeout(() => go(1), reducedMotion() ? 0 : 260);
    }
    if (act === 'pick' && q.type === 'multi') {
      const cur = ctx.store.get().quiz.answers[q.id] ?? [];
      let next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      if (next.length > (q.max ?? 99)) next = next.slice(1); // больше лимита — самый ранний выбор уступает место
      setAnswer(next);
      ctx.nav('quiz', { force: true, keepScroll: true });
    }
    if (act === 'add' || act === 'unpick') {
      const cur = ctx.store.get().quiz.answers[q.id] ?? [];
      const next = act === 'add' ? [...cur, id].slice(0, q.max ?? 3) : cur.filter((x) => x !== id);
      setAnswer(next);
      ctx.nav('quiz', { force: true, keepScroll: true });
      if (act === 'add') root.querySelector('[data-slot="search"]')?.focus();
    }
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
