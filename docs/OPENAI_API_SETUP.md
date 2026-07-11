# OpenAI API lokal einrichten

1. Falls ein alter Key irgendwo geteilt oder geleakt wurde: Key in der OpenAI Platform sofort loeschen oder rotieren.
2. Neuen API-Key manuell in der OpenAI Platform erzeugen.
3. Billing, Guthaben und ein kleines Kostenlimit fuer den ersten Test pruefen.
4. Key lokal setzen.

## Windows PowerShell

```powershell
setx OPENAI_API_KEY "DEIN_NEUER_KEY"
setx AI_PROVIDER "openai"
setx OPENAI_MODEL "gpt-5.4-mini"
```

Danach Terminal oder App neu starten, damit die Umgebung neu geladen wird.

## Alternative lokale `.env`

```env
AI_PROVIDER=openai
OPENAI_API_KEY=DEIN_NEUER_KEY
OPENAI_MODEL=gpt-5.4-mini
```

## Wichtige Hinweise

- `.env` niemals committen.
- Key nicht in Chat, GitHub, Screenshots oder Logs posten.
- Bei Leak sofort loeschen oder rotieren.
- Fuer den ersten Test kleines Billing- oder Kostenlimit verwenden.
- Ohne Key laeuft die ContentFactory weiter mit Local/Fallback.
