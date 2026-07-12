# Kurscontainer Demo-Workflow

## Unterrichtslogik

1. Webvariante erklaert das Thema.
2. Dozent klickt Demo-Button.
3. Passende Arbeitsumgebung oeffnet sich in der Electron-App.
4. Dozent demonstriert kurz.
5. Aufgaben werden ueber Freigabezentrum freigegeben.
6. Teilnehmer bearbeiten freigegebene Inhalte.

## Demo-Arten

- Excel/CSV
- Word/RTF
- VS Code
- SQL-Datei
- HTML/CSS Browser
- Draw.io
- Jupyter

## Sicherheitsregeln

- Kein Auto-Run
- Keine EXE
- Keine BAT/CMD/PS1/MSI/VBS/JS als direktes Demo-Ziel
- Keine SQL-Ausfuehrung
- Keine Loesungen im Teilnehmerbereich
- Keine Secrets
- Keine Referenzliteratur
- Demo-Pfade bleiben container-relativ

## Standalone

Standalone-Drafts starten keine lokalen Programme. Sie zeigen nur Hinweise auf die Demo-Dateien im Containerordner. Der direkte Demo-Launch ist der Electron-App vorbehalten.
