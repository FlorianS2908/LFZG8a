function renderTestProtocolHtml(protocol = {}) {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Testprotokoll ${escapeHtml(protocol.containerId)}</title>
  <style>
    body{font-family:Arial,sans-serif;color:#102033;line-height:1.5;margin:24px;background:#f8fafc}
    main{max-width:1120px;margin:auto}.card{background:#fff;border:1px solid #d8e3f2;border-radius:8px;padding:16px;margin:14px 0}
    table{width:100%;border-collapse:collapse;background:#fff}th,td{border-bottom:1px solid #d8e3f2;text-align:left;padding:8px;vertical-align:top}
    .passed{color:#137333}.warning{color:#9a6700}.failed{color:#b42318}
  </style></head><body><main>
    <h1>Testprotokoll</h1>
    <section class="card"><p><strong>${escapeHtml(protocol.courseName)}</strong> (${escapeHtml(protocol.containerId)})</p><p>Status: <strong class="${escapeHtml(protocol.overallStatus)}">${escapeHtml(protocol.overallStatus)}</strong></p><p>Erstellt: ${escapeHtml(protocol.createdAt)}</p></section>
    <section class="card"><h2>Zusammenfassung</h2><p>Passed: ${escapeHtml(protocol.summary?.passed || 0)} | Warnings: ${escapeHtml(protocol.summary?.warnings || 0)} | Failed: ${escapeHtml(protocol.summary?.failed || 0)} | Manuell: ${escapeHtml(protocol.summary?.manualChecks || 0)}</p></section>
    <section class="card"><h2>Checks</h2>${table(['Gruppe','Check','Status','Meldung','Nachweis'], (protocol.checks || []).map((check) => [check.group, check.label, check.status, check.message, (check.evidence || []).join(' | ')]))}</section>
    <section class="card"><h2>Manuelle Pruefpunkte</h2>${list(protocol.manualChecks || [])}</section>
    <section class="card"><h2>Warnungen</h2>${list(protocol.warnings || [])}</section>
    <section class="card"><h2>Fehler</h2>${list(protocol.errors || [])}</section>
  </main></body></html>`;
}

function table(headers, rows) {
  return `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${(rows.length ? rows : [['-']]).map((row) => `<tr>${headers.map((_, index) => `<td class="${escapeHtml(row[2] || '')}">${escapeHtml(row[index] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function list(items) {
  return items.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p>Keine Eintraege.</p>';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = {
  renderTestProtocolHtml
};
