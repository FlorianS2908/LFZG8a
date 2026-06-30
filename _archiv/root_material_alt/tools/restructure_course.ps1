$ErrorActionPreference = "Stop"
$Root = (Resolve-Path ".").Path

function P($rel) { Join-Path $Root $rel }
function EnsureDir($rel) { New-Item -ItemType Directory -Force -Path (P $rel) | Out-Null }
function CopyFile($src, $dst) {
    if (Test-Path -LiteralPath (P $src)) {
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent (P $dst)) | Out-Null
        Copy-Item -LiteralPath (P $src) -Destination (P $dst) -Force
    }
}
function CopyTree($src, $dst) {
    if (Test-Path -LiteralPath (P $src)) {
        New-Item -ItemType Directory -Force -Path (P $dst) | Out-Null
        Copy-Item -LiteralPath (Join-Path (P $src) "*") -Destination (P $dst) -Recurse -Force
    }
}
function ReadText($path) { [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8) }
function WriteText($path, $text) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $path) | Out-Null
    [System.IO.File]::WriteAllText($path, $text, [System.Text.UTF8Encoding]::new($false))
}

function CleanText($text) {
    $r = $text
    $r = $r.Replace("LFZQ8a HTML & CSS", "LFZQ8a HTML & CSS")
    $r = $r.Replace("LFZQ8a HTML & CSS", "LFZQ8a HTML & CSS")
    $r = $r.Replace("LFZQ8a HTML & CSS", "LFZQ8a HTML & CSS")
    $r = $r.Replace("LFZQ8a HTML & CSS", "LFZQ8a HTML & CSS")
    $r = $r.Replace("LFZQ8a", "LFZQ8a")
    $r = $r.Replace("Moderne CSS-Grundlagen", "Moderne CSS-Grundlagen")
    $r = $r.Replace("css-grundlagen", "css-grundlagen")
    $r = $r.Replace("CSS_Techniken_Uebersicht", "CSS_Techniken_Uebersicht")
    $r = $r.Replace("CSS Custom Properties verwenden", "CSS Custom Properties verwenden")
    $r = $r.Replace("CSS Custom Properties", "CSS Custom Properties")
    $r = $r.Replace("CSS Custom Property", "CSS Custom Property")
    $r = $r.Replace("wiederverwendbare CSS-Komponenten und Utility-Klassen", "wiederverwendbare CSS-Komponenten und Utility-Klassen")
    $r = $r.Replace("saubere Selektorstruktur und Komponentenaufbau", "saubere Selektorstruktur und Komponentenaufbau")
    $r = $r.Replace("", "")
    $r = $r.Replace("HTML-und-CSS-Projekt", "HTML-und-CSS-Projekt")
    $r = $r.Replace("CSS-Grundlagen", "CSS-Grundlagen")
    $r = $r.Replace("CSS-Technik", "CSS-Technik")
    $r = $r.Replace("CSS-Technikn", "CSS-Techniken")
    $r = $r.Replace("CSS", "CSS")
    $r = $r.Replace("CSS-Werkzeug", "CSS-Werkzeug")
    $r = $r.Replace("CSS", "CSS")
    $r = $r.Replace("CSS", "CSS")
    $r = $r.Replace("CSS", "CSS")
    $r = $r.Replace("", "")
    $r = $r.Replace("", "")
    $r = $r.Replace("direkt im Browser nutzbar", "direkt im Browser nutzbar")
    $r = $r.Replace("", "")
    $r = $r.Replace("", "")
    $r = $r.Replace("", "")
    $r = $r.Replace("", "")
    $r = $r.Replace("", "")
    $r = $r.Replace("erstellt", "erstellt")
    $r = $r.Replace("erstellt", "erstellt")
    $r = $r.Replace("", "")
    $r = $r.Replace("", "")
    $r = $r.Replace("", "")
    $r = $r -replace "(?i)\bLESS\b", "CSS"
    $r = $r -replace "(?i)\bLess\b", "CSS"
    $r = $r -replace "(?i)\bless\b", "css"
    $r = $r -replace "(?i)\bKI\b", ""
    $r = $r.Replace("HTML & CSS", "HTML & CSS")
    $r = $r.Replace("HTML & CSS", "HTML & CSS")
    $r = $r.Replace("HTML & CSS", "HTML & CSS")
    $r = $r.Replace("HTML-und-CSS", "HTML-und-CSS")
    return $r
}

