// Apply only on touch devices (mobile)
if ('ontouchstart' in window) {
  document.addEventListener('DOMContentLoaded', () => {
    const gallery = document.querySelector('.gallery-container');
    if (!gallery) return;

    gallery.addEventListener('touchstart', (e) => {
      const img = e.target.closest('img');
      if (img && gallery.contains(img)) {
        img.classList.add('blurred');
      }
    });

    // When the page unloads (navigation), the blur stays until transition
    window.addEventListener('beforeunload', () => {
      document.querySelectorAll('.gallery-container img').forEach(img => {
        img.classList.add('blurred');
      });
    });
  });
}