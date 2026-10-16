// Мелкие помощники для работы со страницей.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const pad2 = (n) => String(n).padStart(2, '0');

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Ожидание конца анимации (или сразу, если анимации отключены).
export function afterTransition(el, ms) {
  if (prefersReducedMotion()) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Плавное появление элементов при прокрутке: класс is-visible добавляется один раз.
export function observeReveal(root) {
  const items = root.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window) || prefersReducedMotion()) {
    items.forEach((el) => el.classList.add('is-visible'));
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.18 },
  );
  items.forEach((el) => io.observe(el));
  return () => io.disconnect();
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
