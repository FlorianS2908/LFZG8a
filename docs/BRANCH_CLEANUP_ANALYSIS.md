# Branch Cleanup Analysis

Datum/Uhrzeit: 2026-07-12 11:35 +02:00
Verantwortlicher Prozess: Codex

## Branchliste

Lokale Branches:
- `main`
- `ueTool_SaaS`
- `codex/startview-neustruktur`
- `contentFactory`
- `dsgvo-diagnosefunktionen`
- `electronDesktop`
- `feature/contentfactory-plan-to-container-mvp`
- `feature/saas-foundation`

Remote-Branches:
- `origin/main`
- `origin/ueTool_SaaS`
- `origin/codex/startview-neustruktur`
- `origin/dsgvo-diagnosefunktionen`
- `origin/electronDesktop`
- `origin/feature/contentfactory-plan-to-container-mvp`
- `lernfelder/codex/startview-neustruktur`

## Empfohlene neue Hauptbasis

Empfohlen: `ueTool_SaaS`

Begruendung:
- `main` hat keine eigenen Commits gegenueber `ueTool_SaaS`.
- `ueTool_SaaS` ist 54 Commits vor `main`.
- `ueTool_SaaS` enthaelt die aktuelle Desktop-Plattform, ContentFactory, Adminbereiche, Kursverwaltung, KI-/Provider-Konfiguration, Preflight, Presets, Artefaktgeneratoren, Prompt-/Quality-Gate-Strukturen und Tests.

## Ausgeschlossen

Diese Branches bleiben in diesem Schritt ausgeschlossen und werden nicht gemergt:
- `dsgvo-diagnosefunktionen`
- `origin/dsgvo-diagnosefunktionen`

Hinweis: DSGVO/Datenschutz bleibt separat und wird spaeter gesondert bewertet.

## Spaeter pruefen oder archivieren

Diese Branches koennen spaeter geprueft, archiviert oder geloescht werden, aber nicht in diesem Merge:
- `contentFactory`
- `electronDesktop`
- `feature/contentfactory-plan-to-container-mvp`
- `feature/saas-foundation`
- `codex/startview-neustruktur`
- `origin/electronDesktop`
- `origin/feature/contentfactory-plan-to-container-mvp`
- `origin/codex/startview-neustruktur`
- `lernfelder/codex/startview-neustruktur`

## Analyseergebnis

- Alter main Commit: `ec32523d18efc5f7db137849e36cdf7ad9e2f9d4`
- ueTool_SaaS Commit: `08c0afb216efd4d80ea4f378fbafcb4f1c1699a4`
- `git log --oneline ueTool_SaaS..main`: keine Eintraege
- `git rev-list --count main..ueTool_SaaS`: `54`
- Main ist ein aelterer HTML/CSS-orientierter Stand mit vorhandener Desktop-App-Basis.
- `ueTool_SaaS` ist die aktuelle Plattformbasis.
