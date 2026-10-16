// Подборка: карточки или краткий список, быстрые уточнения с мгновенным пересчётом, «углубить подбор».

import { esc, icons, plural } from '../core/dom.js';
import { runSelection } from '../core/run.js';
import { questionsForTier, activeTier, TIER_ORDER } from '../core/request.js';
import { TIERS, FREE_NOTE, BUDGETS, stopLabel, profileWords, quoteList } from '../core/format.js';
import { perfumeCard, perfumeRow, handleAct, openCompare } from '../ui/perfume.js';
import { openSheet } from '../ui/sheet.js';
import { stopsChips, budgetSeg } from './finish.js';

export function render() {
  return `<section class="screen"><div class="wrap" data-slot="res"></div><div class="dock dock--glass" data-slot="cmp" hidden></div></section>`;
}

export function mount(root, ctx) {
  const slotRes = root.querySelector('[data-slot="res"]');
  const slotCmp = root.querySelector('[data-slot="cmp"]');
  let run = null;

  // animate = false — когда меняется только отметка «сохранено» или «сравнить»: карточки не мигают заново.
  const paint = ({ animate = true } = {}) => {
    slotRes.classList.toggle('no-anim', !animate);
    const s = ctx.store.get();
    run = runSelection(s, ctx);
    const tier = activeTier(s);
    const tierInfo = TIERS.find((t) => t.id === tier);
    const n = run.items.length;
    const moodsWay = s.method === 'moods';
    const moodTitles = moodsWay ? s.moods[s.gender].liked.map((id) => ctx.moodsFor(s.gender).find((m) => m.id === id)?.title).filter(Boolean) : [];
    // До 7 образов: в подзаголовке три главных и «ещё N», чтобы строка не разрасталась.
    const shown = moodTitles.slice(0, 3);
    const more = moodTitles.length - shown.length;
    const sub = moodsWay && moodTitles.length
      ? `Под ${more ? `${shown.map((t) => `«${t}»`).join(', ')} и ещё ${more}` : quoteList(shown)}`
      : profileWords(run.profile).join(' · ');
    const title = n ? `${n} ${plural(n, ['аромат', 'аромата', 'ароматов'])} для тебя` : 'Пока ничего близкого';

    const refineChips = [
      `<span class="chip chip--static">бюджет: ${esc((BUDGETS.find((b) => b.id === s.finish.budget)?.label ?? 'Не важно').toLowerCase())}</span>`,
      ...s.finish.stops.slice(0, 3).map((id) => `<span class="chip chip--static">без: ${esc(stopLabel(id).toLowerCase())}</span>`),
      s.finish.stops.length > 3 ? `<span class="chip chip--static">ещё ${s.finish.stops.length - 3}</span>` : '',
    ].join('');

    const list = s.resultView === 'list'
      ? `<ul class="plist">${run.items.map((it, i) => perfumeRow(it, i, ctx)).join('')}</ul>`
      : `<div class="pgrid">${run.items.map((it, i) => perfumeCard(it, i, ctx)).join('')}</div>`;

    const shortfall = n > 0 && n < run.wanted
      ? `<p class="note note--box">Близких ароматов нашлось ${n} — остальные слишком далеки от запроса.</p>`
      : '';

    const empty = n === 0 ? `
      <div class="empty">
        <p class="lead">Попробуй убрать одно ограничение:</p>
        <div class="chips">
          ${s.finish.budget !== 'any' ? '<button type="button" class="chip" data-act="relax-budget">Бюджет — не важно</button>' : ''}
          ${s.finish.stops.length ? '<button type="button" class="chip" data-act="relax-stops">Снять «не нравится»</button>' : ''}
          <button type="button" class="chip" data-act="edit">Изменить ответы</button>
        </div>
      </div>` : '';

    // Углубить подбор: больше ароматов через уровни EDP и Le Parfum.
    const nextTiers = TIER_ORDER.slice(TIER_ORDER.indexOf(tier) + 1).map((id) => TIERS.find((t) => t.id === id));
    let deeper = '';
    if (n > 0 && nextTiers.length) {
      if (moodsWay) {
        deeper = `
        <div class="deeper">
          <p class="display h3">Хочешь больше вариантов?</p>
          <div class="deeper__actions">${nextTiers.map((t) => `<button type="button" class="btn btn--ghost" data-act="deeper" data-tier="${t.id}">До ${ctx.config.tiers[t.id].results} · ${esc(t.name)}</button>`).join('')}</div>
          <p class="small muted">${esc(nextTiers.map((t) => `${t.name} — ${t.price}`).join(', '))} · ${FREE_NOTE}</p>
        </div>`;
      } else {
        const t = nextTiers[0];
        const extra = questionsForTier(ctx.questions, t.id).length - questionsForTier(ctx.questions, tier).length;
        deeper = `
        <div class="deeper">
          <p class="display h3">Ещё ${extra} ${plural(extra, ['вопрос', 'вопроса', 'вопросов'])} — до ${ctx.config.tiers[t.id].results} ароматов</p>
          <div class="deeper__actions"><button type="button" class="btn btn--ghost" data-act="deeper-quiz" data-tier="${t.id}">Продолжить · ${esc(t.name)}</button></div>
          <p class="small muted">${esc(t.price)} · ${FREE_NOTE}</p>
        </div>`;
      }
    }

    // Тонкая настройка — уровень Le Parfum.
    const tuning = tier === 'parfum' && n > 0 ? `
      <div class="block" style="margin-top:24px">
        <p class="eyebrow">Тонкая настройка · Le Parfum</p>
        <div class="chips">${ctx.config.tuning.map((t) => `<button type="button" class="chip" data-act="tune" data-id="${t.id}" aria-pressed="${s.tuning.includes(t.id)}">${esc(t.label)}</button>`).join('')}</div>
      </div>` : '';

    slotRes.innerHTML = `
      <button type="button" class="back" data-act="edit">${icons.back} Изменить ответы</button>
      <header class="res-head">
        <p class="eyebrow">${esc(tierInfo.name)} · ${moodsWay ? 'по ощущениям' : 'по анкете'}</p>
        <h1 class="display h2">${esc(title)}</h1>
        ${sub ? `<p class="lead">${esc(sub)}</p>` : ''}
      </header>
      <div class="res-tools">
        <div class="res-refine">${refineChips}<button type="button" class="btn btn--text" data-act="refine">Изменить</button></div>
        ${n ? `<div class="seg" role="group" aria-label="Вид подборки">
          <button type="button" class="seg__btn" data-act="viewmode" data-view="cards" aria-pressed="${s.resultView !== 'list'}">Карточки</button>
          <button type="button" class="seg__btn" data-act="viewmode" data-view="list" aria-pressed="${s.resultView === 'list'}">Список</button>
        </div>` : ''}
      </div>
      ${empty}${n ? list : ''}${shortfall}${tuning}${deeper}
      <p class="note">Цены ориентировочные.</p>
      <div class="chips" style="margin-top:14px"><button type="button" class="chip" data-act="restart">Начать заново</button></div>`;
    paintCompare();
  };

  const paintCompare = () => {
    const c = ctx.store.get().compare.length;
    slotCmp.hidden = c === 0;
    document.documentElement.style.setProperty('--tray', c ? '76px' : '0px');
    slotCmp.innerHTML = c ? `<div class="wrap dock__inner"><span class="tray__count" style="flex:1">В сравнении: ${c}</span><button type="button" class="btn btn--primary btn--sm" data-act="open-compare" ${c < 2 ? 'disabled' : ''}>Сравнить</button></div>` : '';
  };

  const set = (fn) => { ctx.store.update(fn); paint(); };

  const openRefine = () => {
    const html = () => {
      const s = ctx.store.get();
      return `<div class="head"><p class="eyebrow">Уточнения</p><h2 class="display h3">Подборка пересчитывается сразу</h2></div>
        <div class="block"><p class="eyebrow">Бюджет на флакон</p>${budgetSeg(s.finish.budget)}</div>
        <div class="block"><p class="eyebrow">Что точно не нравится</p><div class="chips">${stopsChips(s.finish.stops, true)}</div></div>`;
    };
    openSheet({
      title: 'Уточнения',
      html: html(),
      foot: '<button type="button" class="btn btn--primary btn--block" data-sheet-close>Готово</button>',
      onMount: (panel) => panel.addEventListener('click', (e) => {
        const el = e.target.closest('[data-act]');
        if (!el) return;
        const { act, id } = el.dataset;
        if (act === 'budget') set((s) => ({ ...s, finish: { ...s.finish, budget: id } }));
        if (act === 'stop') set((s) => ({ ...s, finish: { ...s.finish, stops: s.finish.stops.includes(id) ? s.finish.stops.filter((x) => x !== id) : [...s.finish.stops, id] } }));
        panel.querySelector('.sheet__body').innerHTML = html();
      }),
    });
  };

  const onClick = (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const { act, id } = el.dataset;
    const s = ctx.store.get();
    if (act === 'edit') return ctx.nav(s.method === 'moods' ? 'moods' : 'quiz');
    if (act === 'refine') return openRefine();
    if (act === 'viewmode') return set((st) => ({ ...st, resultView: el.dataset.view }));
    if (act === 'relax-budget') return set((st) => ({ ...st, finish: { ...st.finish, budget: 'any' } }));
    if (act === 'relax-stops') return set((st) => ({ ...st, finish: { ...st.finish, stops: [] } }));
    if (act === 'tune') return set((st) => ({ ...st, tuning: st.tuning.includes(id) ? st.tuning.filter((x) => x !== id) : [...st.tuning, id] }));
    if (act === 'deeper') {
      set((st) => ({ ...st, resultTier: el.dataset.tier }));
      return slotRes.querySelector('.res-head')?.scrollIntoView({ block: 'start' });
    }
    if (act === 'deeper-quiz') {
      const from = questionsForTier(ctx.questions, s.tier).length;
      ctx.store.update((st) => ({ ...st, tier: el.dataset.tier, quiz: { ...st.quiz, index: from } }));
      return ctx.nav('quiz');
    }
    if (act === 'open-compare') return openCompare(ctx);
    if (act === 'restart') {
      ctx.store.update((st) => ({ ...st, moods: { ...st.moods, [st.gender]: { liked: [], maybe: [], rejected: [] } }, quiz: { answers: {}, index: 0 }, resultTier: 'edt', tuning: [], finish: { budget: 'any', stops: [] } }));
      return ctx.nav('method');
    }
    if (['open', 'save', 'compare'].includes(act)) {
      const item = run.items.find((it) => it.id === id) ?? null;
      handleAct(act, id, ctx, item);
      if (act !== 'open') paint({ animate: false });
    }
  };

  const unsub = ctx.store.subscribe(() => paintCompare());
  root.addEventListener('click', onClick);
  paint();
  return () => {
    unsub();
    root.removeEventListener('click', onClick);
    document.documentElement.style.setProperty('--tray', '0px');
  };
}
