# ContainerFactory Core

ContainerFactory und ContentFactory meinen in diesem Projekt dasselbe System. Dieses Paket ist ein Alias fuer `packages/content-factory-core`, damit die spaetere SaaS-/Web-Architektur bereits unter dem fachlich passenderen Namen importieren kann.

Der Core erzeugt Draft-Container im Dual-Mode:

- `standalone/index.html` fuer lokale Vorschau ohne Plattform
- `platform/adapter.json` fuer spaetere Web-/Cloud-Integration
- `manifest.json` mit `runtimeModes.standalone` und `runtimeModes.platform`
- getrennte Dozenten- und Teilnehmerbereiche ohne Loesungen im Teilnehmerbereich

Keine API-Keys, keine Datenbanklogik und keine produktive Freigabe sind enthalten.
