# Benoetigte Softwarepakete

## Pflicht

| Paket | Zweck | Hinweis |
| --- | --- | --- |
| Windows | Zielsystem fuer Startskripte und Desktop-App | Aktuelle Automatisierung ist fuer Windows ausgelegt |
| Node.js LTS | Start und Installation der Electron-App | Kann bei Bedarf ueber `winget` installiert werden |
| Electron | Desktop-App fuer Wizard, Kursplattform und lokalen Kursserver | Wird ueber `desktop-app/package.json` installiert |
| npm | Installation der JavaScript-Abhaengigkeiten | Kommt mit Node.js |
| Browser | Teilnehmer-View ueber Kursserver-Adresse | Edge, Chrome oder Firefox reicht |

## Empfohlen

| Paket | Zweck | Hinweis |
| --- | --- | --- |
| Visual Studio Code | Bearbeitung der Projekt-Arbeitsordner | Wird aus der App heraus fuer Arbeitsdateien geoeffnet |
| pnpm | Schnellere und stabile Dependency-Installation | Das Startskript bevorzugt `pnpm`, faellt aber auf `npm` zurueck |
| winget | Automatische Node.js-Installation | Nur noetig, wenn Node.js nicht vorhanden ist |

## Wird aktuell nicht zusaetzlich benoetigt

| Paket | Grund |
| --- | --- |
| React | Der aktuelle Umbau nutzt die bestehende Electron/HTML/JS-Struktur ohne neue UI-Abhaengigkeit |
| Less | Die Projektmaterialien wurden auf CSS umgestellt |
| Separater Webserver | Die Dozenten-App startet den lokalen Kursserver selbst |

## Lokale App-Abhaengigkeiten

Die App-Abhaengigkeiten liegen im Ordner `desktop-app/` und werden ueber `package.json` gesteuert.

```powershell
cd desktop-app
npm install
npm start
```

Alternativ:

```powershell
cd desktop-app
pnpm install
pnpm start
```
