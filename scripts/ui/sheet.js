// Панель поверх экрана: на телефоне выезжает снизу (закрывается свайпом вниз), на компьютере — справа.
// Escape закрывает, фокус остаётся внутри и возвращается туда, откуда панель открыли.

import { icons, reducedMotion } from '../core/dom.js';

let current = null;
const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function openSheet({ title, html, foot = '', wide = false, onMount }) {
  closeSheet(true);
  const opener = document.activeElement;
  const root = document.createElement('div');
  root.className = `sheet${wide ? ' sheet--wide' : ''}`;
  root.innerHTML = `
    <div class="sheet__backdrop" data-sheet-close></div>
    <div class="sheet__panel" role="dialog" aria-modal="true" aria-label="${title.replace(/"/g, '&quot;')}">
      <div class="sheet__grip" aria-hidden="true"></div>
      <button type="button" class="icon-btn sheet__close" data-sheet-close aria-label="Закрыть">${icons.close}</button>
      <div class="sheet__body">${html}</div>
      ${foot ? `<div class="sheet__foot">${foot}</div>` : ''}
    </div>`;
  document.body.append(root);
  document.body.classList.add('has-sheet');
  // Таймер вместо requestAnimationFrame: панель гарантированно откроется и во фоновой вкладке.
  setTimeout(() => root.classList.add('is-open'), 20);

  const panel = root.querySelector('.sheet__panel');
  const onKey = (e) => {
    if (e.key === 'Escape') closeSheet();
    if (e.key === 'Tab') {
      const f = [...panel.querySelectorAll(FOCUSABLE)];
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    }
  };
  root.addEventListener('click', (e) => { if (e.target.closest('[data-sheet-close]')) closeSheet(); });
  document.addEventListener('keydown', onKey);

  // Свайп вниз за «ручку» закрывает панель на телефоне.
  const grip = root.querySelector('.sheet__grip');
  let drag = null;
  grip.addEventListener('pointerdown', (e) => { drag = { y: e.clientY, dy: 0 }; grip.setPointerCapture(e.pointerId); panel.style.transition = 'none'; });
  grip.addEventListener('pointermove', (e) => {
    if (!drag) return;
    drag.dy = Math.max(0, e.clientY - drag.y);
    panel.style.transform = `translateY(${drag.dy}px)`;
  });
  const end = () => {
    if (!drag) return;
    const { dy } = drag;
    drag = null;
    panel.style.transition = '';
    panel.style.transform = '';
    if (dy > 90) closeSheet();
  };
  grip.addEventListener('pointerup', end);
  grip.addEventListener('pointercancel', end);

  current = { root, opener, onKey, panel };
  onMount?.(panel);
  panel.querySelector('.sheet__close').focus({ preventScroll: true });
  return panel;
}

export function closeSheet(immediate = false) {
  if (!current) return;
  const { root, opener, onKey } = current;
  current = null;
  document.removeEventListener('keydown', onKey);
  document.body.classList.remove('has-sheet');
  root.classList.remove('is-open');
  if (immediate || reducedMotion()) root.remove();
  else setTimeout(() => root.remove(), 380);
  if (!immediate && opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus({ preventScroll: true });
}

export const sheetIsOpen = () => Boolean(current);
