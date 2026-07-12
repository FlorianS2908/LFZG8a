const path = require('path');

function generateDemoArtifacts(demoTargets = []) {
  const files = [];
  demoTargets.forEach((target) => {
    files.push({
      path: target.filePath,
      content: contentForDemo(target),
      role: 'teacher',
      kind: 'demo',
      solutionOnly: false,
      metadata: {
        title: target.title,
        reason: 'Dozenten-Demo fuer kurze Vorfuehrung, keine Aufgabenloesung.',
        targetAudienceImpact: 'Demo bleibt standardmaessig Dozentenmaterial.'
      }
    });
    const readmePath = `dozent/tag_${String(target.dayNumber).padStart(2, '0')}/demos/README_Demos.md`;
    if (!files.some((file) => file.path === readmePath)) {
      files.push({ path: readmePath, content: readmeForDay(target.dayNumber), role: 'teacher', kind: 'demo-readme', solutionOnly: false, metadata: { title: 'README_Demos' } });
    }
    if (target.tool === 'browser' && target.filePath.endsWith('/demo.html')) {
      files.push({
        path: path.posix.join(path.posix.dirname(target.filePath), 'demo.css'),
        content: 'body{font-family:Arial,sans-serif;margin:24px;line-height:1.5;color:#102033}.demo-card{border:1px solid #d8e3f2;border-radius:8px;padding:16px;max-width:720px}.accent{color:#0b6fbd;font-weight:700}\n',
        role: 'teacher',
        kind: 'demo',
        solutionOnly: false,
        metadata: { title: 'Demo CSS' }
      });
    }
  });
  return files;
}

function contentForDemo(target) {
  if (target.tool === 'excel') {
    return 'Name;Kategorie;Wert\nBeispiel A;Grundlage;10\nBeispiel B;Vertiefung;25\nBeispiel C;Transfer;40\n';
  }
  if (target.tool === 'word') {
    return '{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\f0\\fs24 Kurzer Beispieltext fuer die Dozenten-Demo.\\par\\par Markieren Sie zentrale Begriffe und leiten Sie daraus muendlich die Arbeitsfrage ab.\\par Dies ist keine Loesung einer Aufgabe.\\par}\n';
  }
  if (target.tool === 'sql') {
    return '-- Diese Datei ist eine Demo und wird nicht automatisch ausgefuehrt.\n-- Oeffnen, lesen und bei Bedarf manuell in einer sicheren SQL-Umgebung besprechen.\nSELECT name, kategorie, wert\nFROM demo_tabelle\nWHERE wert >= 10;\n';
  }
  if (target.tool === 'drawio') {
    return '<mxfile><diagram name="Demo"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" value="Demo Ablauf" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry x="120" y="80" width="160" height="60" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>\n';
  }
  if (target.tool === 'browser') {
    return '<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Live-Demo</title><link rel="stylesheet" href="demo.css"></head><body><main class="demo-card"><h1>Live-Demo</h1><p>Diese kurze Vorschau zeigt ein Thema, ohne die Aufgabe zu loesen.</p><p class="accent">Dozentenimpuls: Beobachten, beschreiben, danach Aufgabe freigeben.</p></main></body></html>\n';
  }
  if (/\.py$/i.test(target.filePath)) {
    return '# Demo-Code fuer den Dozenten. Nicht automatisch ausfuehren.\nwerte = [10, 25, 40]\nprint("Demo-Werte:", werte)\n';
  }
  if (/\.java$/i.test(target.filePath)) {
    return 'public class Main {\n  public static void main(String[] args) {\n    // Demo-Code fuer den Dozenten. Nicht automatisch ausfuehren.\n    System.out.println("Kurzer Demo-Impuls");\n  }\n}\n';
  }
  if (/\.ipynb$/i.test(target.filePath)) {
    return JSON.stringify({ cells: [{ cell_type: 'markdown', metadata: {}, source: ['# Jupyter Demo\\n', 'Nur oeffnen, keinen Notebook-Server automatisch starten.\\n'] }], metadata: { language_info: { name: 'python' } }, nbformat: 4, nbformat_minor: 5 }, null, 2);
  }
  return `# ${target.title}\n\nKurze Dozenten-Demo. Keine Loesung, kein Auto-Run, keine Secrets.\n`;
}

function readmeForDay(dayNumber) {
  return `# Demo-Dateien Tag ${dayNumber}\n\nDiese Dateien sind kurze Dozenten-Demos. Sie werden nur durch bewussten Klick geoeffnet, niemals automatisch ausgefuehrt und sind standardmaessig nicht fuer Teilnehmer freigegeben.\n\nSQL-Dateien werden nur geoeffnet, nicht ausgefuehrt.\n`;
}

module.exports = {
  generateDemoArtifacts
};