function CleanParticipant($text) {
    $r = $text
    $r = $r -replace '<div class="file-card"><strong>Dozenten.*?</div>', ''
    $r = $r -replace '<div class="file-card"><strong>Muster.*?</div>', ''
    $r = $r -replace '(?i)Dozentenloesung', 'Hinweis'
    $r = $r -replace '(?i)Dozentenl.sung', 'Hinweis'
    $r = $r -replace '(?i)Musterloesung', 'Beispielstruktur'
    $r = $r -replace '(?i)Musterl.sung', 'Beispielstruktur'
    $r = $r -replace '(?i)Erwartungshorizont', 'Arbeitsziel'
    $r = $r -replace '(?i)Loesungshinweise', 'Bearbeitungshinweise'
    $r = $r -replace '(?i)L.sungshinweise', 'Bearbeitungshinweise'
    $r = $r -replace '(?i)Loesung', 'Aufgabe'
    $r = $r -replace '(?i)L.sung', 'Aufgabe'
    $r = $r -replace '(?i)loesungen_dozent\.html', 'aufgaben_teilnehmer.html'
    $r = $r -replace '(?i)loesung/', 'starter/'
    return $r
}

function AddNav($text, $indexHref) {
    if ($text -match "page-nav") { return $text }
    $style = '<style>.page-nav{display:flex;gap:.75rem;flex-wrap:wrap;margin:1rem}.page-nav a{display:inline-block;padding:.55rem .85rem;border-radius:.5rem;background:#003964;color:#fff;text-decoration:none;font-weight:700}.page-nav a:hover{background:#005180}</style>'
    $nav = '<nav class="page-nav"><a href="' + $indexHref + '">Bereichsuebersicht</a><a href="../../index.html">Hauptuebersicht</a></nav>'
    $r = $text -replace "</head>", "$style</head>"
    $r = $r -replace "<body>", "<body>$nav"
    return $r
}

$dirs = @("dozent/tag_01","dozent/tag_02","dozent/tag_03","dozent/tag_04","dozent/tag_05","dozent/loesungen","dozent/bewertung","dozent/leitfaeden","dozent/quiz","dozent/projekt","teilnehmer/tag_01","teilnehmer/tag_02","teilnehmer/tag_03","teilnehmer/tag_04","teilnehmer/tag_05","teilnehmer/aufgaben","teilnehmer/quiz","teilnehmer/projekt","shared/css","shared/img","shared/grafiken","shared/fonts","shared/assets","_review")
$dirs | ForEach-Object { EnsureDir $_ }

CopyFile "shared/css/course.css" "shared/css/course.css"
CopyFile "shared/assets/course.js" "shared/shared/assets/course.js"
if (Test-Path (P "assets/graphics")) {
    Get-ChildItem -LiteralPath (P "assets/graphics") -File | ForEach-Object {
        $name = $_.Name.Replace("css-grundlagen", "css-grundlagen")
        Copy-Item -LiteralPath $_.FullName -Destination (P ("shared/grafiken/" + $name)) -Force
    }
}

$days = @(
    @{Src="Tag_01_CSS_Grundlagen"; Key="tag_01"; Title="Tag 1 - CSS-Grundlagen und Custom Properties"; Quiz="Tag_01_CSS_Grundlagen"},
    @{Src="Tag_02_Flexbox_Komponenten"; Key="tag_02"; Title="Tag 2 - Flexbox, Navigation und Komponenten"; Quiz="Tag_02_Flexbox_Komponenten"},
    @{Src="Tag_03_CSS_Grid_Layout"; Key="tag_03"; Title="Tag 3 - CSS Grid und Seitenlayout"; Quiz="Tag_03_CSS_Grid_Layout"},
    @{Src="Tag_04_Responsive_Design"; Key="tag_04"; Title="Tag 4 - Responsive Design und Media Queries"; Quiz="Tag_04_Responsive_Design"},
    @{Src="Tag_05_Webfonts_Projekt_Refactoring"; Key="tag_05"; Title="Tag 5 - Webfonts, Refactoring und Abschlussprojekt"; Quiz="Tag_05_Webfonts_Projekt_Refactoring"}
)

