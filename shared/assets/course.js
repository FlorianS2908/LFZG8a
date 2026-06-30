document.addEventListener('click', (event) => {
  const toggle = event.target.closest('[data-toggle-solution]');
  if (toggle) {
    const box = toggle.closest('.task, .card').querySelector('.solution');
    if (box) {
      box.classList.toggle('is-open');
      toggle.textContent = box.classList.contains('is-open') ? 'Lösung ausblenden' : 'Lösung anzeigen';
    }
  }
  const copy = event.target.closest('[data-copy]');
  if (copy) {
    const pre = copy.closest('.card, .task').querySelector('pre');
    if (pre) navigator.clipboard.writeText(pre.innerText);
    copy.textContent = 'Kopiert';
    setTimeout(() => copy.textContent = 'Code kopieren', 1200);
  }
});
