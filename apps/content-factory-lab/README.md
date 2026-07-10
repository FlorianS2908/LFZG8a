# ContentFactory Standalone Lab

ContentFactory und ContainerFactory meinen in diesem Projekt dasselbe Lab. `apps/container-factory-lab` ist ein Alias, die aktive standalone startbare Version bleibt hier.

Das Lab erzeugt Dual-Mode-Draft-Container:

- lokal testbar ueber `standalone/index.html`
- fuer spaetere SaaS-Integration vorbereitet ueber `platform/adapter.json`
- mit Manifest-`runtimeModes`
- mit getrenntem Dozenten- und Teilnehmerbereich
- ohne Loesungen im Teilnehmerbereich

## Plan -> Container MVP

Der Minimal-MVP kann aus Kursdaten und einem Unterrichtsplan einen Basis-Draft erzeugen. Materialien sind optional. Pro erkanntem Tag entstehen Dozenten-Webvariante, Teilnehmer-Webvariante, Aufgabenplatzhalter, Dozenten-Loesungshinweise, Quizplatzhalter und Review-Datei.

Dieses Lab testet die ContentFactory-Logik isoliert. Es veroeffentlicht nichts in der Haupt-App und veraendert keine bestehenden Kacheln.

## Start

Vom Projektroot:

```powershell
cd apps\content-factory-lab
npm run dev
```

Dann im Browser oeffnen:

```text
http://localhost:5174
```

Ohne npm kann auch direkt gestartet werden:

```powershell
node apps\content-factory-lab\scripts\serve.mjs
```

## Uploadbereiche

- Komplettes Materialpaket als ZIP: `.zip`
- Unterrichtsplan: `.xlsx`, `.xlsm`, `.docx`, `.pdf`, CSV-Fallback
- Materialien mittels KI generieren: keine Datei notwendig, erzeugt Draft-Basis aus Unterrichtsplan und Kursdaten
- Unterrichtsmaterialien: `.pptx`, `.pdf`, `.docx`, `.md`, `.html`, `.ipynb`
- Aufgaben
- Loesungen
- Fragenpools: `.json`, `.xml`, `.docx`, `.txt`
- Projektmaterialien
- Quellcode
- Datenbankmaterial
- Assets
- Sonstige Dateien

Jede Uploadkarte zeigt Zweck, Beispiele, erlaubte Dateitypen und bei sensiblen Bereichen einen Sicherheitshinweis. Die KI-Materialkarte erlaubt den Prozess ohne weitere Materialuploads. Loesungen werden als Dozentenmaterial markiert, Quellcode wird nicht ausgefuehrt, SQL wird nicht ausgefuehrt und ZIP-Pakete zeigen die Regeln fuer `.git`, `node_modules`, `.env` und ausfuehrbare Dateien.

## Wizard-Ablauf

Die Kurscontainer-Erzeugung laeuft als gefuehrter 9-Schritt-Wizard:

1. Kursdaten
2. Unterrichtsplan
3. Materialien hochladen
4. Uploads pruefen
5. Tageszuordnung
6. Lueckenanalyse
7. Tagesvorschau
8. Korrektur & Freigabe
9. Export / Draft-Container erzeugen

Jeder Schritt hat Titel, kurze Erklaerung, Kontextboxen fuer "Was passiert hier?" und "Warum ist das wichtig?", Statusanzeige, Fehler/Warnungen und einen Weiter-Button. Folgeschritte bleiben sichtbar, sind aber gesperrt, bis die Voraussetzungen erfuellt sind.

## Schrittfreigaben

- Unterrichtsplan ist erst offen, wenn Kursdaten gueltig sind.
- Uploads sind erst offen, wenn der Unterrichtsplan hochgeladen und bestaetigt wurde.
- Upload-Pruefung ist erst offen, wenn mindestens ein Material oder ZIP vorhanden ist.
- Tageszuordnung ist erst offen, wenn die Dateianalyse abgeschlossen ist.
- Lueckenanalyse ist erst offen, wenn unklare Dateien bestaetigt, korrigiert oder ignoriert wurden.
- Tagesvorschau ist erst offen, wenn keine kritischen Luecken offen sind.
- Korrektur & Freigabe ist erst offen, wenn mindestens ein Tagesentwurf erzeugt wurde.
- Export ist erst offen, wenn Tage freigegeben wurden oder bewusst "Draft mit offenen Punkten exportieren" aktiviert ist.

Bei Klick auf einen gesperrten Schritt zeigt das Lab eine konkrete Meldung, was fehlt.

## Unterrichtsplan-Pflicht

Ein Draft-Container kann nur erzeugt werden, wenn ein Unterrichtsplan vorhanden ist. Im MVP werden Excel-, Word- und PDF-Inhalte noch nicht vollstaendig binaer geparst; die App erzeugt einen pruefbaren Fallback aus Dateiname und Lab-State.

## Mapping Und Lueckenanalyse

Dateien werden klassifiziert und tageweise zugeordnet. Das Lab zeigt Aufgaben, Loesungen, Quizdateien, Projektmaterialien, Quellcode, SQL, Assets, unklare Dateien, Konflikte und Luecken.

Unklare Dateien blockieren den naechsten Schritt, bis sie bestaetigt, korrigiert oder ignoriert wurden. Kritische Luecken blockieren die Tagesvorschau. Luecken werden in normaler Sprache angezeigt, z. B. "Loesung ohne Aufgabe" oder "Tag im Plan, aber kein Material gefunden".

## Tagesvorschau

Aus Plan und Materialnamen wird eine einfache HTML-Vorschau erzeugt. Automatisch ergaenzte Inhalte sind markiert.

## Export

Der Browser-MVP erzeugt ein JSON-Draft-Bundle mit Zielpfaden und Inhalten. ZIP-Export ist vorbereitet, aber ohne externe ZIP-Bibliothek noch nicht produktiv umgesetzt.

Der Export ist immer ein Draft. Es wird nichts automatisch veroeffentlicht. Die Exportseite zeigt Kursname, Kurs-ID, Fachbereich, Anzahl Tage, Materialien, Aufgaben, Loesungen, Quizdateien, offene Warnungen und den geplanten Exportpfad.

## Sicherheitsregeln

- Quellcode wird nicht ausgefuehrt.
- SQL wird nicht ausgefuehrt.
- `.env` und Secrets werden blockiert.
- `.git`, `node_modules`, `vendor`, `bin`, `obj`, `target`, `.vs`, `.idea`, `.vscode` werden ignoriert oder gewarnt.
- Ausfuehrbare Dateien werden blockiert oder gewarnt.
- Teilnehmerbereich enthaelt keine Loesungen.

## Grenzen Des MVP

- Keine echte Haupt-App-Veroeffentlichung.
- Keine Datenbankmigration.
- Keine echte KI-API.
- Keine produktive ZIP-Erzeugung.
- Excel-Binaerparser ist noch nicht integriert.

## Weg Zurueck In Die Haupt-App

Die Kernlogik liegt in `packages/content-factory-core`. Die bestehende Electron-ContentFactory kann spaeter schrittweise auf dieses Package umgestellt werden.