foreach ($d in $days) {
    CopyFile "$($d.Src)/webvariante.html" "dozent/$($d.Key)/LFZQ8a_$($d.Key)_Webvariante_Dozent.html"
    CopyFile "$($d.Src)/webvariante.html" "teilnehmer/$($d.Key)/LFZQ8a_$($d.Key)_Webvariante_Teilnehmer.html"
    CopyFile "$($d.Src)/aufgaben_teilnehmer.html" "teilnehmer/$($d.Key)/aufgaben_teilnehmer.html"
    CopyFile "$($d.Src)/aufgaben_teilnehmer.html" "teilnehmer/aufgaben/$($d.Key)_aufgaben.html"
    CopyFile "$($d.Src)/aufgaben_teilnehmer.html" "dozent/$($d.Key)/aufgaben_teilnehmer.html"
    CopyFile "$($d.Src)/loesungen_dozent.html" "dozent/$($d.Key)/loesungen_dozent.html"
    CopyFile "$($d.Src)/loesungen_dozent.html" "dozent/loesungen/$($d.Key)_loesungen_dozent.html"
    CopyTree "$($d.Src)/starter" "teilnehmer/$($d.Key)/starter"
    CopyTree "$($d.Src)/starter" "dozent/$($d.Key)/starter"
    CopyTree "$($d.Src)/loesung" "dozent/$($d.Key)/loesung"
}

CopyTree "Projekte" "teilnehmer/projekt"
CopyTree "Projekte" "dozent/projekt"
CopyFile "00_Leitfaden/Abgabe_Checkliste.html" "teilnehmer/projekt/Abgabe_Checkliste.html"
CopyFile "00_Leitfaden/Dozentenleitfaden.html" "dozent/leitfaeden/Dozentenleitfaden.html"
CopyFile "00_Leitfaden/Wochenplan_Modernes_CSS.html" "dozent/leitfaeden/Wochenplan_HTML_CSS.html"
CopyFile "00_Leitfaden/Wochenplan_LFZQ8a_Modernes_CSS.xlsx" "dozent/leitfaeden/Wochenplan_LFZQ8a_HTML_CSS.xlsx"
CopyFile "00_Leitfaden/Bewertungsraster_Abschlussprojekt.html" "dozent/bewertung/Bewertungsraster_Abschlussprojekt.html"
CopyFile "00_Leitfaden/Aufgabenkatalog_100_Aufgaben.html" "dozent/leitfaeden/Aufgabenkatalog_100_Aufgaben.html"
CopyFile "00_Leitfaden/CSS_Techniken_Uebersicht.html" "dozent/leitfaeden/CSS_Techniken_Uebersicht.html"
CopyFile "00_Leitfaden/Sprachliche_Notiz.html" "_review/Sprachliche_Hinweise.html"
CopyTree "quiz/tag_pools" "teilnehmer/quiz"
CopyTree "quiz/tag_pools" "dozent/quiz"
CopyFile "quiz/lf_zq8a_modernes_css_fragenpool.json" "dozent/quiz/lfzq8a_html_css_fragenpool.json"

$textFiles = Get-ChildItem -LiteralPath $Root -Recurse -File -Include *.html,*.md,*.json,*.css,*.js,*.svg,*.txt | Where-Object { $_.FullName -notmatch "\\.git\\" }
foreach ($f in $textFiles) {
    $t = CleanText (ReadText $f.FullName)
    $t = $t.Replace("../../shared/css/course.css", "../../shared/css/course.css")
    $t = $t.Replace("shared/css/course.css", "shared/css/course.css")
    $t = $t.Replace("../../shared/shared/assets/course.js", "../../shared/shared/assets/course.js")
    $t = $t.Replace("shared/assets/course.js", "shared/shared/assets/course.js")
    $t = $t.Replace("shared/grafiken/css-grundlagen.svg", "shared/grafiken/css-grundlagen.svg")
    $t = $t.Replace("shared/grafiken/", "shared/grafiken/")
    WriteText $f.FullName $t
}

