(() => {
  'use strict';

  let releases = window.LFZQ8A_PARTICIPANT_RELEASES || {};

  function lockLink(link) {
    if (!link.dataset.originalHref) {
      link.dataset.originalHref = link.getAttribute('href') || link.dataset.lockedHref || '';
    }
    link.removeAttribute('href');
    link.setAttribute('aria-disabled', 'true');
    link.setAttribute('tabindex', '-1');
  }

  function unlockLink(link) {
    const href = link.dataset.originalHref || link.dataset.lockedHref || '';
    if (href) {
      link.setAttribute('href', href);
    }
    link.removeAttribute('aria-disabled');
    link.removeAttribute('tabindex');
  }

  function applyReleases(nextReleases = releases) {
    releases = nextReleases || {};
    document.querySelectorAll('[data-release-key]').forEach((item) => {
      const isReleased = releases[item.dataset.releaseKey] === true;
      const state = item.querySelector('.release-state');

      if (state) {
        state.textContent = isReleased ? 'Freigegeben' : 'Gesperrt';
      }

      item.classList.toggle('is-locked', !isReleased);
      if (item.matches('a')) {
        if (isReleased) {
          unlockLink(item);
        } else {
          lockLink(item);
        }
      }
      item.querySelectorAll('a').forEach((link) => {
        if (isReleased) {
          unlockLink(link);
        } else {
          lockLink(link);
        }
      });
    });
  }

  async function refreshReleases() {
    try {
      const response = await fetch('/api/releases', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      applyReleases(await response.json());
    } catch (error) {
      applyReleases(releases);
    }
  }

  applyReleases(releases);
  refreshReleases();
  window.addEventListener('focus', refreshReleases);
  window.setInterval(refreshReleases, 2000);
})();
