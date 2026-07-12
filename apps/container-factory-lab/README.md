# ContainerFactory Lab

ContainerFactory und ContentFactory meinen in diesem Projekt dasselbe Lab. Die aktive, standalone startbare Oberflaeche liegt in `apps/content-factory-lab`; diese Alias-Struktur ist bewusst nicht destruktiv, damit die bestehende Kachel und Electron-App unveraendert bleiben.

## Start

Nutze im Repo-Root:

```cmd
ContentFactoryMainStart.cmd
```

Alle alten Lab-CMD-Starter wurden entfernt. Generierte ZIP-Pakete gehoeren nicht mehr in das Repository.

## Dual-Mode-Ziel

Das Lab erzeugt Draft-Container mit:

- `manifest.json` inklusive `runtimeModes.standalone` und `runtimeModes.platform`
- `standalone/index.html` fuer lokale Tests ohne Plattform
- `platform/adapter.json` fuer spaetere SaaS-Integration
- getrennten Dozenten- und Teilnehmerbereichen
- `source-map.json` und Analyseberichten

Der Teilnehmerbereich darf keine Loesungen enthalten. Kursname, Kurs-ID und Fachbereich aus der Eingabemaske sind die fuehrende Wahrheit.