Get-ChildItem -LiteralPath (P "teilnehmer") -Recurse -File -Include *.html | ForEach-Object {
    $t = CleanParticipant (CleanText (ReadText $_.FullName))
    $href = "../../teilnehmer/index_teilnehmer.html"
    if ($_.DirectoryName -eq (P "teilnehmer")) { $href = "index_teilnehmer.html" }
    WriteText $_.FullName (AddNav $t $href)
}
Get-ChildItem -LiteralPath (P "dozent") -Recurse -File -Include *.html | ForEach-Object {
    $t = CleanText (ReadText $_.FullName)
    $href = "../../dozent/index_dozent.html"
    if ($_.DirectoryName -eq (P "dozent")) { $href = "index_dozent.html" }
    WriteText $_.FullName (AddNav $t $href)
}

CopyFile "00_Leitfaden/CSS_Techniken_Uebersicht.html" "00_Leitfaden/CSS_Techniken_Uebersicht.html"
CopyFile "shared/grafiken/css-grundlagen.svg" "shared/grafiken/css-grundlagen.svg"
if (Test-Path (P "00_Leitfaden/CSS_Techniken_Uebersicht.html")) { Move-Item -LiteralPath (P "00_Leitfaden/CSS_Techniken_Uebersicht.html") -Destination (P "_review/CSS_Techniken_Uebersicht_alt.html") -Force }
if (Test-Path (P "shared/grafiken/css-grundlagen.svg")) { Move-Item -LiteralPath (P "shared/grafiken/css-grundlagen.svg") -Destination (P "_review/css-grundlagen_alt.svg") -Force }

$css = '<style>:root{--navy:#003964;--cyan:#00abc7;--ink:#163044;--muted:#5e7384;--bg:#f3f8fb;--card:#fff;--line:#d8e8ee}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:var(--ink);background:linear-gradient(180deg,#eef8fb,#fff)}.hero{background:var(--navy);color:#fff;padding:3rem 1.5rem}.wrap{width:min(1120px,100%);margin:0 auto}.hero p{max-width:760px;color:#d7edf3;font-size:1.1rem;line-height:1.6}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem;padding:2rem 0}.card{display:block;padding:1.4rem;border:1px solid var(--line);border-radius:.5rem;background:var(--card);box-shadow:0 12px 30px rgba(0,57,100,.08);text-decoration:none;color:inherit}.card h2,.card h3{margin-top:0;color:var(--navy)}.badge{display:inline-block;background:#e6fbff;color:var(--navy);border-left:4px solid var(--cyan);padding:.35rem .6rem}.btn{display:inline-block;margin:.35rem .25rem .25rem 0;background:var(--navy);color:#fff;padding:.65rem .9rem;border-radius:.45rem;text-decoration:none;font-weight:700}.btn.secondary{background:#e6fbff;color:var(--navy)}.section{padding:1rem 1.5rem 2rem}.item{padding:1rem;border:1px solid var(--line);border-radius:.5rem;background:#fff;margin:.75rem 0}.toplink{color:#fff}.muted{color:var(--muted)}footer{padding:1.5rem;color:var(--muted)}</style>'

WriteText (P "index.html") "<!doctype html><html lang=""de""><head><meta charset=""utf-8""><meta name=""viewport"" content=""width=device-width, initial-scale=1""><title>LFZQ8a HTML &amp; CSS</title>$css</head><body><header class=""hero""><div class=""wrap""><span class=""badge"">LFZQ8a HTML &amp; CSS</span><h1>LFZQ8a HTML &amp; CSS</h1><p>Zentrale Kursuebersicht fuer die statisch nutzbaren Unterrichtsmaterialien.</p></div></header><main class=""wrap grid""><a class=""card"" href=""dozent/index_dozent.html""><h2>Dozentenbereich oeffnen</h2><p>Leitfaeden, Tagesmaterial, Loesungen, Bewertung, Quizuebersichten und Projektdateien.</p><span class=""btn"">Oeffnen</span></a><a class=""card"" href=""teilnehmer/index_teilnehmer.html""><h2>Teilnehmerbereich oeffnen</h2><p>Webvarianten, Aufgaben, Starterdateien, Quizpools, Projektmaterial und Abgabehinweise ohne Loesungsmaterial.</p><span class=""btn"">Oeffnen</span></a></main><footer class=""wrap"">Statisch nutzbar ohne Server.</footer></body></html>"

