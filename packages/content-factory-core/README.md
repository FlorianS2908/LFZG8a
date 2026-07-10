# ContentFactory Core

Wiederverwendbare Kernlogik fuer das isolierte ContentFactory Standalone Lab.

## Zweck

Das Package kapselt fachliche Logik, die nicht in React-/UI-Komponenten gehoert:

- Upload-Klassifikation
- sichere Pfad- und ZIP-Slip-Pruefung
- Unterrichtsplan-Fallback/Normalisierung
- Tagesmapping
- Lueckenanalyse
- Tagesvorschau
- Draft-Container-Build
- Exportvalidierung
- Analysebericht
- Wizard-State
- Step-Gating
- Uploadbereich-Kontexte
- Wizard-Validierung

## Wizard-Services

Der Wizard ist bewusst zentral gesteuert:

- `wizard-state-service.ts` erzeugt den leeren Wizard-State und stabile Kurs-ID-Vorschlaege.
- `validation-service.ts` prueft Kursdaten, Unterrichtsplan, Uploads, Review-Dateien, kritische Luecken und Exportwarnungen.
- `step-gating-service.ts` entscheidet, ob ein Schritt erreichbar ist und welche verstaendliche Meldung bei Sperrung angezeigt wird.
- `upload-category-service.ts` liefert Titel, Beschreibung, Beispiele, Dateitypen und Sicherheitshinweise der Uploadbereiche.

Die UI darf Step-Freigaben nicht hart in Komponenten verstreuen. Neue Oberflaechen sollen immer den Step-Gating-Service fragen.

## Schrittfreigaben

1. Kursdaten sind Startpunkt.
2. Unterrichtsplan benoetigt gueltige Kursdaten.
3. Uploads benoetigen hochgeladenen und bestaetigten Unterrichtsplan.
4. Upload-Pruefung benoetigt mindestens ein Material oder ZIP.
5. Tageszuordnung benoetigt abgeschlossene Dateianalyse.
6. Lueckenanalyse benoetigt abgeschlossene Review-Entscheidungen fuer unklare/blockierte Dateien.
7. Tagesvorschau benoetigt behandelte kritische Luecken.
8. Korrektur & Freigabe benoetigt mindestens einen Tagesentwurf.
9. Export benoetigt freigegebene/uebersprungene Tage oder bewussten Draft-Export mit offenen Punkten.

## Sicherheitsregeln

- ZIP-Slip wird ueber normalisierte Archivpfade blockiert.
- `.env` und Secret-Dateien werden blockiert.
- `.git`, `node_modules`, `vendor`, `bin`, `obj`, `target`, `.vs`, `.idea`, `.vscode` werden ignoriert oder gewarnt.
- Ausfuehrbare Dateien werden blockiert oder deutlich markiert.
- Quellcode und SQL werden analysiert, aber niemals ausgefuehrt.
- Teilnehmerbereiche duerfen keine Loesungen enthalten.

## Grenzen des MVP

Excel-, Word- und PDF-Dateien werden im MVP noch nicht vollstaendig binaer geparst. Fuer die Lab-Vorschau wird ein sicherer Fallback aus Dateiname und optionalem Text/CSV genutzt. ZIP-Erzeugung ist vorbereitet; der Browser-MVP exportiert zunaechst ein JSON-Bundle ohne externe ZIP-Bibliothek.

Die Lueckenanalyse ist regelbasiert und in verstaendlicher Sprache formuliert. Eine spaetere KI-/API-Erweiterung darf diese Ergebnisse ergaenzen, aber kritische Sicherheitsregeln wie "Loesungen nicht in Teilnehmerbereich" und "Code/SQL nicht ausfuehren" nicht abschwaechen.

## Tests

Vom Projektroot:

```powershell
node packages\content-factory-core\tests\content-factory-core.test.ts
```
