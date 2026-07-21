(function initReviewUi(globalScope) {
  const escapeHtml = globalScope.ContentFactoryWorkflowUtils?.escapeHtml || ((value) => String(value ?? ''));
  const statusLabels = { locked: 'Gesperrt', editing: 'Bearbeitung', ready_for_review: 'Bereit zur Prüfung', review_running: 'Review läuft', changes_requested: 'Nacharbeit erforderlich', ready_for_approval: 'Bereit zur Freigabe', review_passed: 'Review bestanden', review_failed: 'Review nicht bestanden', review_error: 'Technischer Fehler' };
  function renderGate(progress) {
    return `<div class="review-gates" aria-label="Phasenstatus"><span class="review-gate ${progress.completionPassed ? 'is-passed' : ''}"><strong>1. Erledigt</strong><small>${progress.completionPassed ? 'Bestanden' : 'Offen'}</small></span><span class="review-gate ${progress.reviewPassed ? 'is-passed' : ''}"><strong>2. Review bestanden</strong><small>${progress.reviewPassed ? 'Bestanden' : 'Offen'}</small></span></div>`;
  }
  function renderWorkspace({ definition, progress, result, deterministic = [] }) {
    const findings = result?.findings || [];
    const blockers = findings.filter((finding) => finding.severity === 'blocking' && finding.status === 'open').length;
    return `<section class="review-workspace" aria-labelledby="review-title">
      <header class="review-status-panel"><div><p class="eyebrow">KI-Review</p><h3 id="review-title">${escapeHtml(definition.name)}</h3></div><dl><div><dt>Status</dt><dd>${escapeHtml(statusLabels[progress.reviewStatus] || progress.reviewStatus)}</dd></div><div><dt>Punktzahl</dt><dd>${result ? `${escapeHtml(result.score)} / 100` : '-'}</dd></div><div><dt>Blocker</dt><dd>${blockers}</dd></div><div><dt>Durchlauf</dt><dd>${progress.reviewIteration || 0}</dd></div></dl></header>
      ${renderGate(progress)}
      <article class="review-summary"><h4>Zusammenfassung</h4><p>${escapeHtml(result?.summary || 'Starte das Review nach erfolgreicher deterministischer Prüfung.')}</p><ul>${deterministic.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></article>
      <div class="review-columns"><section><h4>Findings</h4>${findings.length ? findings.map(renderFinding).join('') : '<p class="status-line">Keine Findings vorhanden.</p>'}</section><aside class="review-artifact-viewer"><h4>Artefaktansicht</h4><p>Original und aktueller Ergebnisstand bleiben versioniert erhalten. Textbasierte Änderungen werden als neue Version gespeichert.</p><p class="status-line">Spreadsheet-Originale sind schreibgeschützt.</p></aside></div>
      <label>Hinweis zur Nacharbeit<textarea data-review-comment>${escapeHtml((progress.comments || []).at(-1) || '')}</textarea></label>
      <div class="button-row review-actions"><button class="secondary-button" type="button" data-review-back>Zurück zur Bearbeitung</button><button class="secondary-button" type="button" data-review-start>${result ? 'Erneut prüfen' : 'Review starten'}</button><button class="primary-button" type="button" data-review-approve ${progress.reviewStatus === 'ready_for_approval' ? '' : 'disabled'}>Review freigeben</button></div>
      ${progress.history?.length ? `<details class="review-history"><summary>Review-Verlauf (${progress.history.length})</summary><ol>${progress.history.map((entry) => `<li>${escapeHtml(entry.at)} – ${escapeHtml(entry.status)}${entry.score == null ? '' : ` – ${escapeHtml(entry.score)} Punkte`}</li>`).join('')}</ol></details>` : ''}
    </section>`;
  }
  function renderFinding(finding) {
    const evidence = (finding.evidence || []).map((item) => [item.artifactId, item.fieldPath, item.sheetName, item.cellAddress, item.excerpt].filter(Boolean).join(' · ')).join('; ');
    return `<article class="review-finding severity-${escapeHtml(finding.severity)}"><header><strong>${escapeHtml(finding.title)}</strong><span class="status-badge">${escapeHtml(finding.severity)}</span></header><p>${escapeHtml(finding.explanation)}</p><small>Evidenz: ${escapeHtml(evidence)}</small>${finding.suggestion ? `<p><strong>Vorschlag:</strong> ${escapeHtml(finding.suggestion)}</p>` : ''}<div class="button-row"><button class="secondary-button" type="button" data-review-change="accept:${escapeHtml(finding.id)}">Änderung übernehmen</button><button class="secondary-button" type="button" data-review-change="reject:${escapeHtml(finding.id)}">Änderung ablehnen</button><button class="secondary-button" type="button" data-review-change="manual:${escapeHtml(finding.id)}">Manuell bearbeiten</button></div></article>`;
  }
  const api = { statusLabels, renderGate, renderWorkspace };
  globalScope.ModularReviewUi = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