$dozentCards = foreach ($d in $days) { "<article class=""card""><h3>$($d.Title)</h3><p><strong>Status:</strong> Webvariante, Aufgaben, Loesungen, Quiz 25, Quiz 50 und Projektdateien vorhanden.</p><a class=""btn"" href=""$($d.Key)/LFZQ8a_$($d.Key)_Webvariante_Dozent.html"">Dozenten-Webvariante</a><a class=""btn secondary"" href=""../teilnehmer/$($d.Key)/LFZQ8a_$($d.Key)_Webvariante_Teilnehmer.html"">Teilnehmer-Webvariante</a><a class=""btn secondary"" href=""$($d.Key)/aufgaben_teilnehmer.html"">Aufgaben</a><a class=""btn secondary"" href=""$($d.Key)/loesungen_dozent.html"">Loesungen</a><a class=""btn secondary"" href=""quiz/$($d.Quiz)_25_Fragen_35_Minuten.json"">Quiz 25</a><a class=""btn secondary"" href=""quiz/$($d.Quiz)_50_Fragen_70_Minuten.json"">Quiz 50</a></article>" }
WriteText (P "dozent/index_dozent.html") "<!doctype html><html lang=""de""><head><meta charset=""utf-8""><meta name=""viewport"" content=""width=device-width, initial-scale=1""><title>Dozentenbereich - LFZQ8a HTML &amp; CSS</title>$css</head><body><header class=""hero""><div class=""wrap""><a class=""toplink"" href=""../index.html"">Zur Hauptuebersicht</a><h1>Dozentenbereich</h1><p>Materialien fuer Vorbereitung, Durchfuehrung, Loesungen, Bewertung und Quizsteuerung im Kurs LFZQ8a HTML &amp; CSS.</p></div></header><main class=""wrap section""><h2>Tagesnavigation</h2><div class=""grid"">$($dozentCards -join '')</div><h2>Leitfaeden und Bewertung</h2><div class=""grid""><a class=""card"" href=""leitfaeden/Wochenplan_HTML_CSS.html""><h3>Wochenplan</h3></a><a class=""card"" href=""leitfaeden/Dozentenleitfaden.html""><h3>Dozentenleitfaden</h3></a><a class=""card"" href=""bewertung/Bewertungsraster_Abschlussprojekt.html""><h3>Bewertungsraster</h3></a><a class=""card"" href=""leitfaeden/Aufgabenkatalog_100_Aufgaben.html""><h3>Aufgabenkatalog</h3></a><a class=""card"" href=""leitfaeden/CSS_Techniken_Uebersicht.html""><h3>CSS-Techniken Uebersicht</h3></a><a class=""card"" href=""quiz/QuizTool_Timer_v9_LFZQ8a_CSS_Pools.html""><h3>Quiztool</h3></a><a class=""card"" href=""../struktur_uebersicht.html""><h3>Strukturuebersicht</h3></a></div></main></body></html>"

$teilCards = foreach ($d in $days) { "<article class=""card""><h3>$($d.Title)</h3><p>Webvariante, Aufgaben, Starterdateien und passende Quizpools. Weitere Dateien koennen im Kursverlauf ergaenzt werden.</p><a class=""btn"" href=""$($d.Key)/LFZQ8a_$($d.Key)_Webvariante_Teilnehmer.html"">Webvariante</a><a class=""btn secondary"" href=""$($d.Key)/aufgaben_teilnehmer.html"">Aufgaben</a><a class=""btn secondary"" href=""$($d.Key)/starter/"">Starterdateien</a><a class=""btn secondary"" href=""quiz/$($d.Quiz)_25_Fragen_35_Minuten.json"">Quiz 25 Fragen</a><a class=""btn secondary"" href=""quiz/$($d.Quiz)_50_Fragen_70_Minuten.json"">Quiz 50 Fragen</a></article>" }
WriteText (P "teilnehmer/index_teilnehmer.html") "<!doctype html><html lang=""de""><head><meta charset=""utf-8""><meta name=""viewport"" content=""width=device-width, initial-scale=1""><title>Teilnehmerbereich - LFZQ8a HTML &amp; CSS</title>$css</head><body><header class=""hero""><div class=""wrap""><a class=""toplink"" href=""../index.html"">Zur Hauptuebersicht</a><h1>Teilnehmerbereich</h1><p>Webvarianten, Aufgaben, Starterdateien, Quizpools und Projektmaterial fuer LFZQ8a HTML &amp; CSS.</p></div></header><main class=""wrap section""><h2>Tageskarten</h2><div class=""grid"">$($teilCards -join '')</div><h2>Projekt und Abgabe</h2><div class=""grid""><a class=""card"" href=""projekt/""><h3>Projektmaterial</h3></a><a class=""card"" href=""projekt/Abgabe_Checkliste.html""><h3>Abgabecheckliste</h3></a><a class=""card"" href=""quiz/QuizTool_Timer_v9_LFZQ8a_CSS_Pools.html""><h3>Quiztool</h3></a></div></main></body></html>"

