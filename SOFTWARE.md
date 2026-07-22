# Softwareübersicht

CourseForge besteht aus einem isolierten Electron-Hauptprozess, einer schmalen Preload-API, dem CourseForge-Renderer und lokalen Kurscompiler-Services. Der Build wird über `desktop-app/package.json` gesteuert und enthält ausschließlich diese Runtime-Dateien, das Ploglan-Logo sowie `packages/content-factory-core` als kompatibel benannte Ressource.

Entwicklung und Prüfung:

```text
npm run dev
npm run check
npm test
npm run build
```

Es existieren keine produktiven Login-, Admin-, Teilnehmer-, Dozenten- oder Kursplattformoberflächen mehr.
