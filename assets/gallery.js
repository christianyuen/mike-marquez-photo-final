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
//     // include horizontal margins if any
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

//   // ---------- build tripled forward strip (no reverse = no mirror) ----------
//   const makeForwardCopies = (frag) => {
//     for (let i = 0; i < N; i++) {
//       const c = originals[i].cloneNode(true);
//       c.dataset.ix = i;
//       frag.appendChild(c);
//     }
//   };

//   const beforeFrag = document.createDocumentFragment();
//   const afterFrag  = document.createDocumentFragment();
//   // forward order on both sides
//   makeForwardCopies(beforeFrag);
//   makeForwardCopies(afterFrag);

//   // tag originals too (useful if your lightbox reads data-ix)
//   originals.forEach((el, i) => { el.dataset.ix = i; });

//   scroller.prepend(beforeFrag);      // [0..N-1]
//   scroller.append(afterFrag);        // [0..N-1]

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
//     // If we drift too far left, hop right by one strip; too far right, hop left by one strip.
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
//     // mild throttle
//     clearTimeout(onResize._t);
//     onResize._t = setTimeout(onResize, 100);
//   });

//   // ---------- do NOT interfere with clicks (no drag handlers, etc.) ----------
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

  // ---------- helpers ----------
  const stepWidth = () => {
    const first = scroller.querySelector('.gallery-container');
    if (!first) return scroller.clientWidth * 0.4;
    const r = first.getBoundingClientRect();
    const cs = getComputedStyle(first);
    const ml = parseFloat(cs.marginLeft)  || 0;
    const mr = parseFloat(cs.marginRight) || 0;
    return r.width + ml + mr;
  };

  const jumpNoAnimate = (x) => {
    const prev = scroller.style.scrollBehavior;
    scroller.style.scrollBehavior = 'auto';
    scroller.scrollLeft = x;
    scroller.style.scrollBehavior = prev;
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

  scroller.prepend(beforeFrag);   // [shuffled 0..N-1]
  scroller.append(afterFrag);     // [shuffled 0..N-1]

  // ---------- center on middle copy ----------
  let STEP = stepWidth();
  let STRIP = STEP * N;
  const centerOnMiddle = () => jumpNoAnimate(STRIP); // start of the middle copy
  centerOnMiddle();

  // ---------- recycle when near edges (seamless loop) ----------
  let ticking = false;
  const recycle = () => {
    ticking = false;
    const x = scroller.scrollLeft;
    if (x < STRIP * 0.5) {
      jumpNoAnimate(x + STRIP);
    } else if (x > STRIP * 1.5) {
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
    STEP  = stepWidth();
    STRIP = STEP * N;
    centerOnMiddle();
  };
  window.addEventListener('resize', () => {
    clearTimeout(onResize._t);
    onResize._t = setTimeout(onResize, 100);
  });

  // ---------- do NOT interfere with clicks ----------
  scroller.style.touchAction = 'auto';
  scroller.onpointerdown = scroller.onpointermove = scroller.onpointerup = scroller.onpointercancel = null;
  scroller.onwheel = scroller.onkeydown = null;
});

