document.addEventListener('DOMContentLoaded', () => {
  const $items = document.querySelectorAll('.gallery-name');

  // Helpers
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randi = (min, max) => Math.floor(rand(min, max + 1));

  $items.forEach(el => {
    const rot = rand(-5, 5).toFixed(2);          // -5deg … 5deg
    const mb  = randi(15, 30);                   // 15px … 30px
    const ml  = randi(15, 30);                   // 15px … 30px

    // Apply styles
    el.style.transform = `rotate(${rot}deg)`;
    el.style.marginBottom = `${mb}px`;
    el.style.marginLeft = `${ml}px`;
  });
});
