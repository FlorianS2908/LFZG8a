# ContentFactory Plan-to-Container MVP

## Ziel

Dieser MVP erzeugt einen Kurscontainer-Draft aus Kursdaten und Unterrichtsplan. Materialien, KI und SaaS-Import sind nicht Pflicht. Der Ablauf ist bewusst klein: Plan hochladen, Tage pruefen, Draft erzeugen.

## Ablauf

1. Kursname, Kurs-ID und Fachbereich eintragen.
2. Unterrichtsplan hochladen.
3. Sheet oder Planvariante auswaehlen.
4. Erkannte Kurstage pruefen.
5. Tagesentwuerfe erzeugen.
6. Dual-Mode-Draft exportieren.
7. Analysebericht pruefen.

## Unterrichtsplan als Pflichtanker

Ohne Kursdaten und bestaetigten Unterrichtsplan bleibt der Export gesperrt. Der Parser erkennt `.xlsx` und `.xlsm` als Unterrichtsplan-Dateien. Im Standalone-Browser-Lab wird Excel aktuell robust per Fallback verarbeitet; text-/CSV-artige Planinhalte koennen bereits strukturierte Tagesdaten, UE-Bloecke, Zeiten, Lehraufgaben, Lernaufgaben, Evaluation und Ressourcen abbilden.

## Erzeugte Containerstruktur

Der Draft enthaelt:

- `manifest.json` mit `runtimeModes.standalone` und `runtimeModes.platform`
- `container.json`
- `catalog/days.json`
- `catalog/participant-content.json`
- `catalog/release-keys.json`
- `dozent/tag_XX/webvariante.html`
- `dozent/tag_XX/aufgaben.html`
- `dozent/tag_XX/loesungen.html`
- `teilnehmer/tag_XX/webvariante.html`
- `teilnehmer/tag_XX/aufgaben.html`
- `shared/quiz/tag_XX.json`
- `standalone/index.html`
- `platform/adapter.json`
- `source-map.json`
- Analysebericht

## Standalone-Modus

`standalone/index.html` ist fuer lokale Sichtpruefung gedacht und zeigt klar: "Standalone-Draft: keine echte Plattform-Freigabe". Wenn Browser `file://`-JSON blockieren, duerfen Manifest- und Tagesdaten eingebettet sein.

## Platform-Modus

`platform/adapter.json`, `route-map.json` und `integration.json` bereiten die spaetere Web-/Cloud-Integration vor. Der Container enthaelt keine echten Nutzer, Kursinstanzen oder Datenbanklogik.

## Grenzen

- Noch keine perfekte Excel-Engine im Browser-Lab.
- Noch keine vollstaendige Materialauswertung.
- Keine KI-Pflicht und keine produktive Veroeffentlichung.
- KI-Provider, Materialimport und NamingConsistency bleiben naechste Ausbauschritte.
