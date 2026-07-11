# ContentFactory aiWorkflow Bridge Notes

## Uebernommene Konzepte

- Planner: Prompt-Zweck, Anforderungen und Output werden vor Ausfuehrung geprueft.
- Reviewer: Didaktik, Schema und Ergebnisqualitaet werden separat bewertet.
- Security Reviewer: Secrets, Rohtexte, Referenzchunks, Loesungen im Teilnehmerbereich und Auto-Ausfuehrung werden blockiert.
- Final Decision: Das Quality Gate entscheidet passed, warning oder failed und ob ein Provider genutzt werden darf.
- Flexible Clients: Der lokale Provider bleibt Default, OpenAI kann optional nach Gate-Freigabe genutzt werden.
- Prompt Sanitizing: Prompts, Reports und Protokolle speichern keine API-Keys, rawText, textPreview oder Referenzchunks.

## Bewusst nicht integriert

- Kein eigenes aiWorkflow-Frontend.
- Kein aiWorkflow-Backend.
- Keine Worker-Architektur.
- Kein Git-Branch-, PR- oder Issue-Workflow.
- Keine direkte Monorepo-Abhaengigkeit.

## Spaeter moegliche Integration

- ContentFactory kann aiWorkflow als externen Review-Runner aufrufen.
- Generierte Prompts koennen als Workflow-Run geprueft werden.
- Testprotokolle koennen optional in GitHub-Issues oder PRs geschrieben werden.
