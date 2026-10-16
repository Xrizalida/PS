// Карточка рекомендованного аромата. Стиль — как у карточки Lalique Encre Noire из прототипа:
// крупное название, атмосферный текст, небольшие категории, спокойная иерархия. Без фотографий.

import { esc, pad2 } from '../app/dom.js';

const NOTE_LEVELS = { top: 'Верх', heart: 'Сердце', base: 'База', single: 'Ноты' };

export function renderPerfumeCard({ result, explanation, index, data, saved, comparing }) {
  const p = result.perfume;
  const label = (list, id) => data.dimensions[list].find((x) => x.id === id)?.label ?? id;
  const notes = Object.entries(NOTE_LEVELS)
    .filter(([k]) => p.notes[k]?.length)
    .map(([k, l]) => `<li><span class="muted">${l}:</span> ${esc(p.notes[k].join(', '))}</li>`)
    .join('');
  const d = explanation.discovery;
  return `
  <article class="perfume-card${result.isDiscovery ? ' perfume-card--discovery' : ''}" data-reveal style="--i:${index}">
    <div class="perfume-card__top">
      <span class="perfume-card__index">PS. / ${pad2(index + 1)}</span>
      ${result.isDiscovery ? '<span class="badge badge--discovery">Ароматическое открытие PS</span>' : ''}
      <span class="badge badge--match">${esc(result.label)}</span>
      <span class="badge">${esc(label('families', p.family))}</span>
    </div>
    <div>
      <p class="perfume-card__brand">${esc(p.brand)}</p>
      <h2 class="perfume-card__name">${esc(p.name)}</h2>
      <p class="perfume-card__meta">${esc(p.concentration)}${p.year ? ` · ${p.year}` : ''} · ${esc(label('genders', p.gender))} · ${esc(label('segments', p.segment))}${p.lux ? ', дорогой' : ''}</p>
    </div>
    ${p.texts?.atmosphere ? `<p class="perfume-card__atmosphere">${esc(p.texts.atmosphere)}</p>` : ''}
    ${d ? `
    <div class="discovery-box">
      <p class="perfume-card__label">Почему это неожиданно</p>
      <p>${esc(d.unexpected)}</p>
      ${d.anyway ? `<p>${esc(d.anyway)}</p>` : ''}
      ${d.risk ? `<p><span class="muted">Что может не понравиться:</span> ${esc(d.risk)}</p>` : ''}
      ${d.tryFirst ? `<p>${esc(d.tryFirst)}</p>` : ''}
    </div>` : ''}
    <div class="perfume-card__section">
      <p class="perfume-card__label">Почему подходит тебе</p>
      ${explanation.why.length ? explanation.why.map((w) => `<p>${esc(w)}</p>`).join('') : '<p class="muted">Близок к твоему профилю по общему характеру.</p>'}
    </div>
    <div class="perfume-card__section">
      <p class="perfume-card__label">Как он пахнет</p>
      ${p.texts?.smells ? `<p>${esc(p.texts.smells)}</p>` : ''}
      <ul class="perfume-card__list">${notes}</ul>
    </div>
    ${explanation.warnings.length ? `
    <div class="perfume-card__section">
      <p class="perfume-card__label">Что может не понравиться</p>
      ${explanation.warnings.map((w) => `<div class="warning"><span aria-hidden="true">!</span><span>${esc(w)}</span></div>`).join('')}
    </div>` : ''}
    <div class="perfume-card__section">
      <p class="perfume-card__label">Когда носить</p>
      ${p.texts?.whenToWear ? `<p>${esc(p.texts.whenToWear)}</p>` : ''}
      <div class="chips">${(p.seasons ?? []).map((s) => `<span class="chip">${esc(label('seasons', s))}</span>`).join('')}</div>
    </div>
    <div class="perfume-card__section">
      <p class="perfume-card__label">Где купить</p>
      <div class="offer-row"><span>Полноразмерный флакон</span><span class="muted">Уточнить цену в магазине</span></div>
      <div class="offer-row"><span>Отливант 5 или 10 мл</span><span class="muted">Предложения появятся на следующем этапе</span></div>
    </div>
    <div class="perfume-card__actions">
      <button class="btn ${saved ? 'btn--primary' : 'btn--ghost'}" type="button" data-action="save" data-id="${esc(p.id)}" aria-pressed="${saved}">${saved ? '♥ Сохранено' : '♡ Сохранить'}</button>
      <button class="btn btn--ghost" type="button" data-action="compare" data-id="${esc(p.id)}" aria-pressed="${comparing}">${comparing ? 'В сравнении' : 'Сравнить'}</button>
    </div>
  </article>`;
}
