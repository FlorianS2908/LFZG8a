(() => {
  'use strict';

  const startReleases = {
    tag_01: true,
    tag_02: false,
    tag_03: false,
    tag_04: false,
    tag_05: false,
    project_materials: false,
    project_submission: false,
    tool_quiz: false,
    tool_tags: true,
    additional_tasks: false
  };

  const toggles = [...document.querySelectorAll('[data-release-toggle]')];
  const status = document.querySelector('[data-release-status]');
  const saveButton = document.querySelector('[data-release-save]');
  const allButton = document.querySelector('[data-release-all]');
  const basicButton = document.querySelector('[data-release-basic]');
  const classroomServer = document.querySelector('[data-classroom-server]');
  const participantList = document.querySelector('[data-participant-list]');

  if (!toggles.length) {
    return;
  }

  function setStatus(message) {
    if (status) {
      status.textContent = message;
    }
  }

  function readControls() {
    return Object.fromEntries(toggles.map((toggle) => [toggle.dataset.releaseToggle, toggle.checked]));
  }

  function applyReleases(releases) {
    toggles.forEach((toggle) => {
      toggle.checked = releases[toggle.dataset.releaseToggle] === true;
    });
  }

  async function loadReleases() {
    if (!window.lfzq8aDesktop || !window.lfzq8aDesktop.getParticipantReleases) {
      applyReleases(startReleases);
      setStatus('Freigaben koennen nur in der Electron-Dozenten-App gespeichert werden.');
      return;
    }

    const releases = await window.lfzq8aDesktop.getParticipantReleases();
    applyReleases(releases);
    setStatus('Freigaben geladen.');
  }

  async function saveReleases(releases = readControls()) {
    if (!window.lfzq8aDesktop || !window.lfzq8aDesktop.saveParticipantReleases) {
      setStatus('Speichern ist nur in der Electron-Dozenten-App moeglich.');
      return;
    }

    await window.lfzq8aDesktop.saveParticipantReleases(releases);
    applyReleases(releases);
    setStatus('Freigaben gespeichert. Teilnehmer-Main-View nach Bedarf neu laden.');
  }

  saveButton?.addEventListener('click', () => {
    saveReleases();
  });

  allButton?.addEventListener('click', () => {
    const allReleases = Object.fromEntries(toggles.map((toggle) => [toggle.dataset.releaseToggle, true]));
    applyReleases(allReleases);
    saveReleases(allReleases);
  });

  basicButton?.addEventListener('click', () => {
    applyReleases(startReleases);
    saveReleases(startReleases);
  });

  loadReleases().catch((error) => {
    setStatus(`Freigaben konnten nicht geladen werden: ${error.message}`);
  });

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(value) {
    if (!value) {
      return '-';
    }
    return new Date(value).toLocaleString('de-DE');
  }

  function renderParticipant(participant) {
    const status = participant.status || {};
    const initials = (participant.shortName || participant.displayName || 'TN').slice(0, 2).toUpperCase();
    const avatar = participant.avatarDataUrl
      ? `<img class="participant-avatar" src="${escapeHtml(participant.avatarDataUrl)}" alt="">`
      : `<span class="participant-avatar">${escapeHtml(initials)}</span>`;
    const stateClass = status.needsHelp ? 'help' : (participant.online ? 'online' : '');
    const stateText = status.needsHelp ? 'Hilfe benoetigt' : (participant.online ? 'online' : 'offline');

    return `<tr>
      <td><div class="participant-name">${avatar}<span><strong>${escapeHtml(participant.displayName)}</strong><br><small>${escapeHtml(participant.email || participant.teamsName || participant.shortName)}</small></span></div></td>
      <td><span class="state-pill ${stateClass}">${stateText}</span></td>
      <td>${escapeHtml(status.currentTask || '-')}</td>
      <td>${Number(status.progress || 0)}%</td>
      <td>${formatDate(participant.lastSeenAt)}</td>
    </tr>`;
  }

  async function loadClassroomInfo() {
    if (!classroomServer || !window.lfzq8aDesktop?.getClassroomInfo) {
      return;
    }
    const info = await window.lfzq8aDesktop.getClassroomInfo();
    classroomServer.innerHTML = info.running && info.urls.length
      ? `Teilnehmer-Adresse:<code>${escapeHtml(info.urls[info.urls.length - 1])}</code><small>Falls mehrere Netzwerke aktiv sind, pruefe die passende IP-Adresse im Kursraum.</small>`
      : 'Kursserver ist noch nicht gestartet.';
  }

  async function loadParticipants() {
    if (!participantList || !window.lfzq8aDesktop?.listParticipants) {
      return;
    }
    const participants = await window.lfzq8aDesktop.listParticipants();
    participantList.innerHTML = participants.length
      ? participants.map(renderParticipant).join('')
      : '<tr><td colspan="5">Noch keine Teilnehmer verbunden.</td></tr>';
  }

  loadClassroomInfo().catch(() => {});
  loadParticipants().catch(() => {});
  window.setInterval(() => {
    loadParticipants().catch(() => {});
  }, 5000);
})();
