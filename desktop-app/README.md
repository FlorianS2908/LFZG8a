# Desktop-App

`desktop-app` enthält die eigenständige Electron-ContentFactory. Einstieg ist `app/main.js`, das direkt `app/renderer/tool-center/factory.html` lädt. `app/preload.js` stellt ausschließlich ContentFactory-Funktionen bereit.

```text
npm install
npm run dev
npm test
npm run check
npm run build
```

Die Paketdateiliste ist in `package.json` explizit begrenzt. Das Ploglan-Logo wird aus `app/renderer/tool-center/assets/ploglan-logo.png` geladen und mit paketiert.
