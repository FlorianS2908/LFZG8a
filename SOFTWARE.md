# Softwareübersicht

Die Anwendung besteht aus einem isolierten Electron-Hauptprozess, einer schmalen Preload-API, dem ContentFactory-Renderer und lokalen ContentFactory-Services. Der Build wird über `desktop-app/package.json` gesteuert und enthält ausschließlich diese Runtime-Dateien, das Ploglan-Logo sowie `packages/content-factory-core` als Ressource.

Entwicklung und Prüfung:

```text
npm run dev
npm run check
npm test
npm run build
```

Es existieren keine produktiven Login-, Admin-, Teilnehmer-, Dozenten- oder Kursplattformoberflächen mehr.
