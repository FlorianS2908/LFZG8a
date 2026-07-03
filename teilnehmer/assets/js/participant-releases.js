(() => {
  'use strict';

  const releases = window.LFZQ8A_PARTICIPANT_RELEASES || {};

  function lockLink(link) {
    link.dataset.lockedHref = link.getAttribute('href') || '';
    link.removeAttribute('href');
    link.setAttribute('aria-disabled', 'true');
    link.setAttribute('tabindex', '-1');
  }

  document.querySelectorAll('[data-release-key]').forEach((item) => {
    const isReleased = releases[item.dataset.releaseKey] === true;
    const state = item.querySelector('.release-state');

    if (state) {
      state.textContent = isReleased ? 'Freigegeben' : 'Gesperrt';
    }

    if (isReleased) {
      return;
    }

    item.classList.add('is-locked');
    if (item.matches('a')) {
      lockLink(item);
    }
    item.querySelectorAll('a').forEach(lockLink);
  });
})();
