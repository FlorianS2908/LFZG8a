param(
  [string]$KeyFile = "C:\Users\Florian.Schaffer\OneDrive - Amadeus Fire AG\Desktop\api_key_ContentFactory.txt"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot ".env"
$prefix = "s" + "k-"

function Read-EnvFile {
  param([string]$Path)
  $values = [ordered]@{}
  if (-not (Test-Path $Path)) { return $values }
  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { return }
    $idx = $line.IndexOf("=")
    $key = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    $values[$key] = $value
  }
  return $values
}

try {
  if (-not (Test-Path -LiteralPath $KeyFile)) {
    Write-Host "Key-Datei wurde nicht gefunden."
    exit 1
  }

  $apiKey = (Get-Content -LiteralPath $KeyFile -Raw).Trim()
  if (-not $apiKey.StartsWith($prefix) -or $apiKey.Length -lt 20) {
    Write-Host "Der gelesene Wert sieht nicht wie ein OpenAI API-Key aus."
    exit 1
  }

  $envValues = Read-EnvFile -Path $envPath
  $envValues["AI_PROVIDER"] = "openai"
  $envValues["OPENAI_API_KEY"] = $apiKey
  if (-not $envValues.Contains("OPENAI_MODEL")) { $envValues["OPENAI_MODEL"] = "gpt-5.4-mini" }
  if (-not $envValues.Contains("OPENAI_TIMEOUT_MS")) { $envValues["OPENAI_TIMEOUT_MS"] = "30000" }
  if (-not $envValues.Contains("OPENAI_MAX_PROMPT_CHARS")) { $envValues["OPENAI_MAX_PROMPT_CHARS"] = "40000" }
  if (-not $envValues.Contains("CONTENT_FACTORY_AI_REVIEW")) { $envValues["CONTENT_FACTORY_AI_REVIEW"] = "false" }
  if (-not $envValues.Contains("CONTENT_FACTORY_COST_WARNING_USD")) { $envValues["CONTENT_FACTORY_COST_WARNING_USD"] = "1.00" }

  $lines = foreach ($item in $envValues.GetEnumerator()) { "$($item.Key)=$($item.Value)" }
  Set-Content -LiteralPath $envPath -Value $lines -Encoding UTF8
  Write-Host "OpenAI API-Key wurde lokal in .env uebernommen."

  try {
    Remove-Item -LiteralPath $KeyFile -Force
    Write-Host "Die TXT-Datei wurde geloescht."
  } catch {
    Write-Host "TXT-Datei konnte nicht geloescht werden. Bitte manuell loeschen."
  }

  Write-Host "ContentFactory kann jetzt OpenAI nutzen. Der Key wurde nicht angezeigt."
} catch {
  Write-Host "OpenAI-Key-Setup konnte nicht abgeschlossen werden."
  exit 1
}
