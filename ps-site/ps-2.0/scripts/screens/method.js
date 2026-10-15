// Способ подбора: «По ощущениям» или «По анкете». Две большие карточки — фирменный элемент PS.

import { icons, esc } from '../core/dom.js';
import { slot } from '../ui/slot.js';

// Примеры для выбора языка — прямо из словаря нот, чтобы разница была понятна сразу.
function langExamples(ctx, lang) {
  return ['ладан', 'ирис'].map((note) => {
    const e = ctx.glossary.lookup(note);
    if (!e) return '';
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    // «Нотами»: термин из словаря уже начинается с названия («ладан (олибанум): …») — не повторяем его.
    const [term, ...rest] = lang === 'expert' && e.expert.includes(':') ? e.expert.split(':') : [note, lang === 'expert' ? e.expert : e.plain];
    return `<b>${esc(cap(term.trim()))}</b> — ${esc(rest.join(':').trim())}`;
  }).filter(Boolean).join('<br>');
}

const LEAD = 'Оба пути приводят к короткому списку с объяснением. Можно вернуться и попробовать другой.';

const photo = (m, tone) => slot({ tone, motif: 'circle', src: m?.src, srcset: m?.srcset, alt: m?.alt, focus: m?.focus, sizes: '(min-width: 720px) 50vw, 50vw', priority: true });

export function render(ctx) {
  const { method, gender } = ctx.state;
  const media = ctx.display.media.method ?? {};
  const tone = gender === 'female' ? 'powder' : 'steel';
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
          ${photo(media.moods, tone)}
          <span class="bigcard__veil"></span>
          <span class="bigcard__num">01</span>
          <span class="bigcard__arrow">${icons.arrow}</span>
          <span class="bigcard__title display">По ощущениям</span>
          <span class="bigcard__text">Выбери образы, которые откликаются</span>
          <span class="bigcard__meta">около минуты</span>
        </button>
        <button type="button" class="bigcard" data-method="quiz" aria-pressed="${method === 'quiz'}">
          ${photo(media.quiz, tone)}
          <span class="bigcard__veil"></span>
          <span class="bigcard__num">02</span>
          <span class="bigcard__arrow">${icons.arrow}</span>
          <span class="bigcard__title display">По анкете</span>
          <span class="bigcard__text">Простые вопросы без терминов</span>
          <span class="bigcard__meta">3, 6 или 9 вопросов</span>
        </button>
      </div>

      <section class="langpick" aria-labelledby="langpick-title">
        <h2 class="display h3" id="langpick-title">Как тебе удобнее читать об ароматах?</h2>
        <p class="muted small">Выбери комфортный язык описаний. Это меняет объяснения, но не влияет на подбор.</p>
        <div class="langpick__opts" role="group" aria-label="Язык описаний">
          ${[['plain', 'Без терминов'], ['expert', 'На языке нот']].map(([id, title]) => `<button type="button" class="langopt" data-lang="${id}" aria-pressed="${ctx.state.lang === id}">
            <span class="langopt__head"><span class="langopt__title">${title}</span><span class="opt__mark" aria-hidden="true"></span></span>
            <span class="langopt__ex">${langExamples(ctx, id)}</span>
          </button>`).join('')}
        </div>
        <p class="small muted">Поменять можно в любой момент: в настройках (значок в шапке) или в карточке аромата.</p>
      </section>
    </div>
  </section>`;
}

export function mount(root, ctx) {
  const onClick = (e) => {
    const el = e.target.closest('[data-act], [data-method], [data-lang]');
    if (!el) return;
    if (el.dataset.lang) return ctx.setLang(el.dataset.lang); // не обязательный шаг: можно сразу выбирать способ
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
