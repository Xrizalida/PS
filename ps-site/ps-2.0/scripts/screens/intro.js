// Вступление: три сцены со «прилипающей» картинкой и сменой текста по ходу прокрутки, затем выбор пола.
// Прокрутка естественная: ничего не перехватываем, только читаем её положение.

import { esc, icons, clamp, reducedMotion } from '../core/dom.js';
import { slot } from '../ui/slot.js';

const SCENES = [
  { eyebrow: 'PS. — Parfum Selection', title: 'Не выбирай ноты. Выбирай ощущения.', lead: 'Подбор аромата по настроению.' },
  { eyebrow: 'Знакомо?', title: 'Сто флаконов — и все похожи.', lead: 'Названия нот почти ничего не объясняют.' },
  { eyebrow: 'Как работает PS', title: 'Мы начинаем с ощущения.', lead: 'Выбери образы или ответь на пару вопросов — PS подберёт ароматы и объяснит выбор.' },
];

export function render(ctx) {
  const media = ctx.display.media;
  const g = ctx.state.gender;
  const genderCard = (id, i, title, text) => {
    const m = media.gender[id];
    return `
    <button type="button" class="bigcard" data-gender="${id}" aria-pressed="${g === id}">
      ${slot({ tone: m.tone, motif: m.motif, src: m.src, srcset: m.srcset, focus: m.focus, alt: m.alt, sizes: '(min-width: 720px) 50vw, 100vw' })}
      <span class="bigcard__veil"></span>
      <span class="bigcard__num">0${i}</span>
      <span class="bigcard__arrow">${icons.arrow}</span>
      <span class="bigcard__title display">${title}</span>
      <span class="bigcard__text">${text}</span>
    </button>`;
  };
  return `
  <section class="story" data-story style="--scenes:${SCENES.length}" aria-label="О PS">
    <div class="story__stage">
      ${SCENES.map((s, i) => {
        const m = media.intro[i];
        return `
        <div class="scene" data-scene="${i}">
          <div class="scene__media">${slot({ tone: m.tone, motif: m.motif, src: m.src, srcWide: m.srcWide, alt: m.alt, priority: i === 0 })}</div>
          <div class="scene__veil"></div>
          <div class="scene__text">
            <div class="wrap">
              <p class="eyebrow">${esc(s.eyebrow)}</p>
              ${i === 0 ? `<h1 class="display scene__title">${esc(s.title)}</h1>` : `<h2 class="display scene__title">${esc(s.title)}</h2>`}
              <p class="scene__lead">${esc(s.lead)}</p>
            </div>
          </div>
        </div>`;
      }).join('')}
      <div class="story__ui">
        <div class="wrap">
          <div class="story__bars" aria-hidden="true">${SCENES.map(() => '<span class="story__bar"><i></i></span>').join('')}</div>
          <span class="story__hint" aria-hidden="true">Листай</span>
          <button type="button" class="btn btn--ghost btn--sm" data-act="skip">Сразу к подбору ${icons.arrow}</button>
        </div>
      </div>
    </div>
  </section>

  <section class="choose" id="choose" aria-labelledby="choose-title">
    <div class="wrap">
      <div class="head">
        <p class="eyebrow">Шаг 1</p>
        <h2 class="display h2" id="choose-title">Для кого подбираем?</h2>
        <p class="lead">Унисекс попадает в обе подборки.</p>
      </div>
      <div class="bigcards bigcards--choose">
        ${genderCard('male', 1, 'Мужское', 'Дерево, кожа, прохлада, вечерний город')}
        ${genderCard('female', 2, 'Женское', 'Ткани, тёплый свет, цветы, пудра')}
      </div>
    </div>
  </section>`;
}

export function mount(root, ctx) {
  const story = root.querySelector('[data-story]');
  const scenes = [...story.querySelectorAll('.scene')];
  const bars = [...story.querySelectorAll('.story__bar i')];
  const hint = story.querySelector('.story__hint');
  const N = scenes.length;
  const still = reducedMotion();
  if (still) {
    story.classList.add('is-static');
    document.documentElement.style.setProperty('--decor-o', '0.8'); // без анимации — декор просто виден
  }

  // Прогресс прокрутки 0..1 → видимость каждой сцены, сдвиг текста, лёгкое отдаление картинки.
  const update = () => {
    const total = story.offsetHeight - window.innerHeight;
    const p = total > 0 ? clamp((window.scrollY - story.offsetTop) / total, 0, 1) : 0;
    const s = p * N;
    scenes.forEach((el, i) => {
      let d = s - (i + 0.5);
      if (i === 0 && d < 0) d = 0;
      if (i === N - 1 && d > 0) d = 0;
      const ad = Math.abs(d);
      // Картинка: каждая следующая сцена лежит поверх предыдущей и проявляется на стыке — настоящий crossfade без «провала» в тёмное.
      el.style.setProperty('--o', (i === 0 ? 1 : clamp((s - i + 0.18) / 0.36, 0, 1)).toFixed(3));
      // Текст: гаснет до стыка и проявляется после — тексты двух сцен никогда не видны одновременно.
      el.style.setProperty('--to', clamp((0.5 - ad) / 0.2, 0, 1).toFixed(3));
      el.style.setProperty('--d', clamp(d, -0.5, 0.5).toFixed(3));
      el.style.setProperty('--z', (1.06 - (clamp(s - i, 0, 1)) * 0.05).toFixed(4));
    });
    bars.forEach((b, i) => b.style.setProperty('--f', clamp(s - i, 0, 1).toFixed(3)));
    hint.style.setProperty('--hint', p > 0.04 ? 0 : 1);
    // Боковой декор широких экранов проявляется по мере прокрутки и полностью виден к выбору пути.
    document.documentElement.style.setProperty('--decor-o', clamp((p - 0.1) / 0.55, 0, 1).toFixed(3));
  };

  if (!still) {
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  }

  if (ctx.params.focus === 'choose') {
    setTimeout(() => root.querySelector('#choose')?.scrollIntoView({ block: 'start' }), 0);
  }

  const onClick = (e) => {
    const el = e.target.closest('[data-act], [data-gender]');
    if (!el) return;
    if (el.dataset.act === 'skip') {
      if (ctx.store.get().gender) return ctx.nav('method');
      root.querySelector('#choose').scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    }
    if (el.dataset.gender) {
      const gender = el.dataset.gender;
      root.querySelectorAll('[data-gender]').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
      ctx.store.update((s) => ({ ...s, gender }));
      // Короткая пауза, чтобы было видно, как палитра перетекает в выбранный режим.
      setTimeout(() => ctx.nav('method'), still ? 0 : 420);
    }
  };
  root.addEventListener('click', onClick);
  return () => {
    window.removeEventListener('scroll', update);
    window.removeEventListener('resize', update);
    root.removeEventListener('click', onClick);
  };
}
