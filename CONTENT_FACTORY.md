# ContentFactory

Die ContentFactory ist eine lokale, eigenständige Electron-Anwendung. Sie startet direkt über `desktop-app/app/renderer/tool-center/factory.html` und benötigt weder Login noch Rollen- oder Kursplattformverwaltung.

Produktive Bestandteile:

- Renderer und Ploglan-Branding: `desktop-app/app/renderer/tool-center/`
- ContentFactory-Services: `desktop-app/app/lib/content-factory/`
- Lokale Konfiguration und JSON-Ablage: `desktop-app/app/lib/env/` und `json-store.js`
- Fachkern: `packages/content-factory-core/`

Der geführte Ablauf deckt Kursdaten, Excel-Unterrichtsplan, Materialien, Curriculum, Didaktik, Generierung, Referenzquellen, KI-Fallback, Abschlussprüfung und Export ab. `.xlsm` wird nur gelesen; Makros werden nicht ausgeführt.
