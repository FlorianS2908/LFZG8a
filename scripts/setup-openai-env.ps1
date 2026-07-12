$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot ".env"

if (Test-Path $envPath) {
  Write-Host ".env existiert bereits. Es wird nichts ueberschrieben."
  Write-Host "Bitte Datei lokal manuell pruefen oder vorher sichern."
  exit 0
}

$apiKey = Read-Host "OpenAI API-Key lokal eingeben"
$prefix = "s" + "k-"
if (-not $apiKey.StartsWith($prefix)) {
  Write-Host "Der Key sieht nicht plausibel aus. Erwartet wird ein gueltiger OpenAI-Key-Praefix."
  exit 1
}

$lines = @(
  "AI_PROVIDER=openai",
  "OPENAI_API_KEY=$apiKey",
  "OPENAI_MODEL=gpt-5.4-mini",
  "OPENAI_TIMEOUT_MS=30000",
  "OPENAI_MAX_PROMPT_CHARS=40000",
  "CONTENT_FACTORY_AI_REVIEW=false",
  "CONTENT_FACTORY_COST_WARNING_USD=1.00"
)

Set-Content -Path $envPath -Value $lines -Encoding UTF8
Write-Host ".env wurde lokal erstellt. Der Key wurde nicht erneut ausgegeben."
Write-Host ".env ist in .gitignore eingetragen und darf nicht committed werden."
