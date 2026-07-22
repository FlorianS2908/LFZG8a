# UI-/UX-Bestandsaufnahme von CourseForge

Stand: 21.07.2026, Branch `agent/contentfactory-standalone`, Commit `8f12f1ca61a8c0557dd4c69d14741ce559eab674`.

## Bestehende Informationsarchitektur und Hauptabläufe

Die Anwendung startet direkt in `renderer/tool-center/factory.html`. Die Oberfläche besitzt sieben gleichrangige obere Tabs: Start, Kurscontainer erstellen, Container verwalten, Container duplizieren, Rohdaten/Experte, Referenzbibliothek und Import-Batches/Zuordnungen. Die Startseite wiederholt vier dieser Wege als große Kacheln. Der Kurserstellungsworkflow zeigt zusätzlich zwölf einzelne Schritte. Damit konkurrieren Hauptnavigation, Schnellzugriffe und Wizard-Navigation miteinander.

Der Renderer `factory.js` umfasst rund 2.300 Zeilen und verbindet Zustand, HTML-Erzeugung, Navigation, Fachworkflow-Aufrufe und Ereignisbindung. Wiederverwendbar sind die vorhandene Zustandsstruktur, `escapeHtml`, Upload-Helfer, Workflow-Gates, Statusmodell und die bestehende Fach-/IPC-Anbindung. Service-, Import-, Analyse-, Generator- und IPC-Logik muss für die UI-Neustrukturierung nicht geändert werden.

## Festgestellte Probleme

- Sieben gleichgewichtete Tabs überfordern den Einstieg; Expertenfunktionen wirken wie Standardwege.
- Startkacheln duplizieren die Tabnavigation und verwenden technische Kürzel (`CE`, `CV`, `RF`, `EX`).
- Zwölf gleichzeitig sichtbare Wizard-Schritte vermitteln Detailtiefe statt Fortschritt; interne Schritt-IDs können jedoch erhalten bleiben.
- Technische Begriffe wie Preflight, Container-Draft, Import-Batch, Staging und Golden Tests erscheinen ohne konsistente Übersetzung.
- Viele sichtbare Texte verwenden ASCII-Umschreibungen (`Fuer`, `Loesungen`, `pruefen`, `ausgewaehlt`).
- Dynamische Neurenderings über `innerHTML` erhalten den Fokus nicht systematisch.
- Aktive Tabs sind hauptsächlich visuell markiert; `aria-current` und ein klarer Seitentitel fehlen.
- Es gibt keinen Skip-Link. Statusmeldungen besitzen nicht durchgehend `aria-live`/`role=status`.
- Dropzones haben zwar `tabindex=0`, die Tastaturalternative und der Zweck sind aber nicht einheitlich erklärt.
- Formulargruppen bestehen überwiegend aus verschachtelten Labels, ohne `fieldset`, `legend`, Pflicht-/Optionalhinweise oder verbundene Hilfetexte.
- `workspace.css` enthält nachweislich Plattformregeln für Login, Profile, Landingpage, Quiz und frühere Ansichten. Die ContentFactory verwendet nur einen Teil davon.
- Der Pfad `renderer/tool-center` und die dort verbliebenen Login-/Admin-/Kursdateien sind technische UI-Altlasten; sie werden zwar nicht paketiert oder gestartet, erschweren aber Wartung und Analyse.
- Große Tabellen, sticky Aktionen und schmale Fenster sind nicht als zusammenhängendes 1024×720-Layout gestaltet.

## Accessibility- und Darstellungsrisiken

Die vorhandenen nativen Buttons und Inputs sind eine gute Basis. Risiken bestehen bei Fokusverlust nach vollständigem Neurendering, fehlenden programmatischen Aktivzuständen, unzureichend beschriebenen Sperrgründen, Status nur über Farbe sowie dicht gepackten Formularen. Drag-and-drop muss weiterhin per Dateiauswahl bedienbar bleiben. Kontrast, Fokusdarstellung, reduzierte Bewegung und Zielgrößen benötigen zentrale Design-Tokens statt verstreuter Altstyles.

## Zielstruktur

Die sichtbare Desktopstruktur erhält einen kompakten Header, eine seitliche Hauptnavigation mit fünf Standardbereichen, einen klar betitelten Arbeitsbereich und eine feste Status-/Aktionszeile. Expertenfunktionen liegen in einem standardmäßig eingeklappten Bereich. Schnellzugriffe auf der Startseite ergänzen die Navigation, bilden sie aber nicht vollständig nach.

