// document.addEventListener('DOMContentLoaded', () => {
//   const scroller = document.querySelector('.gallery');
//   if (!scroller) return;

//   const originals = Array.from(scroller.querySelectorAll('.gallery-container'));
//   const N = originals.length;
//   if (!N) return;

//   // ---------- helpers ----------
//   const stepWidth = () => {
//     const first = scroller.querySelector('.gallery-container');
//     if (!first) return scroller.clientWidth * 0.4;
//     const r = first.getBoundingClientRect();
//     const cs = getComputedStyle(first);
//     const ml = parseFloat(cs.marginLeft)  || 0;
//     const mr = parseFloat(cs.marginRight) || 0;
//     return r.width + ml + mr;
//   };

//   const jumpNoAnimate = (x) => {
//     const prev = scroller.style.scrollBehavior;
//     scroller.style.scrollBehavior = 'auto';
//     scroller.scrollLeft = x;
//     scroller.style.scrollBehavior = prev;
//   };

//   // ---------- randomize middle strip order ----------
//   const shuffleInPlace = (arr) => {
//     for (let i = arr.length - 1; i > 0; i--) {
//       const j = Math.floor(Math.random() * (i + 1));
//       [arr[i], arr[j]] = [arr[j], arr[i]];
//     }
//     return arr;
//   };

//   // Create a shuffled sequence of the originals
//   const seq = shuffleInPlace(originals.slice());

//   // Reflow DOM so the visible "middle" copy uses the shuffled order
//   // (appendChild moves existing nodes)
//   seq.forEach(el => scroller.appendChild(el));

//   // Tag originals in their new (random) order
//   seq.forEach((el, i) => { el.dataset.ix = i; });

//   // ---------- build tripled forward strip (no reverse = no mirror) ----------
//   const makeForwardCopies = (frag, srcArr) => {
//     for (let i = 0; i < N; i++) {
//       const c = srcArr[i].cloneNode(true);
//       c.dataset.ix = i; // keep same index for clones
//       frag.appendChild(c);
//     }
//   };

//   const beforeFrag = document.createDocumentFragment();
//   const afterFrag  = document.createDocumentFragment();

//   // forward order (shuffled) on both sides
//   makeForwardCopies(beforeFrag, seq);
//   makeForwardCopies(afterFrag,  seq);

//   scroller.prepend(beforeFrag);   // [shuffled 0..N-1]
//   scroller.append(afterFrag);     // [shuffled 0..N-1]

//   // ---------- center on middle copy ----------
//   let STEP = stepWidth();
//   let STRIP = STEP * N;
//   const centerOnMiddle = () => jumpNoAnimate(STRIP); // start of the middle copy
//   centerOnMiddle();

//   // ---------- recycle when near edges (seamless loop) ----------
//   let ticking = false;
//   const recycle = () => {
//     ticking = false;
//     const x = scroller.scrollLeft;
//     if (x < STRIP * 0.5) {
//       jumpNoAnimate(x + STRIP);
//     } else if (x > STRIP * 1.5) {
//       jumpNoAnimate(x - STRIP);
//     }
//   };
//   scroller.addEventListener('scroll', () => {
//     if (!ticking) {
//       ticking = true;
//       requestAnimationFrame(recycle);
//     }
//   });

//   // ---------- keep math correct on resize ----------
//   const onResize = () => {
//     STEP  = stepWidth();
//     STRIP = STEP * N;
//     centerOnMiddle();
//   };
//   window.addEventListener('resize', () => {
//     clearTimeout(onResize._t);
//     onResize._t = setTimeout(onResize, 100);
//   });

//   // ---------- do NOT interfere with clicks ----------
//   scroller.style.touchAction = 'auto';
//   scroller.onpointerdown = scroller.onpointermove = scroller.onpointerup = scroller.onpointercancel = null;
//   scroller.onwheel = scroller.onkeydown = null;
// });