WriteText (P "README.md") "# LFZQ8a HTML & CSS`n`nDieses Repository enthaelt statisch nutzbare Kursmaterialien fuer LFZQ8a HTML & CSS. Die Unterlagen sind in Dozentenbereich, Teilnehmerbereich und gemeinsame Assets gegliedert.`n`n## Einstieg`n`nOeffnen Sie index.html direkt im Browser.`n`n## Ordnerstruktur`n`n- dozent/ - Leitfaeden, Tagesmaterial, Loesungen, Bewertung, Quizuebersichten und Projektdateien`n- teilnehmer/ - Webvarianten, Aufgaben, Starterdateien, Quizpools, Projektmaterial und Abgabehinweise ohne Loesungsmaterial`n- shared/ - gemeinsame CSS-Dateien, Grafiken, Assets, Bilder und Fonts`n- _review/ - alte, bereinigte Arbeitsstaende ohne direkte Kursverlinkung`n`n## Nutzung`n`nDie Dateien funktionieren ohne Server. JavaScript wird nur fuer bestehende Foliennavigation und Quizfunktionen verwendet.`n`n## Erweiterbarkeit`n`nNeue Tage, Aufgaben, Quizpools oder Webvarianten werden in der passenden Rollenstruktur ergaenzt und in den Index-Dateien verlinkt.`n"
WriteText (P "struktur_uebersicht.html") "<!doctype html><html lang=""de""><head><meta charset=""utf-8""><meta name=""viewport"" content=""width=device-width, initial-scale=1""><title>Strukturuebersicht - LFZQ8a HTML &amp; CSS</title>$css</head><body><header class=""hero""><div class=""wrap""><a class=""toplink"" href=""dozent/index_dozent.html"">Zum Dozentenbereich</a><h1>Strukturuebersicht</h1><p>Orientierung fuer Pflege und Erweiterung der Kursmaterialien.</p></div></header><main class=""wrap section""><div class=""grid""><article class=""card""><h3>Teilnehmermaterialien</h3><p>Unter teilnehmer/ liegen Tageskarten, Aufgaben, Starterdateien, Quizpools und Projektmaterial ohne Loesungsmaterial.</p></article><article class=""card""><h3>Dozentenmaterialien</h3><p>Unter dozent/ liegen Leitfaeden, Loesungen, Bewertung, Quizuebersichten und vollstaendige Projektstaende.</p></article><article class=""card""><h3>Gemeinsame Assets</h3><p>Unter shared/ liegen CSS, JavaScript fuer vorhandene Funktionen, Grafiken, Bilder und Fonts.</p></article></div><div class=""item""><strong>Weiteren Tag ergaenzen:</strong> Ordner in dozent und teilnehmer anlegen, Materialien einfuegen und beide Index-Dateien erweitern.</div><div class=""item""><strong>Neue Aufgabe ergaenzen:</strong> Teilnehmerfassung im Tagesordner ablegen; Loesung oder Erwartungshorizont nur im Dozentenbereich ergaenzen.</div><div class=""item""><strong>Neuen Quizpool ergaenzen:</strong> JSON in teilnehmer/quiz und dozent/quiz ablegen und verlinken.</div><div class=""item""><strong>Neue Webvariante ergaenzen:</strong> Teilnehmerfassung ohne Loesungsmaterial, Dozentenfassung mit Hinweisen speichern.</div></main></body></html>"

Write-Host "Restructure complete"
