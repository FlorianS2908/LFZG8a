# OpenAI sicher in der ContentFactory einrichten

OpenAI ist der produktive Cloud-KI-Provider. Ohne Schlüssel bleibt der klar gekennzeichnete lokale Mock-/Offline-Fallback verfügbar; automatisierte Tests verwenden ausschließlich diesen Fallback und Dummy-Werte.

## Sichere Ersteinrichtung unter Windows

1. Unter `KI-Einstellungen` **API-Schlüssel aus Datei importieren** wählen und eine lokale `.txt`-Datei bestätigen – oder **API-Schlüssel eingeben/ersetzen** verwenden.
2. Electron verarbeitet den Wert ausschließlich im Main-Prozess und verschlüsselt ihn mit `safeStorage`, das unter Windows an das lokale Benutzerkonto gebunden ist.
3. Gespeichert wird nur die verschlüsselte Darstellung innerhalb von Electrons `userData`. Repository, Installationsordner, Renderer, Browser-Storage und Kurscontainer erhalten den Schlüssel nicht.
4. **KI-Status prüfen** und anschließend **Verbindung testen** wählen. Der Test sendet nur eine minimale JSON-Anfrage ohne Kursmaterial.

Die Importdatei wird nur gelesen und nicht verändert oder gelöscht. Ein bereits eingerichteter Schlüssel wird beim einmaligen lokalen Migrationsimport nicht automatisch überschrieben. Import, Ersetzen und Entfernen erfordern eine Bestätigung.

Die Oberfläche kann ausschließlich Konfigurationsstatus, Provider, Modell, Verbindungsstatus und Zeitpunkt des letzten erfolgreichen Tests abrufen. Es existiert keine IPC-Funktion zum Auslesen des Schlüssels.

## Modell und Quellenpriorität

`OPENAI_MODEL` konfiguriert das Standardmodell zentral. Token-, Timeout- und Kostenbegrenzungen stehen in `.env.example`; dort bleiben Schlüsselwerte leer. Schlüsselquellen werden in dieser Reihenfolge verwendet:

1. verschlüsselter ContentFactory-Schlüsselspeicher,
2. `OPENAI_API_KEY` in der Prozessumgebung als bewusste Entwicklungsalternative,
3. kein Schlüssel: Offline-Fallback und Einrichtungshinweis.

## Verwaltung und Sicherheit

- **API-Schlüssel eingeben/ersetzen** tauscht den gespeicherten Wert nach Bestätigung aus.
- **Gespeicherten Schlüssel entfernen** löscht die verschlüsselte Nutzlast und Verbindungsmetadaten.
- Wenn `safeStorage` nicht verfügbar ist, wird niemals unverschlüsselt gespeichert.
- Logs und Renderer-Fehler werden bereinigt; Authorization-Header, Schlüssel, verschlüsselte Payloads und vollständige sensible Prompts werden nicht protokolliert.
- Ein möglicherweise offengelegter Schlüssel muss in der OpenAI Platform widerrufen und neu erstellt werden.

## Unterstützte KI-Workflows

Die ContentFactory analysiert und klassifiziert Materialien, erkennt Unterrichtspläne, strukturiert Themen nach Tagen, erzeugt und überarbeitet Curricula, Tagesgliederungen, Webvarianten, Aufgaben, getrennte Lösungen, Handouts, Begleitmaterialien und validierte Fragenpools. Strukturierte Ergebnisse werden vor dem Speichern validiert; Teilnehmerausgaben dürfen keine Lösungen enthalten.

## Befehle

```text
npm start
npm test
npm run check
npm run build
npm run package
```

Der manuelle Verbindungstest ist zusätzlich mit `pnpm --dir desktop-app test:openai-connection` verfügbar und gibt nur eine neutrale Erfolg- oder Fehlermeldung aus.
