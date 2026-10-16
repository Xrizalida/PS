// «Каталог образов / Карточки по одной» — главный экран-идентичность PS. Появляется после пола и способа.
// В карточке каталога — 4 фото образов в одной стилистике, в карточке «по одной» — одно фото поверх стопки.
// Какие образы показывать — в data/media.json → feel.

import { icons } from '../core/dom.js';
import { slot, prefetch } from '../ui/slot.js';

const thumb = (m, sizes) => (m
  ? slot({ tone: m.tone, motif: m.motif, src: m.image?.src, srcset: m.image?.srcset, alt: '', focus: m.image?.focus, sizes, priority: true })
  : '<i></i>');

export function render(ctx) {
  const { moodView, gender } = ctx.state;
  const moods = ctx.moodsFor(gender);
  const byId = new Map(moods.map((m) => [m.id, m]));
  const cfg = ctx.display.media.feel?.[gender] ?? {};
  const four = (cfg.catalog ?? []).map((id) => byId.get(id)).filter(Boolean).slice(0, 4);
  const single = byId.get(cfg.single);
  return `
  <section class="screen">
    <div class="wrap">
      <button type="button" class="back" data-act="back">${icons.back} Назад</button>
      <div class="head">
        <p class="eyebrow">По ощущениям</p>
        <h1 class="display h2">Как смотреть образы?</h1>
        <p class="lead">Отмеченное сохранится, если переключишься.</p>
      </div>
      <div class="bigcards">
        <button type="button" class="bigcard bigcard--feel" data-view="catalog" aria-pressed="${moodView === 'catalog'}">
          ${four.length === 4 ? `<span class="feel-mosaic" aria-hidden="true">${four.map((m) => thumb(m, '(min-width: 720px) 25vw, 25vw')).join('')}</span>` : '<span class="schema schema--grid" aria-hidden="true"><i></i><i></i><i></i><i></i></span>'}
          <span class="bigcard__veil"></span>
          <span class="bigcard__num">01</span>
          <span class="bigcard__arrow">${icons.arrow}</span>
          <span class="bigcard__title display">Каталог образов</span>
          <span class="bigcard__text">Все образы на одном экране</span>
        </button>
        <button type="button" class="bigcard bigcard--feel" data-view="swipe" aria-pressed="${moodView === 'swipe'}">
          ${single ? `${thumb(single, '(min-width: 720px) 50vw, 50vw')}<span class="feel-stack" aria-hidden="true"></span>` : '<span class="schema schema--stack" aria-hidden="true"><i></i><i></i><i></i></span>'}
          <span class="bigcard__veil"></span>
          <span class="bigcard__num">02</span>
          <span class="bigcard__arrow">${icons.arrow}</span>
          <span class="bigcard__title display">Карточки по одной</span>
          <span class="bigcard__text">Свайп: нравится или нет</span>
        </button>
      </div>
    </div>
  </section>`;
}

export function mount(root, ctx) {
  // Пока человек выбирает вид, тихо подгружаем фото каталога (маленький размер) — каталог откроется без ожидания.
  prefetch(ctx.moodsFor(ctx.state.gender).map((m) => m.image?.srcset?.split(',')[0].trim().split(' ')[0]).filter(Boolean));
  const onClick = (e) => {
    const el = e.target.closest('[data-act], [data-view]');
    if (!el) return;
    if (el.dataset.act === 'back') return ctx.nav('method');
    if (el.dataset.view) {
      const moodView = el.dataset.view;
      ctx.store.update((s) => ({ ...s, moodView }));
      ctx.nav('moods');
    }
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
