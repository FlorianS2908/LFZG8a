# Branch Strategy After Main Cleanup

## Neue Hauptbasis

`main` ist nach dem Fast-Forward-Merge die neue Hauptbasis.

## Umgang mit ueTool_SaaS

`ueTool_SaaS` bleibt vorerst als Referenz- und Backup-Branch erhalten. Der Branch wird nicht geloescht.

## Neue Entwicklung

Neue Arbeit soll von `main` starten.

Empfohlenes Branch-Schema:
- `feature/contentfactory-review-workflow`
- `feature/prompt-quality-gate`
- `feature/dsgvo-review`
- `feature/course-instance-admin`

## DSGVO / Datenschutz

DSGVO- und Datenschutz-Zweige bleiben separat:
- `dsgvo-diagnosefunktionen`
- `origin/dsgvo-diagnosefunktionen`

Diese Zweige werden nicht automatisch in `main` gemergt.

## Merge-Regeln

Vor jedem Merge:
- Secret-Scan ausfuehren.
- `npm run verify` oder das dokumentierte Verify-Aequivalent ausfuehren.
- Feature-Preservation-Check aktualisieren.
- Merge-Report erstellen.
- Kein Force Push.
- Kein `git reset --hard` gegen Remote-Branches.
- Keine grossen Experimente direkt auf `main`.

## Alte Feature-Branches

Alte Feature- und Experiment-Branches koennen spaeter separat geprueft werden:
- `contentFactory`
- `electronDesktop`
- `feature/contentfactory-plan-to-container-mvp`
- `feature/saas-foundation`
- `codex/startview-neustruktur`

Archivierung erst nach manueller Freigabe.
