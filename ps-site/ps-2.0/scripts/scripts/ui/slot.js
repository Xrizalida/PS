// Место под фото. Пока src нет — тёмная тональная заглушка с одной тонкой линией (вариант А).
// Фото подключается только из своей папки ps-2.0/images (см. IMAGE_MANIFEST.md), внешних адресов нет.
// Пропорция у слота задана заранее, поэтому фото появляется без скачка вёрстки; при ошибке загрузки остаётся заглушка.

import { esc } from '../core/dom.js';

const SAFE_SRC = /^images\/[a-z0-9/_.-]+\.(webp|avif|jpe?g|png)$/i;
const safeSrcset = (s) => s && s.split(',').every((part) => SAFE_SRC.test(part.trim().split(/\s+/)[0]));

export function slot({ tone = 'graphite', motif = 'frame', src = null, srcset = null, srcWide = null, sizes = '100vw', alt = '', ratio = null, focus = null, priority = false, cls = '' } = {}) {
  const ok = Boolean(src && SAFE_SRC.test(src));
  let img = '';
  if (ok) {
    const load = priority ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
    const set = safeSrcset(srcset) ? ` srcset="${esc(srcset)}" sizes="${esc(sizes)}"` : '';
    const pos = focus ? ` style="object-position:${esc(focus)}"` : '';
    const tag = `<img class="slot__img" src="${esc(src)}"${set} alt="${esc(alt)}" ${load} decoding="async"${pos}>`;
    img = srcWide && SAFE_SRC.test(srcWide) ? `<picture><source media="(min-width: 900px)" srcset="${esc(srcWide)}">${tag}</picture>` : tag;
  }
  const style = ratio ? ` style="--ratio:${ratio}"` : '';
  return `<div class="slot slot--${motif}${ok ? ' has-img' : ''} ${cls}" data-tone="${tone}"${style}${ok ? '' : ' aria-hidden="true"'}>${img}</div>`;
}

// Фото проявляется плавно после загрузки; если файл не открылся — убираем его, остаётся заглушка.
// Уже загруженное фото (из кэша) показывается сразу, без повторного проявления — карточки не мигают.
export function watchSlotImages(doc = document) {
  const instant = (img) => {
    if (img.complete && img.naturalWidth) img.classList.add('is-loaded', 'no-fade');
  };
  new MutationObserver((list) => {
    for (const rec of list) for (const n of rec.addedNodes) {
      if (n.nodeType !== 1) continue;
      if (n.classList?.contains('slot__img')) instant(n);
      n.querySelectorAll?.('.slot__img').forEach(instant);
    }
  }).observe(doc.body, { childList: true, subtree: true });
  doc.addEventListener('load', (e) => {
    if (e.target.classList?.contains('slot__img')) e.target.classList.add('is-loaded');
  }, true);
  doc.addEventListener('error', (e) => {
    const img = e.target;
    if (!img.classList?.contains('slot__img')) return;
    const box = img.closest('.slot');
    (img.closest('picture') ?? img).remove();
    box?.classList.remove('has-img');
  }, true);
}

// Предзагрузка следующих фото (например, в колоде «по одной»).
export function preloadImages(moods) {
  for (const m of moods) {
    const src = m?.image?.src;
    if (src && SAFE_SRC.test(src)) {
      const im = new Image();
      im.decoding = 'async';
      if (safeSrcset(m.image.srcset)) im.srcset = m.image.srcset;
      im.src = src;
    }
  }
}

// Тихая предзагрузка конкретных файлов (например, фото каталога, пока человек на предыдущем экране).
export function prefetch(urls) {
  const run = () => urls.filter((u) => SAFE_SRC.test(u)).forEach((u) => { const im = new Image(); im.decoding = 'async'; im.src = u; });
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 1500 });
  else setTimeout(run, 400);
}