Der Wizard behält seine zwölf internen Schritt-IDs und Gates, stellt sie aber in sechs verständlichen Hauptphasen dar: Grundlagen, Unterrichtsplan, Inhalte und Materialien, Kursstruktur, Generierung sowie Prüfen und Exportieren. Renderer-Komponenten und Styles werden in `renderer/content-factory/` gegliedert; die bestehende Fachlogik bleibt unverändert.

## Matrix

| Bereich | Aktuelles Problem | UX-Auswirkung | Geplante Änderung | Fachlogik betroffen |
|---|---|---|---|---:|
| Hauptnavigation | Sieben gleichrangige Tabs | Einstieg und Priorität unklar | Fünf Standardbereiche plus eingeklappter Expertenbereich | Nein |
| Startseite | Duplizierte Navigation, technische Kürzel | Keine eindeutige Hauptaktion | Ruhiges Dashboard mit „Neuen Kurs erstellen“, Fortsetzen und Status | Nein |
| Wizard | Zwölf sichtbare Einzelschritte | Fortschritt wirkt komplex | Sechs Phasen, interne Schritte bleiben erhalten | Nein |
| Formulare | Wenig Gruppierung und Hilfetextverknüpfung | Pflichtangaben und Fehler schwer verständlich | Fieldsets, Legends, Hilfetexte und Fehlerzusammenfassung | Nein |
| Upload | Zweck und Status uneinheitlich | Unsicherheit bei Hauptquelle und optionalen Dateien | Pflichtkennzeichnung, Typen, Makrohinweis, Tastaturalternative | Nein |
| Status/Feedback | Teilweise nur Farbe oder technischer Text | Fehler und nächste Aktion unklar | Textstatus, `aria-live`, konkrete Handlungsanweisung | Nein |
| Microcopy | ASCII-Umlaute und Fachbegriffe | Unprofessionell und technisch | Korrektes Deutsch, verständliche Begriffe | Nein |
| Renderer | Monolithischer `factory.js` | Hohe Änderungs- und Regressiongefahr | Navigation, Zustand und Komponenten modularisieren | Nein |
| CSS | Plattformstyles und globale Altregeln | Unklare Hierarchie, schwer wartbar | ContentFactory-spezifisches Tokens-/Layout-/Komponentensystem | Nein |
| Accessibility | Skip-Link, Fokuswiederherstellung und Aktivzustände fehlen | Tastatur-/Screenreader-Nutzung erschwert | Landmarken, Fokusmanagement, ARIA-Zustände, reduzierte Bewegung | Nein |

## Risiken für bestehende Funktionen

Das größte Risiko ist eine verlorene Ereignisbindung nach dynamischem Rendering. Deshalb bleiben Datenattribute und IPC-Aufrufe zunächst kompatibel; Navigation und Phasendarstellung werden als UI-Schicht über die vorhandenen Schritt-IDs gelegt. Ein Pfadwechsel erfordert gleichzeitig Anpassungen in `main.js`, Paketdateiliste, Tests und relativen Assets. Persistenzänderungen und neue Frameworks sind ausdrücklich nicht erforderlich.

## Prüfnachweis und Einschränkungen

Nach der Umsetzung bestanden sechs UI-/Accessibility-Strukturtests und 32 ContentFactory-Core-Regressionstests. Die gemessene Fachlogik-Coverage beträgt 87,49 % Zeilen, 74,09 % Branches und 81,36 % Funktionen. Syntaxprüfung, Electron-Build und ein erweiterter Electron-Smoke-Test waren erfolgreich; der Smoke-Test bestätigt Produktname, fünf Hauptnavigationspunkte, sechs Phasen, geladenes Navigationsmodul und genau einen aktiven Hauptbereich.

Eine automatisierte visuelle Screenshotserie war in dieser Arbeitsumgebung nicht belastbar möglich: Der kontrollierte Browser blockierte den direkten lokalen Dateizugriff durch seine URL-Sicherheitsrichtlinie; lokale HTTP-Aufrufe wurden auf eine andere vorhandene Kursvorschau geroutet. Entsprechend wurden keine irreführenden Screenshots erzeugt. DOM-, CSS-, Responsive-, Paket-, Build- und Electron-Smoke-Prüfungen wurden stattdessen ausgeführt. Manuelle Kontrast-, Fokusreihenfolge-, Dialog- und vollständige End-to-End-Workflow-Prüfungen mit realen Projektdaten bleiben als Abnahme in einer interaktiven Electron-Sitzung empfohlen.
