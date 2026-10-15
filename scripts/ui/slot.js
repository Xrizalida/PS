// Место под фото. Пока src нет — тёмная тональная заглушка с одной тонкой линией (вариант А).
// Фото подключается только из своей папки ps-2.0/images (см. IMAGE_MANIFEST.md), внешних адресов нет.

import { esc } from '../core/dom.js';

const SAFE_SRC = /^images\/[a-z0-9/_.-]+\.(webp|jpe?g|png)$/i;

export function slot({ tone = 'graphite', motif = 'frame', src = null, srcWide = null, alt = '', ratio = null, cls = '' } = {}) {
  const ok = src && SAFE_SRC.test(src);
  const img = ok
    ? srcWide && SAFE_SRC.test(srcWide)
      ? `<picture><source media="(min-width: 900px)" srcset="${esc(srcWide)}"><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async"></picture>`
      : `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async">`
    : '';
  const style = ratio ? ` style="--ratio:${ratio}"` : '';
  return `<div class="slot slot--${motif}${ok ? ' has-img' : ''} ${cls}" data-tone="${tone}"${style}${ok ? '' : ' aria-hidden="true"'}>${img}</div>`;
}
