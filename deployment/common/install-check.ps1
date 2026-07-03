param(
  [ValidateSet('Dozent', 'Teilnehmer')]
  [string]$Role = 'Dozent',
  [switch]$Start,
  [switch]$WizardTest,
  [string]$ParticipantUrl = ''
)

$ErrorActionPreference = 'Stop'

function Write-Step {
  param([string]$Message)
  Write-Host "[LFZQ8a] $Message"
}

function Get-RootDir {
  $scriptDir = Split-Path -Parent $PSCommandPath
  return (Resolve-Path (Join-Path $scriptDir '..\..')).Path
}

function Test-Command {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Install-WithWinget {
  param(
    [string]$Id,
    [string]$Name
  )

  if (-not (Test-Command 'winget')) {
    throw "$Name fehlt und winget ist nicht verfuegbar. Bitte $Name manuell installieren."
  }

  Write-Step "Installiere $Name ueber winget..."
  winget install -e --id $Id --silent --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) {
    throw "$Name konnte nicht ueber winget installiert werden."
  }
}

function Ensure-Node {
  if (Test-Command 'node') {
    Write-Step "Node.js ist vorhanden."
    return
  }

  Install-WithWinget -Id 'OpenJS.NodeJS.LTS' -Name 'Node.js LTS'
  $env:PATH = "$env:ProgramFiles\nodejs;$env:ProgramFiles(x86)\nodejs;$env:PATH"

  if (-not (Test-Command 'node')) {
    throw 'Node.js wurde installiert, ist aber noch nicht im aktuellen Fenster verfuegbar. Bitte Starter erneut ausfuehren.'
  }
}

function Ensure-VSCode {
  $codeCandidates = @(
    (Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\Code.exe'),
    (Join-Path $env:ProgramFiles 'Microsoft VS Code\Code.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Microsoft VS Code\Code.exe')
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

  if ($codeCandidates.Count -gt 0 -or (Test-Command 'code')) {
    Write-Step "Visual Studio Code ist vorhanden."
    return
  }

  Install-WithWinget -Id 'Microsoft.VisualStudioCode' -Name 'Visual Studio Code'
}

function Find-Electron {
  param([string]$AppDir)

  if (-not (Test-Path -LiteralPath (Join-Path $AppDir 'node_modules'))) {
    return $null
  }

  return Get-ChildItem -LiteralPath (Join-Path $AppDir 'node_modules') -Recurse -Filter 'electron.exe' -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
}

function Ensure-AppDependencies {
  param([string]$RootDir)

  $appDir = Join-Path $RootDir 'desktop-app'
  $packageJson = Join-Path $appDir 'package.json'

  if (-not (Test-Path -LiteralPath $packageJson)) {
    throw "desktop-app\package.json wurde nicht gefunden. Dieses Paket ist kein vollstaendiges Dozentenpaket."
  }

  $electron = Find-Electron -AppDir $appDir
  if ($electron) {
    Write-Step "Electron ist vorhanden."
    return $electron
  }

  Ensure-Node
  Write-Step "Installiere App-Abhaengigkeiten..."
  Push-Location $appDir
  try {
    if (Test-Command 'pnpm') {
      pnpm install
    } else {
      npm install
    }
    if ($LASTEXITCODE -ne 0) {
      throw 'Installation der App-Abhaengigkeiten ist fehlgeschlagen.'
    }
  } finally {
    Pop-Location
  }

  $electron = Find-Electron -AppDir $appDir
  if (-not $electron) {
    throw 'Electron konnte nach der Installation nicht gefunden werden.'
  }

  return $electron
}

function Start-TeacherApp {
  param(
    [string]$RootDir,
    [string]$ElectronExe
  )

  $appDir = Join-Path $RootDir 'desktop-app'
  $args = @('.')
  if ($WizardTest) {
    $args += '--wizard-test'
  }

  Write-Step "Starte Dozenten-App..."
  Start-Process -FilePath $ElectronExe -ArgumentList $args -WorkingDirectory $appDir
}

function Start-ParticipantView {
  param([string]$RootDir)

  if ($ParticipantUrl) {
    Write-Step "Oeffne Teilnehmer-Adresse: $ParticipantUrl"
    Start-Process $ParticipantUrl
    return
  }

  $localIndex = Join-Path $RootDir 'teilnehmer\index_teilnehmer.html'
  if (-not (Test-Path -LiteralPath $localIndex)) {
    throw 'teilnehmer\index_teilnehmer.html wurde nicht gefunden.'
  }

  Write-Step 'Oeffne lokale Teilnehmeruebersicht.'
  Start-Process $localIndex
}

$rootDir = Get-RootDir
Write-Step "Paketordner: $rootDir"

if ($Role -eq 'Dozent') {
  Ensure-VSCode
  $electronExe = Ensure-AppDependencies -RootDir $rootDir
  if ($Start) {
    Start-TeacherApp -RootDir $rootDir -ElectronExe $electronExe
  }
} else {
  Ensure-VSCode
  if ($Start) {
    Start-ParticipantView -RootDir $rootDir
  }
}

Write-Step 'Pruefung abgeschlossen.'
