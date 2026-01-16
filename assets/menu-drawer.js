// (() => {
//   const btn = document.querySelector('.main-menu');
//   const menu = document.getElementById('siteMenu');
//   const overlay = document.getElementById('menuOverlay');
//   const closeBtn = menu.querySelector('.menu-close');

//   const logo = document.querySelector('.main-logo');
//   let logoPrevFilter = '';

//   const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
//   let lastFocused = null;

//   function lockScroll(lock) {
//     document.body.style.overflow = lock ? 'hidden' : '';
//   }

//   function openMenu() {
//     if (!menu) return;
//     lastFocused = document.activeElement;

//     menu.classList.add('open');
//     menu.setAttribute('aria-hidden', 'false');
//     btn?.setAttribute('aria-expanded', 'true');

//     overlay.hidden = false;
//     // ensure the fade runs after it's unhidden
//     requestAnimationFrame(() => overlay.classList.add('show'));

//     lockScroll(true);

//     // focus first focusable item
//     const first = menu.querySelector(FOCUSABLE);
//     (first || closeBtn || menu).focus();
//   }

//   function closeMenu() {
//     if (!menu) return;

//     menu.classList.remove('open');
//     menu.setAttribute('aria-hidden', 'true');
//     btn?.setAttribute('aria-expanded', 'false');

//     overlay.classList.remove('show');
//     lockScroll(false);

//     // hide overlay after transition ends so it can fade
//     const onEnd = () => {
//       overlay.hidden = true;
//       overlay.removeEventListener('transitionend', onEnd);
//     };
//     overlay.addEventListener('transitionend', onEnd);

//     // restore focus
//     if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
//   }

//   // Add this helper anywhere above the listeners:
// function toggleMenu() {
//   if (!menu) return;
//   if (menu.classList.contains('open')) {
//     closeMenu();
//   } else {
//     openMenu();
//   }
// }

//   // Click handlers
//   btn?.addEventListener('click', (e) => {
//   e.preventDefault();
//   toggleMenu();
// });
//   closeBtn?.addEventListener('click', closeMenu);
//   overlay?.addEventListener('click', closeMenu);

//   // ESC to close + focus trap
//   document.addEventListener('keydown', (e) => {
//     if (e.key === 'Escape' && menu.classList.contains('open')) {
//       e.preventDefault();
//       closeMenu();
//     }
//     if (e.key === 'Tab' && menu.classList.contains('open')) {
//       const focusables = Array.from(menu.querySelectorAll(FOCUSABLE))
//         .filter(el => !el.hasAttribute('disabled') && el.tabIndex !== -1 && el.offsetParent !== null);
//       if (focusables.length === 0) return;
//       const first = focusables[0];
//       const last  = focusables[focusables.length - 1];

//       if (e.shiftKey && document.activeElement === first) {
//         e.preventDefault(); last.focus();
//       } else if (!e.shiftKey && document.activeElement === last) {
//         e.preventDefault(); first.focus();
//       }
//     }
//   });
// })();

(() => {
  const btn = document.querySelector('.main-menu');
  const menu = document.getElementById('siteMenu');
  const overlay = document.getElementById('menuOverlay');
  const closeBtn = menu?.querySelector('.menu-close');

  const logo = document.querySelector('.main-logo');
  let logoPrevFilter = '';

  const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
  let lastFocused = null;

  function lockScroll(lock) {
    document.body.style.overflow = lock ? 'hidden' : '';
  }

  function openMenu() {
    if (!menu) return;
    lastFocused = document.activeElement;

    menu.classList.add('open');
    menu.setAttribute('aria-hidden', 'false');
    btn?.setAttribute('aria-expanded', 'true');

    if (overlay) {
      overlay.hidden = false;
      // ensure the fade runs after it's unhidden
      requestAnimationFrame(() => overlay.classList.add('show'));
    }

    lockScroll(true);

    // 🔁 invert logo while menu is open
    if (logo) {
      logoPrevFilter = logo.style.filter || '';
      logo.style.filter = 'invert(1)';
    }

    // focus first focusable item
    const first = menu.querySelector(FOCUSABLE);
    (first || closeBtn || menu).focus();
  }

  function closeMenu() {
    if (!menu) return;

    menu.classList.remove('open');
    menu.setAttribute('aria-hidden', 'true');
    btn?.setAttribute('aria-expanded', 'false');

    if (overlay) {
      overlay.classList.remove('show');

      // hide overlay after transition ends so it can fade
      const onEnd = () => {
        overlay.hidden = true;
        overlay.removeEventListener('transitionend', onEnd);
      };
      overlay.addEventListener('transitionend', onEnd);
    }

    lockScroll(false);

    // 🔁 restore whatever filter the logo had before
    if (logo) {
      if (logoPrevFilter) {
        logo.style.filter = logoPrevFilter;
      } else {
        logo.style.removeProperty('filter');
      }
    }

    // restore focus
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  // Toggle helper
  function toggleMenu() {
    if (!menu) return;
    if (menu.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  // Click handlers
  btn?.addEventListener('click', (e) => {
    e.preventDefault();
    toggleMenu();
  });
  closeBtn?.addEventListener('click', closeMenu);
  overlay?.addEventListener('click', closeMenu);

  // ESC to close + focus trap
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu?.classList.contains('open')) {
      e.preventDefault();
      closeMenu();
    }
    if (e.key === 'Tab' && menu?.classList.contains('open')) {
      const focusables = Array.from(menu.querySelectorAll(FOCUSABLE))
        .filter(el => !el.hasAttribute('disabled') && el.tabIndex !== -1 && el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last  = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  });
})();
