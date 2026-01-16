(() => {
  if (window.__IMG_LAZY_DECK__) return;
  window.__IMG_LAZY_DECK__ = true;

  // ---- your brand palette (order doesn't matter) ----
  const PALETTE = ['#35b54c', '#fcac19', '#ed1b24', '#cd82b8', '#04bbed'];

  // ---- shuffle deck (Fisher–Yates, crypto if available) ----
  function randInt(n) {
    try { const u = new Uint32Array(1); crypto.getRandomValues(u); return u[0] % n; }
    catch { return Math.floor(Math.random() * n); }
  }
  let deck = [];
  function refillDeck() {
    deck = PALETTE.slice();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }
  function nextColor() {
    if (!deck.length) refillDeck();
    return deck.pop(); // deal unique color until deck empties
  }

  // ---- helpers (layout-safe) ----
  const io = ('IntersectionObserver' in window)
    ? new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          hydrateImg(e.target);
          io.unobserve(e.target);
        }
      }, { rootMargin: '300px' })
    : null;

  function hasBox(el) {
    const r = el.getBoundingClientRect();
    return (r.width > 0 && r.height > 0);
  }

  function pickPaintTarget(img) {
    if (hasBox(img)) return img;
    let p = img.parentElement;
    while (p && p !== document.body) {
      if (hasBox(p)) return p;
      p = p.parentElement;
    }
    return null;
  }

  function applyPlaceholder(img, color) {
    const target = pickPaintTarget(img);
    if (!target) return null;

    const cs = getComputedStyle(target);
    const hasBgImg = cs.backgroundImage && cs.backgroundImage !== 'none';
    const hasBgColor = cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)';

    if (!hasBgImg && !hasBgColor) {
      const prev = target.style.backgroundColor;
      target.style.backgroundColor = color;
      return { el: target, prev };
    } else if (target !== img) {
      const prev = img.style.backgroundColor;
      img.style.backgroundColor = color;
      return { el: img, prev };
    }
    return null;
  }

  function clearPlaceholder(record) {
    if (!record) return;
    record.el.style.backgroundColor = record.prev || '';
  }

  function hydrateImg(img) {
    if (img.dataset.lazyReady === '1') return;
    img.dataset.lazyReady = '1';
    if (img.dataset.lazy === 'off') return;

    img.loading = 'lazy';
    img.decoding = 'async';

    // data-ph-color (if present) bypasses deck uniqueness on purpose
    const color = img.getAttribute('data-ph-color') || nextColor();

    if (hasBox(img)) img.classList.add('ph-fade');

    const phRecord = applyPlaceholder(img, color);

    function onDone() {
      img.classList.add('ph-loaded');
      setTimeout(() => clearPlaceholder(phRecord), 400);
    }

    if (img.complete && img.naturalWidth > 0) onDone();
    else {
      img.addEventListener('load', onDone, { once: true });
      img.addEventListener('error', () => {/* keep placeholder on error */}, { once: true });
    }
  }

  function process(img) {
    if (!(img instanceof HTMLImageElement)) return;
    if (io) io.observe(img); else hydrateImg(img);
  }

  // Initial pass
  document.addEventListener('DOMContentLoaded', () => {
    refillDeck();
    document.querySelectorAll('img').forEach(process);
  });

  // Dynamically added images
  new MutationObserver((mut) => {
    for (const m of mut) {
      m.addedNodes && m.addedNodes.forEach((n) => {
        if (n.nodeType !== 1) return;
        if (n.tagName === 'IMG') process(n);
        n.querySelectorAll && n.querySelectorAll('img').forEach(process);
      });
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();