document.addEventListener('DOMContentLoaded', () => {
  const scroller = document.querySelector('.gallery');
  if (!scroller) return;

  const originals = Array.from(scroller.querySelectorAll('.gallery-container'));
  const N = originals.length;
  if (!N) return;

  // ---------- tag landscape items BEFORE cloning ----------
  originals.forEach(container => {
    const img = container.querySelector('img');
    if (!img) return;

    const tag = () => {
      if (img.naturalWidth && img.naturalHeight && img.naturalWidth > img.naturalHeight) {
        container.classList.add('landscape');
      }
    };

    if (img.complete) tag();
    else img.addEventListener('load', tag, { once: true });
  });

  // ---------- helpers ----------
  const jumpNoAnimate = (x) => {
    const prev = scroller.style.scrollBehavior;
    scroller.style.scrollBehavior = 'auto';
    scroller.scrollLeft = x;
    scroller.style.scrollBehavior = prev;
  };

  // Sum width (incl margins) of the FIRST N gallery items currently in scroller.
  // After we build the tripled strip, the first N is a full strip copy.
  const stripWidth = () => {
    const items = Array.from(scroller.querySelectorAll('.gallery-container'));
    if (items.length < N) return scroller.clientWidth;

    let sum = 0;
    for (let i = 0; i < N; i++) {
      const el = items[i];
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const ml = parseFloat(cs.marginLeft) || 0;
      const mr = parseFloat(cs.marginRight) || 0;
      sum += r.width + ml + mr;
    }
    return sum || scroller.clientWidth;
  };

  // ---------- randomize middle strip order ----------
  const shuffleInPlace = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Create a shuffled sequence of the originals
  const seq = shuffleInPlace(originals.slice());

  // Reflow DOM so the visible "middle" copy uses the shuffled order
  // (appendChild moves existing nodes)
  seq.forEach(el => scroller.appendChild(el));

  // Tag originals in their new (random) order
  seq.forEach((el, i) => { el.dataset.ix = i; });

  // ---------- build tripled forward strip (no reverse = no mirror) ----------
  const makeForwardCopies = (frag, srcArr) => {
    for (let i = 0; i < N; i++) {
      const c = srcArr[i].cloneNode(true);
      c.dataset.ix = i; // keep same index for clones
      frag.appendChild(c);
    }
  };

  const beforeFrag = document.createDocumentFragment();
  const afterFrag  = document.createDocumentFragment();

  // forward order (shuffled) on both sides
  makeForwardCopies(beforeFrag, seq);
  makeForwardCopies(afterFrag,  seq);

  scroller.prepend(beforeFrag);   // [copy 1]
  scroller.append(afterFrag);     // [copy 3]

  // ---------- center on middle copy ----------
  let STRIP = stripWidth();

  const centerOnMiddle = () => {
    STRIP = stripWidth();
    jumpNoAnimate(STRIP); // start of the middle copy
  };

  // Initial center (after DOM is fully built)
  centerOnMiddle();

  // ---------- recycle when near edges (seamless loop) ----------
  let ticking = false;

  const recycle = () => {
    ticking = false;
    const x = scroller.scrollLeft;

    // If user scrolls too far left into the "before" copy, jump forward one strip.
    if (x < STRIP * 0.5) {
      jumpNoAnimate(x + STRIP);
    }
    // If user scrolls too far right into the "after" copy, jump backward one strip.
    else if (x > STRIP * 1.5) {
      jumpNoAnimate(x - STRIP);
    }
  };

  scroller.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(recycle);
    }
  });

  // ---------- keep math correct on resize ----------
  const onResize = () => {
    // Preserve relative position within the strip before recentering
    const x = scroller.scrollLeft;
    STRIP = stripWidth();
    const within = ((x % STRIP) + STRIP) % STRIP;
    jumpNoAnimate(STRIP + within); // stay in the middle copy, same relative spot
  };

  window.addEventListener('resize', () => {
    clearTimeout(onResize._t);
    onResize._t = setTimeout(onResize, 100);
  });

  // ---------- if images load later, re-measure once ----------
  // (helps when aspect tagging happens after load and widths shift)
  let loadRecalcQueued = false;
  const queueRecalc = () => {
    if (loadRecalcQueued) return;
    loadRecalcQueued = true;
    requestAnimationFrame(() => {
      loadRecalcQueued = false;
      onResize();
    });
  };

  scroller.querySelectorAll('img').forEach(img => {
    if (!img.complete) img.addEventListener('load', queueRecalc, { once: true });
  });

  // ---------- do NOT interfere with clicks ----------
  scroller.style.touchAction = 'auto';
  scroller.onpointerdown = scroller.onpointermove = scroller.onpointerup = scroller.onpointercancel = null;
  scroller.onwheel = scroller.onkeydown = null;
});
