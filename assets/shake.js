
(() => {
  const CLASS = 'shake-now';
  const SELECTOR = '.shakeable';

  function replay(el){
    if (!el) return;
    el.classList.remove(CLASS);
    // force reflow so the animation can restart even if spammed
    void el.offsetWidth;
    el.classList.add(CLASS);
    el.addEventListener('animationend', () => el.classList.remove(CLASS), { once: true });
  }

  function arm(el){
    // Hover (desktop)
    el.addEventListener('mouseenter', () => replay(el), { passive: true });

    // Press / active (desktop + mobile)
    // pointer events cover mouse, touch, pen; add touchstart for older Safari just in case
    const press = () => replay(el);
    el.addEventListener('pointerdown', press, { passive: true });
    el.addEventListener('touchstart', press, { passive: true });

    // Keyboard (“active” via Enter/Space)
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') replay(el);
    });
  }

  document.querySelectorAll(SELECTOR).forEach(arm);

  // If you inject elements later, expose a tiny helper:
  window.enableShake = (root = document) =>
    root.querySelectorAll(SELECTOR).forEach(arm);
})();