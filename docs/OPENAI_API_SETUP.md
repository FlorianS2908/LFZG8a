# OpenAI API fuer die ContentFactory einrichten

## 1. OpenAI Guthaben kaufen

1. OpenAI Platform im Browser oeffnen.
2. Billing-Bereich oeffnen.
3. Zahlungsmethode oder Guthaben hinzufuegen.
4. Fuer den ersten Test ein kleines Startguthaben verwenden, zum Beispiel 5-10 USD.
5. Auto Recharge pruefen und deaktivieren oder niedrig begrenzen.
6. Nach dem Kauf einige Minuten warten, bis das Guthaben aktiv ist.

## 2. API-Key erstellen

1. API Keys in der OpenAI Platform oeffnen.
2. Neuen Project API Key erstellen.
3. Den Key direkt lokal sichern, weil er meist nur einmal vollstaendig sichtbar ist.
4. Key niemals in Chat, GitHub, Screenshots oder Logs posten.

## 3. Key in TXT-Datei speichern

Den Key kurzzeitig in diese lokale Datei schreiben:

```text
Desktop\api_key_ContentFactory.txt
```

Hinweise:

- Datei nur kurzzeitig verwenden.
- Datei nicht in den Projektordner kopieren.
- Datei nicht in GitHub hochladen.
- Das Setup-Script loescht die Datei nach erfolgreicher Uebernahme.

## 4. Setup-Script ausfuehren

PowerShell im Projektroot:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-openai-key-from-txt.ps1
```

Oder mit explizitem Pfad:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-openai-key-from-txt.ps1 -KeyFile "$env:USERPROFILE\Desktop\api_key_ContentFactory.txt"
```

Das Script uebernimmt den Key lokal in `.env`, zeigt ihn nicht an und loescht danach die TXT-Datei.

## 5. Ergebnis pruefen

In der ContentFactory:

1. Bereich `KI-Einstellungen` oeffnen.
2. `KI-Status pruefen` ausfuehren.
3. `OpenAI-Testanfrage senden` ausfuehren.

## 6. Sicherheit

- Geleakte Keys sofort loeschen oder rotieren.
- `.env` nie committen.
- `api_key_ContentFactory.txt` nach Setup loeschen.
- Kostenlimit setzen und niedrig starten.
- Local/Fallback bleibt auch ohne Key verfuegbar.
