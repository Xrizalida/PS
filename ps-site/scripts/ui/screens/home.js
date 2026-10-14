// Главная: первое впечатление → «Что такое PS» → выбор пола (три секции одной страницы).

import { composition } from '../art.js';
import { observeReveal, afterTransition } from '../../app/dom.js';

export function render({ state }) {
  return `
  <section class="hero-screen" aria-labelledby="hero-title">
    <div class="hero-screen__art" aria-hidden="true">
      ${composition('arches', 'hero', { count: 6, depth: 9, guides: 5 })}
    </div>
    <div class="container hero-screen__inner">
      <div class="hero-screen__brand" data-reveal style="--i:0">
        <span class="hero-screen__mark">PS.</span>
        <span class="hero-screen__caption">PARFUM SELECTION</span>
      </div>
      <h1 id="hero-title" class="hero-screen__title" data-reveal style="--i:1">Не выбирай ноты.<br /><em>Выбирай ощущения.</em></h1>
      <p class="hero-screen__lead" data-reveal style="--i:2">Расскажи, как ты хочешь пахнуть. Мы найдём аромат, который передаст это настроение.</p>
      <div class="hero-screen__actions" data-reveal style="--i:3">
        <button class="btn btn--primary" type="button" data-action="start">Начать подбор</button>
        <button class="btn btn--text" type="button" data-action="story">Узнать, как это работает</button>
      </div>
    </div>
    <button class="scroll-hint" type="button" data-action="story" aria-label="Листать вниз">Листай вниз <span aria-hidden="true">↓</span></button>
  </section>

  <section class="story" id="story" aria-labelledby="story-title">
    <div class="story__art" data-reveal aria-hidden="true">${composition('rings', 'story', { count: 6, step: 18, cx: 0.5 })}</div>
    <div class="container story__inner">
      <p class="eyebrow" data-reveal>Что такое PS</p>
      <h2 id="story-title" class="story__title" data-reveal>У каждого запаха есть история.</h2>
      <p class="story__text" data-reveal>Иногда это прохладное утро. Иногда — человек, которого хочется вспомнить. Иногда — ощущение, которому сложно подобрать слова.</p>
      <p class="story__accent" data-reveal>PS помогает превратить эти ощущения в реальные ароматы.</p>
      <ol class="steps">
        <li class="steps__item" data-reveal><span class="steps__num">01 — Почувствуй</span><span>Выбери атмосферу, которая тебе близка.</span></li>
        <li class="steps__item" data-reveal><span class="steps__num">02 — Расскажи</span><span>Укажи предпочтения и то, чего хотелось бы избежать.</span></li>
        <li class="steps__item" data-reveal><span class="steps__num">03 — Открой</span><span>Получи реальные ароматы с объяснением выбора.</span></li>
      </ol>
    </div>
  </section>

  <section class="gender-screen" id="choose-gender" aria-labelledby="gender-title">
    <div class="container">
      <div class="step-head" data-reveal>
        <p class="eyebrow">Начнём</p>
        <h2 id="gender-title" class="step-head__title">Для кого подбираем аромат?</h2>
        <p class="step-head__hint">Это меняет оформление, образы и подсказки, но не запрещает ароматы другой категории.</p>
      </div>
      <div class="gender-grid" data-reveal>
        ${genderCard('male', 'Мужчина', 'Холодная элегантность, камень, архитектура', state.gender)}
        ${genderCard('female', 'Женщина', 'Тёплый свет, фарфор, мягкие контуры', state.gender)}
      </div>
      <label class="toggle-row" data-reveal>
        <input type="checkbox" data-action="include-other" ${state.includeOther ? 'checked' : ''} />
        <span>Показывать также ароматы вне выбранной категории</span>
      </label>
    </div>
  </section>`;
}

function genderCard(gender, title, text, current) {
  const art =
    gender === 'male'
      ? composition('perspective', 'gender-male', { frame: true, floors: 4, vx: 0.5 })
      : composition('rings', 'gender-female', { count: 6, step: 16, cx: 0.55 });
  return `
  <button type="button" class="gender-card" data-theme="${gender}" data-action="gender" data-gender="${gender}" aria-pressed="${current === gender}">
    <span class="gender-card__art" aria-hidden="true">${art}</span>
    <span class="gender-card__body">
      <span class="gender-card__title">${title}</span>
      <span class="gender-card__text">${text}</span>
      <span class="gender-card__cta">Выбрать <span aria-hidden="true">→</span></span>
    </span>
  </button>`;
}

export function mount(root, ctx) {
  const stop = observeReveal(root);
  if (ctx.route === 'gender') {
    requestAnimationFrame(() => root.querySelector('#choose-gender')?.scrollIntoView({ block: 'start' }));
  }
  const onClick = async (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    if (action === 'start') root.querySelector('#choose-gender').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (action === 'story') root.querySelector('#story').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (action === 'gender') {
      const gender = el.dataset.gender;
      root.querySelectorAll('.gender-card').forEach((c) => c.setAttribute('aria-pressed', String(c === el)));
      el.classList.add('is-chosen');
      ctx.store.update((s) => ({ ...s, gender }));
      await afterTransition(el, 480);
      ctx.nav('method');
    }
  };
  const onChange = (e) => {
    if (e.target.matches('[data-action="include-other"]')) ctx.store.update((s) => ({ ...s, includeOther: e.target.checked }));
  };
  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  return () => {
    stop();
    root.removeEventListener('click', onClick);
    root.removeEventListener('change', onChange);
  };
}
