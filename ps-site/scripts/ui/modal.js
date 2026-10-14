// Модальное окно: на компьютере — по центру (fade + scale), на телефоне — панель снизу (bottom-sheet).
// Закрывается по Escape, по фону и кнопке; фокус остаётся внутри и возвращается туда, откуда открыли.

import { prefersReducedMotion } from '../app/dom.js';

let current = null;

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function openModal({ title, html, onMount, wide = false }) {
  closeModal(true);
  const opener = document.activeElement;
  const root = document.createElement('div');
  root.className = 'modal';
  root.innerHTML = `
    <div class="modal__backdrop" data-modal-close></div>
    <div class="modal__panel${wide ? ' modal__panel--wide' : ''}" role="dialog" aria-modal="true" aria-label="${title.replace(/"/g, '&quot;')}">
      <div class="modal__grip" aria-hidden="true"></div>
      <button type="button" class="modal__close" data-modal-close aria-label="Закрыть">×</button>
      <div class="modal__body">${html}</div>
    </div>`;
  document.body.append(root);
  document.body.classList.add('has-modal');
  requestAnimationFrame(() => root.classList.add('is-open'));

  const panel = root.querySelector('.modal__panel');
  const onKey = (e) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Tab') {
      const f = [...panel.querySelectorAll(FOCUSABLE)];
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    }
  };
  root.addEventListener('click', (e) => { if (e.target.closest('[data-modal-close]')) closeModal(); });
  document.addEventListener('keydown', onKey);
  current = { root, opener, onKey };
  onMount?.(panel);
  panel.querySelector('.modal__close').focus();
}

export function closeModal(immediate = false) {
  if (!current) return;
  const { root, opener, onKey } = current;
  current = null;
  document.removeEventListener('keydown', onKey);
  document.body.classList.remove('has-modal');
  root.classList.remove('is-open');
  const remove = () => root.remove();
  if (immediate || prefersReducedMotion()) remove();
  else setTimeout(remove, 280);
  if (opener && typeof opener.focus === 'function') opener.focus();
}
