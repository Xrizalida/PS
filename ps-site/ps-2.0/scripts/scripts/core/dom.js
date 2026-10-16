// Мелкие помощники PS 2.0.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const pad2 = (n) => String(n).padStart(2, '0');

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Русское множественное число: plural(5, ['аромат', 'аромата', 'ароматов']).
export function plural(n, forms) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

export function toast(message) {
  let host = document.getElementById('toast');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast';
    host.className = 'toast';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.append(host);
  }
  host.textContent = message;
  host.classList.add('is-shown');
  clearTimeout(host._t);
  host._t = setTimeout(() => host.classList.remove('is-shown'), 2600);
}

// Тонкие линейные иконки (stroke = currentColor).
const svg = (d, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${d}</svg>`;

export const icons = {
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  back: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  heart: svg('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
  heartFill: svg('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="currentColor"/>'),
  settings: svg('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'),
  nope: svg('<path d="M7 7l10 10M17 7L7 17"/>'),
  maybe: svg('<path d="M12 5l7 7-7 7-7-7z"/>'),
  like: svg('<path d="M12 19s-6-3.8-6-8.6A3.4 3.4 0 0 1 12 8.2a3.4 3.4 0 0 1 6 2.2c0 4.8-6 8.6-6 8.6z"/>'),
  chevron: svg('<path d="M9 6l6 6-6 6"/>'),
  check: svg('<path d="M6 12.5l4 4 8-9"/>', ' stroke-width="2.2"'),
};

// Крупные иконки кнопок под карточками «по одной»: толще линии, понятны без подписей.
const bold = (d, w = 2.4) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const deckIcons = {
  nope: bold('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>', 2.6),
  maybe: bold('<circle cx="12" cy="12" r="8.6" stroke-width="1.6"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2.9-1.2 1.8"/><path d="M12 16.6h.01" stroke-width="2.8"/>', 2.1),
  like: bold('<path d="M12 19.5s-7.2-4.4-7.2-10.1A4 4 0 0 1 12 7.1a4 4 0 0 1 7.2 2.3c0 5.7-7.2 10.1-7.2 10.1z"/>', 2.3),
};
