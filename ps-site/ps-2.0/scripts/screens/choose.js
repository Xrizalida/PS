// Выбор «Для кого подбираем?». Один и тот же блок стоит в конце вступления и открывается
// отдельным адресом #/choose — туда ведут «Назад» и браузерное «Назад» со способа подбора,
// чтобы человеку не приходилось заново пролистывать вступление.

import { icons, reducedMotion } from '../core/dom.js';
import { slot } from '../ui/slot.js';

export function chooseSection(ctx, { standalone = false } = {}) {
  const media = ctx.display.media;
  const g = ctx.state.gender;
  const card = (id, i, title, text) => {
    const m = media.gender[id];
    return `
    <button type="button" class="bigcard" data-gender="${id}" aria-pressed="${g === id}">
      ${slot({ tone: m.tone, motif: m.motif, src: m.src, srcset: m.srcset, focus: m.focus, alt: m.alt, sizes: '(min-width: 720px) 50vw, 100vw', priority: standalone })}
      <span class="bigcard__veil"></span>
      <span class="bigcard__num">0${i}</span>
      <span class="bigcard__arrow">${icons.arrow}</span>
      <span class="bigcard__title display">${title}</span>
      <span class="bigcard__text">${text}</span>
    </button>`;
  };
  // Во вступлении главный заголовок страницы — первая сцена, поэтому здесь h2; на отдельном экране — h1.
  const h = standalone ? 'h1' : 'h2';
  return `
  <section class="choose${standalone ? ' choose--screen' : ''}" id="choose" aria-labelledby="choose-title">
    <div class="wrap choose__inner">
      <div class="head">
        <p class="eyebrow">Шаг 1</p>
        <${h} class="display h2" id="choose-title">Для кого подбираем?</${h}>
        <p class="lead">Унисекс попадает в обе подборки.</p>
      </div>
      <div class="bigcards bigcards--choose">
        ${card('male', 1, 'Мужское', 'Дерево, кожа, прохлада, вечерний город')}
        ${card('female', 2, 'Женское', 'Ткани, тёплый свет, цветы, пудра')}
      </div>
    </div>
  </section>`;
}

// Нажатие на карточку: запоминаем пол и идём к выбору способа.
// fromIntro: текущая запись истории (#/) подменяется на #/choose — «Назад» со способа вернёт к выбору, а не к началу вступления.
export function bindChoose(root, ctx, { fromIntro = false } = {}) {
  const onClick = (e) => {
    const el = e.target.closest('[data-gender]');
    if (!el || !root.contains(el)) return;
    const gender = el.dataset.gender;
    root.querySelectorAll('.choose [data-gender]').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
    ctx.store.update((s) => ({ ...s, gender }));
    if (fromIntro) ctx.rememberChoose();
    // Короткая пауза, чтобы было видно, как палитра перетекает в выбранный режим.
    setTimeout(() => ctx.nav('method', { prev: 'choose' }), reducedMotion() ? 0 : 420);
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}

export function render(ctx) {
  return chooseSection(ctx, { standalone: true });
}

export function mount(root, ctx) {
  return bindChoose(root, ctx);
}
