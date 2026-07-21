# Modulares KI-Reviewsystem

## Architektur

Das Review-System ergänzt die bestehende ContentFactory, ersetzt aber weder Wizard, Persistenz noch KI-Orchestrierung. `review-core` enthält ausschließlich wiederverwendbare Domänenregeln. `review-ai` baut Prompts, abstrahiert Provider und validiert Antworten. `artifact-adapters` kapselt Formate. Die ContentFactory-spezifischen, versionierten Kriterien liegen separat unter `content-factory/review`. Die bestehende Renderer-UI stellt Status, Findings, Entscheidungen, Verlauf und menschliche Freigabe dar.

Der Ablauf lautet `editing → ready_for_review → review_running → ready_for_approval → review_passed`. Nacharbeit, fachliches Scheitern und technische Fehler sind eigene Zustände. `completionPassed` und `reviewPassed` bleiben getrennt. Ungültige Übergänge werden abgewiesen. Eine relevante Änderung invalidiert eine Freigabe; alte Artefakt- und Reviewversionen bleiben erhalten.

## Definitionen und Ergebnis

Eine Definition besitzt ID, semantische Version, Scope (`phase`, `task`, `artifact`), Eingabeselektoren, gewichtete Kriterien, Passregeln, Prompt-Template und Ergebnisschema. Beim Laden werden Pflichtwerte, Scope, eindeutige Kriterien und Mindestscore geprüft. Der Startwert liegt bei 80/100, ohne offene Blocker und mit verpflichtender menschlicher Freigabe.

```js
{
  id: 'contentfactory.lesson-plan', version: '1.0.0', phaseId: 'lesson-plan', scope: 'phase',
  inputSelectors: ['anchor', 'analysis'],
  criteria: [{ id: 'lesson-plan.1', title: 'Pflichtquelle vorhanden', weight: 1, blocking: true, evidenceRequired: true }],
  passRules: { minimumScore: 80, noBlockingFindings: true, requireHumanApproval: true },
  promptTemplateId: 'contentfactory-phase-review-v1', outputSchemaId: 'review-result-v1'
}
```

Validierte Ergebnisse enthalten Schema-, Review- und Definitionsversion, Entscheidung, Score, Einzelkriterien, Findings mit konkreter Evidenz sowie vorgeschlagene Änderungen. Beispiel:

```json
{"schemaVersion":"1.0","reviewId":"review-1","definitionId":"contentfactory.lesson-plan","definitionVersion":"1.0.0","decision":"changes_requested","score":78,"summary":"Eine UE-Zuordnung fehlt.","criteria":[],"findings":[{"id":"f-1","criterionId":"lesson-plan.3","severity":"blocking","title":"UE fehlt","explanation":"Die Zeile besitzt keine UE.","evidence":[{"artifactId":"wochenplan","sheetName":"Plan","cellAddress":"C14"}],"status":"open"}],"proposedChanges":[]}
```

## Prompt und Sicherheit

Der zentrale Builder kombiniert allgemeine Regeln, Definition, Phasenkontext, frühere Ergebnisse, Artefakte, deterministische Prüfungen, vorherige Reviews, Kommentare und Entscheidungen. Importierte Inhalte werden ausdrücklich als nicht vertrauenswürdige Daten markiert. API-Schlüssel gehören nie in Prompt oder Logs. KI-Ausgaben ändern ohne Schemaerfolg und Nutzerentscheidung keinen Zustand. Doppelrequests, Timeout und Abbruch werden kontrolliert behandelt; technische Fehler sind kein fachliches Nichtbestehen.

XLSX/XLSM werden über die vorhandene ZIP/XML-Analyse schreibgeschützt gelesen. Makros und externe Verknüpfungen werden nicht ausgeführt. Blattnamen und Bereiche können als Evidenz (`sheetName`, `cellAddress`) referenziert werden. Direkte Tabellenbearbeitung bleibt deaktiviert. DOCX, PPTX, PDF, PNG, JPEG und IPYNB sind als spätere, zunächst nur lesende/kommentierende Adapter vorgesehen.

## Erweiterung

Eine neue Definition wird in der ContentFactory-Konfiguration ergänzt und beim Laden validiert. Ein neuer Dateityp implementiert `supports`, `extractReviewContent`, `validate`, `createPreviewModel` und `applyChanges` und wird in der Adapter-Registry registriert. Ein Provider implementiert `review(request, { signal })` und wird dem Review-Service übergeben.

Altprojekte ohne Reviewdaten werden kontrolliert migriert: bisher erledigte Schritte erhalten `completionPassed: true`, `reviewPassed: false` und `ready_for_review`; offene Schritte starten in `editing`. Die erste Ausbaustufe bietet vollständige textbasierte Adapter und eine schreibgeschützte Spreadsheet-Vorschau. Objektbasierte Office-, PDF- und Bildbearbeitung bleibt einem Folgebranch vorbehalten.
