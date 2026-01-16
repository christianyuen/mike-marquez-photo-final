(() => {
  if (window.__GM_ENGINE__) return;
  window.__GM_ENGINE__ = true;

  // ========= Tunables =========
  const IMG_VH        = 80;   // image is 80% of viewport height
  const GAP_PX        = 10;   // space between photos
  const WHEEL_GAIN    = 0.09; // lower = slower wheel/trackpad speed
  const SPRING        = 0.10; // lower = softer approach
  const DAMPING       = 0.93; // higher = more friction/less glide
  const KEY_PX        = 80;   // keyboard nudge
  const MAX_WHEEL     = 28;   // clamp per wheel event
  const VEL_CAP       = 800;  // cap momentum velocity

  // Preload strategy
  const PRELOAD_NEAR  = 4;    // decode + cache this many neighbors each side
  const PRELOAD_NEXT  = 2;    // <link rel="preload"> for next N images
  const PREFETCH_FAR  = 6;    // <link rel="prefetch"> farther out
  const PRIORITY_NEAR = 2;    // fetchpriority=high for these neighbors
  const EAGER_ALL     = true; // decode ALL slides before allowing scroll
  const CLOSE_ON_BG_CLICK = true;

  // ========= Helpers =========
  const vh = () => window.innerHeight || document.documentElement.clientHeight;
  const parseImagesAttr = (val) => {
    if (!val) return [];
    try { if (val.trim().startsWith('[')) return JSON.parse(val); } catch {}
    return val.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
  };
  const normalizeWheel = (e) => {
    if (e.deltaMode === 1) return e.deltaY * 16;   // lines -> px
    if (e.deltaMode === 2) return e.deltaY * vh(); // pages -> px
    return e.deltaY;
  };

  // ========= Markup =========
  const modal = document.createElement('div');
  modal.className = 'gm gm-hidden';
  modal.setAttribute('aria-hidden','true');
  modal.innerHTML = `
    <div class="gm__overlay" data-gm="overlay"></div>
    <div class="gm__dialog" role="dialog" aria-modal="true" aria-label="Gallery">
      <div class="gm__header">
        <div class="gm__title" data-gm="caption"></div>
        <button class="gm__close" type="button" aria-label="Close" data-gm="close">×</button>
      </div>
      <div class="gm__content" data-gm="content">
        <div class="gm__track" data-gm="track" aria-live="polite"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const $ = (sel) => modal.querySelector(sel);
  const track   = $('[data-gm="track"]');
  const capEl   = $('[data-gm="caption"]');
  const content = $('[data-gm="content"]');

  // ========= State =========
  let set = [];
  let title = '';
  let lastFocus = null;

  let N = 0;
  let slideH = 0;
  let padPx  = 0;
  let minPos = 0;
  let maxPos = 0;

  // Motion
  let pos = 0;
  let target = 0;
  let vel = 0;
  let rafId = 0;
  let openNow = false;
  let lastT = 0;

  // Input gating until all images ready
  let ready = !EAGER_ALL;

  // Touch
  let dragging = false;
  let dragStartY = 0;
  let dragStartTarget = 0;
  let lastMoveY = 0;
  let lastMoveT = 0;

  // Preload/priorities
  const preloaded = new Set();
  const linked = new Set();
  let imgByLogical = [];       // logical index (0..N+1) -> <img>
  let lastPriorityCenter = -1;

  // ========= Utils =========
  const lockScroll = (lock) => { document.documentElement.style.overflow = lock ? 'hidden' : ''; };
  const setTransform = () => { track.style.transform = `translate3d(0, ${-pos}px, 0)`; };

  const computeMetrics = () => {
    const imgPx = Math.round(vh() * IMG_VH / 100);
    slideH = imgPx + GAP_PX;
    padPx  = Math.max(0, Math.round((vh() - slideH) / 2));
    track.style.height = `${(N + 2) * slideH}px`;
    minPos = padPx;
    maxPos = padPx + (N + 1) * slideH;
  };

  const indexToPos = (i) => padPx + i * slideH; // logical index (0..N+1)

  const wrapIfNeeded = () => {
    const span = N * slideH;
    while (pos < minPos) { pos += span; target += span; }
    while (pos > maxPos) { pos -= span; target -= span; }
  };

  const nearestLogicalIndex = () => Math.round((pos - padPx) / Math.max(1, slideH));
  const realFromLogical = (L) => (L === 0 ? N - 1 : (L === N + 1 ? 0 : L - 1));
  const logicalFromReal = (R) => R + 1;

  const updateCaption = () => {
    if (!N) return;
    let near = nearestLogicalIndex();
    near = Math.max(0, Math.min(N + 1, near));
    let real = realFromLogical(near);
    capEl.textContent = N > 1
      ? `${title ? title + ' — ' : ''}${real + 1} / ${N}${ready ? '' : ' — loading…'}`
      : (title || '');
  };

  // ---- network helpers ----
  const addLink = (rel, href, asType) => {
    if (!href || linked.has(rel + '|' + href)) return;
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    if (asType) link.as = asType;
    document.head.appendChild(link);
    linked.add(rel + '|' + href);
  };

  const preloadLink = (url)  => addLink('preload',  url, 'image');
  const prefetchLink = (url) => addLink('prefetch', url, 'image');

  const decodeImageURL = (url) => {
    if (preloaded.has(url)) return;
    preloaded.add(url);
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    if (img.decode) img.decode().catch(()=>{});
  };

  const preloadIdx = (i) => {
    if (i < 0) i += N;
    if (i >= N) i -= N;
    const url = set[i];
    decodeImageURL(url);
  };

  const preloadNeighbors = (centerRealIdx) => {
    for (let k = 1; k <= PRELOAD_NEAR; k++) {
      preloadIdx(centerRealIdx + k);
      preloadIdx(centerRealIdx - k);
    }
    // preload & prefetch links: next few get 'preload', farther ones 'prefetch'
    for (let k = 1; k <= PRELOAD_NEXT; k++) {
      const j = (centerRealIdx + k + N) % N;
      preloadLink(set[j]);
    }
    for (let k = PRELOAD_NEXT + 1; k <= PREFETCH_FAR; k++) {
      const j = (centerRealIdx + k + N) % N;
      prefetchLink(set[j]);
    }
  };

  const setPriorityAround = (centerRealIdx) => {
    if (centerRealIdx === lastPriorityCenter) return;
    lastPriorityCenter = centerRealIdx;

    // reset priorities
    for (let L = 0; L < imgByLogical.length; L++) {
      const img = imgByLogical[L];
      if (!img) continue;
      img.fetchPriority = 'auto';
      img.loading = 'lazy';
    }
    // bump priority for current + neighbors (both real and clones)
    for (let k = -PRIORITY_NEAR; k <= PRIORITY_NEAR; k++) {
      const r = (centerRealIdx + k + N) % N;
      const L = logicalFromReal(r);
      const imgMain = imgByLogical[L];
      const imgTopClone = imgByLogical[0];        // logical 0 is clone of last
      const imgBottomClone = imgByLogical[N + 1]; // logical N+1 is clone of first
      if (imgMain) { imgMain.fetchPriority = 'high'; imgMain.loading = 'eager'; }
      if (r === 0 && imgBottomClone) { imgBottomClone.fetchPriority = 'high'; imgBottomClone.loading = 'eager'; }
      if (r === N - 1 && imgTopClone) { imgTopClone.fetchPriority = 'high'; imgTopClone.loading = 'eager'; }
    }
  };

  // Eagerly decode every slide image before allowing input (for truly zero-load scroll)
  async function warmAllImages() {
    const imgs = Array.from(track.querySelectorAll('.gm__img'));
    // network hints for all
    set.forEach(u => preloadLink(u));
    // decode actual DOM imgs
    await Promise.all(imgs.map(img => {
      img.loading = 'eager';
      img.fetchPriority = 'high';
      if (img.complete) {
        // ensure fade-in class if already cached
        img.classList.add('is-loaded');
        return Promise.resolve();
      }
      return (img.decode ? img.decode().catch(()=>{}) : Promise.resolve()).then(() => {
        img.classList.add('is-loaded');
      });
    }));
  }

  // time-based decay (dt seconds, base per-frame factor)
  const decay = (base, dt) => Math.pow(base, dt * 60);

  // ========= Animation Loop =========
  const MOVE_EPS = 0.2;
  const MAX_DT  = 0.05;

  const animate = (now) => {
    if (!openNow) return;
    if (!lastT) lastT = now;
    let dt = (now - lastT) / 1000;
    if (dt > MAX_DT) dt = MAX_DT;
    lastT = now;

    // integrate momentum (vel drives target)
    target += vel * dt * 60;
    vel *= decay(DAMPING, dt);

    // smoothly approach target (EMA-like, dt-normalized)
    const alpha = 1 - Math.pow(1 - SPRING, dt * 60);
    pos += (target - pos) * alpha;

    wrapIfNeeded();
    setTransform();
    updateCaption();

    // priorities + preload based on current center
    let L = Math.max(0, Math.min(N + 1, nearestLogicalIndex()));
    const centerReal = realFromLogical(L);
    setPriorityAround(centerReal);
    preloadNeighbors(centerReal);

    // lighten blur while moving
    const moving = Math.abs(target - pos) > MOVE_EPS || Math.abs(vel) > MOVE_EPS;
    modal.classList.toggle('gm--moving', moving);

    rafId = requestAnimationFrame(animate);
  };

  // ========= Build Slides (with clones) =========
  function buildSlides(startRealIdx) {
    track.innerHTML = '';
    imgByLogical = [];
    linked.clear();
    preloaded.clear();

    N = set.length;
    if (!N) return;

    const mkSlide = (src, alt='') => {
      const d = document.createElement('div');
      d.className = 'gm__slide';
      const img = document.createElement('img');
      img.className = 'gm__img';
      img.decoding = 'async';
      img.loading = 'lazy';          // default; we bump to eager around center / on warmAllImages
      img.fetchPriority = 'auto';
      img.alt = alt;
      img.src = src;
      img.style.maxHeight = `min(${IMG_VH}vh, 90vh)`;
      img.addEventListener('load', () => img.classList.add('is-loaded'));
      d.appendChild(img);
      return d;
    };

    const frag = document.createDocumentFragment();
    // logical 0: top clone (last image)
    const topClone = mkSlide(set[N-1], `${title || 'Image'} ${N} (clone)`);
    frag.appendChild(topClone);
    imgByLogical.push(topClone.querySelector('img'));

    // logical 1..N: real images
    for (let i = 0; i < N; i++) {
      const node = mkSlide(set[i], `${title || 'Image'} ${i+1}`);
      frag.appendChild(node);
      imgByLogical.push(node.querySelector('img'));
    }

    // logical N+1: bottom clone (first image)
    const botClone = mkSlide(set[0], `${title || 'Image'} 1 (clone)`);
    frag.appendChild(botClone);
    imgByLogical.push(botClone.querySelector('img'));

    track.appendChild(frag);

    computeMetrics();
    const startLogical = startRealIdx + 1; // account for the top clone
    pos = target = indexToPos(startLogical);
    vel = 0;
    setTransform();
    updateCaption();

    // initial network warm-up
    setPriorityAround(startRealIdx);
    preloadNeighbors(startRealIdx);
  }

  // ========= Open / Close =========
  async function openVertical(images, startIdx, heading) {
    set = images.slice();
    title = heading || '';
    lastFocus = document.activeElement;

    buildSlides(Math.max(0, Math.min(startIdx || 0, set.length - 1)));

    modal.classList.remove('gm-hidden');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('gm-open');
    $('[data-gm="close"]').focus();
    lockScroll(true);

    openNow = true;
    lastT = 0;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(animate);

    if (EAGER_ALL) {
      ready = false;
      try { await warmAllImages(); }
      finally { ready = true; updateCaption(); }
    } else {
      ready = true;
    }
  }

  function close() {
    openNow = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    vel = 0;
    modal.classList.remove('is-open', 'gm--moving');
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('gm-open');
    lockScroll(false);
    setTimeout(() => {
      modal.classList.add('gm-hidden');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }, 100);
  }

  // ========= Public API =========
  // Call: __openGalleryModal(cardEl, clickedSrcOptional)
  window.__openGalleryModal = function(card, clickedSrc) {
    const list = parseImagesAttr(card?.dataset?.images) || [];
    if (!list.length) return;
    const heading = card.querySelector('.gallery-name h2')?.textContent || '';
    let start = 0;
    if (clickedSrc) {
      const found = list.indexOf(clickedSrc);
      start = found >= 0 ? found : 0;
    }
    openVertical(list, start, heading);
  };

  // ========= Inputs =========
  // Wheel/trackpad -> momentum impulse (slower + clamped)
  modal.addEventListener('wheel', (e) => {
    if (modal.classList.contains('gm-hidden')) return;
    e.preventDefault();
    if (!ready) return; // block until images warmed
    const d = normalizeWheel(e);
    const delta = Math.max(-MAX_WHEEL, Math.min(MAX_WHEEL, d));
    vel = Math.max(-VEL_CAP, Math.min(VEL_CAP, vel + delta * WHEEL_GAIN));
  }, { passive: false });

  // Touch drag with gentler momentum
  modal.addEventListener('touchstart', (e) => {
    if (modal.classList.contains('gm-hidden') || !ready) return;
    const t = e.touches[0];
    dragging = true;
    dragStartY = t.clientY;
    dragStartTarget = target;
    lastMoveY = t.clientY;
    lastMoveT = performance.now();
  }, { passive: true });

  modal.addEventListener('touchmove', (e) => {
    if (modal.classList.contains('gm-hidden') || !ready) return;
    const t = e.touches[0];
    const dy = dragStartY - t.clientY; // drag up = next
    target = dragStartTarget + dy;
    const now = performance.now();
    lastMoveY = t.clientY;
    lastMoveT = now;
    e.preventDefault();
  }, { passive: false });

  modal.addEventListener('touchend', () => {
    if (modal.classList.contains('gm-hidden') || !ready) return;
    dragging = false;
    const now = performance.now();
    const dt = Math.max(1, now - lastMoveT);
    const vy = (dragStartY - lastMoveY) / dt; // px/ms
    vel = Math.max(-VEL_CAP, Math.min(VEL_CAP, vel + vy * 140)); // softer fling
  }, { passive: true });

  // Keyboard gentle nudge
  document.addEventListener('keydown', (e) => {
    if (modal.classList.contains('gm-hidden') || !ready) return;
    if (e.key === 'Escape') return close();
    if (['ArrowDown','PageDown',' '].includes(e.key)) { e.preventDefault(); target += KEY_PX; }
    if (['ArrowUp','PageUp'].includes(e.key))         { e.preventDefault(); target -= KEY_PX; }
  });

  // Click overlay/close (outside the image)
  $('[data-gm="overlay"]').addEventListener('click', close);
  $('[data-gm="close"]').addEventListener('click', close);
  if (CLOSE_ON_BG_CLICK && content) {
    content.addEventListener('click', (e) => {
      // if the click is NOT on an image, and we aren't dragging, close
      if (dragging) return;
      if (!e.target.closest('img.gm__img')) close();
    });
  }

  // Maintain center on resize
  window.addEventListener('resize', () => {
    if (modal.classList.contains('gm-hidden')) return;
    const logical = Math.round((pos - padPx) / Math.max(1, slideH));
    computeMetrics();
    pos = target = indexToPos(Math.max(0, Math.min(N + 1, logical)));
    setTransform();
  });
})();




