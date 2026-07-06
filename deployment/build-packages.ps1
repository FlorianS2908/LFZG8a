param(
  [string]$Configuration = 'Release'
)

$ErrorActionPreference = 'Stop'

function Write-Step {
  param([string]$Message)
  Write-Host "[LFZQ8a Build] $Message"
}

function Copy-ItemSafe {
  param(
    [string]$Source,
    [string]$Destination
  )

  if (-not (Test-Path -LiteralPath $Source)) {
    throw "Quelle fehlt: $Source"
  }

  Copy-Item -LiteralPath $Source -Destination $Destination -Recurse -Force
}

function Copy-DirectoryExcluding {
  param(
    [string]$Source,
    [string]$Destination,
    [string[]]$ExcludedDirectoryNames = @()
  )

  if (-not (Test-Path -LiteralPath $Source)) {
    throw "Quelle fehlt: $Source"
  }

  New-Item -ItemType Directory -Path $Destination -Force | Out-Null

  Get-ChildItem -LiteralPath $Source -Force | ForEach-Object {
    if ($_.PSIsContainer -and $ExcludedDirectoryNames -contains $_.Name) {
      return
    }

    $target = Join-Path $Destination $_.Name
    if ($_.PSIsContainer) {
      Copy-DirectoryExcluding -Source $_.FullName -Destination $target -ExcludedDirectoryNames $ExcludedDirectoryNames
    } else {
      Copy-Item -LiteralPath $_.FullName -Destination $target -Force
    }
  }
}

function New-CleanDirectory {
  param([string]$Path)

  if (Test-Path -LiteralPath $Path) {
    Remove-DirectorySafe -Path $Path
  }
  New-Item -ItemType Directory -Path $Path -Force | Out-Null
}

function Remove-DirectorySafe {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  for ($attempt = 1; $attempt -le 5; $attempt++) {
    Get-ChildItem -LiteralPath $Path -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
      try {
        $_.IsReadOnly = $false
      } catch {
        Write-Verbose "Konnte Schreibschutz nicht entfernen: $($_.FullName)"
      }
    }

    try {
      Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
      return
    } catch {
      if ($attempt -eq 5) {
        Write-Warning "Temporaerer Build-Ordner konnte nicht entfernt werden: $Path"
        Write-Warning $_.Exception.Message
        return
      }

      Start-Sleep -Milliseconds (500 * $attempt)
    }
  }
}

function Copy-RootDocs {
  param([string]$Destination)

  @(
    'README.md',
    'SOFTWARE.md',
    'LFZQ8a_Workflow_Uebersicht.html'
  ) | ForEach-Object {
    Copy-ItemSafe -Source (Join-Path $repoRoot $_) -Destination (Join-Path $Destination $_)
  }
}

function Copy-DeploymentCommon {
  param([string]$Destination)

  $deploymentTarget = Join-Path $Destination 'deployment'
  New-Item -ItemType Directory -Path $deploymentTarget -Force | Out-Null
  Copy-ItemSafe -Source (Join-Path $repoRoot 'deployment\common') -Destination (Join-Path $deploymentTarget 'common')
}

function New-TeacherPackage {
  param([string]$PackageRoot)

  Write-Step 'Erstelle Dozentenpaket...'
  New-CleanDirectory -Path $PackageRoot
  Copy-RootDocs -Destination $PackageRoot
  Copy-DeploymentCommon -Destination $PackageRoot

  Copy-DirectoryExcluding -Source (Join-Path $repoRoot 'desktop-app') -Destination (Join-Path $PackageRoot 'desktop-app') -ExcludedDirectoryNames @('node_modules')
  Copy-ItemSafe -Source (Join-Path $repoRoot 'dozent') -Destination (Join-Path $PackageRoot 'dozent')
  Copy-ItemSafe -Source (Join-Path $repoRoot 'teilnehmer') -Destination (Join-Path $PackageRoot 'teilnehmer')
  Copy-ItemSafe -Source (Join-Path $repoRoot 'index.html') -Destination (Join-Path $PackageRoot 'index.html')
  Copy-ItemSafe -Source (Join-Path $repoRoot 'deployment\dozent\Start-LFZQ8a-Dozent.cmd') -Destination (Join-Path $PackageRoot 'Start-LFZQ8a-Dozent.cmd')
}

function New-ParticipantPackage {
  param([string]$PackageRoot)

  Write-Step 'Erstelle Teilnehmerpaket...'
  New-CleanDirectory -Path $PackageRoot
  Copy-RootDocs -Destination $PackageRoot
  Copy-DeploymentCommon -Destination $PackageRoot

  Copy-ItemSafe -Source (Join-Path $repoRoot 'teilnehmer') -Destination (Join-Path $PackageRoot 'teilnehmer')
  Copy-ItemSafe -Source (Join-Path $repoRoot 'index.html') -Destination (Join-Path $PackageRoot 'index.html')
  Copy-ItemSafe -Source (Join-Path $repoRoot 'deployment\teilnehmer\Start-LFZQ8a-Teilnehmer.cmd') -Destination (Join-Path $PackageRoot 'Start-LFZQ8a-Teilnehmer.cmd')
}

$repoRoot = (Resolve-Path (Join-Path (Split-Path -Parent $PSCommandPath) '..')).Path
$distRoot = Join-Path $repoRoot 'dist'
$workRoot = Join-Path $distRoot '_work'
$teacherRoot = Join-Path $workRoot 'LFZQ8a-Dozent'
$participantRoot = Join-Path $workRoot 'LFZQ8a-Teilnehmer'

New-CleanDirectory -Path $distRoot
New-Item -ItemType Directory -Path $workRoot | Out-Null

New-TeacherPackage -PackageRoot $teacherRoot
New-ParticipantPackage -PackageRoot $participantRoot

$teacherZip = Join-Path $distRoot 'LFZQ8a-Dozent.zip'
$participantZip = Join-Path $distRoot 'LFZQ8a-Teilnehmer.zip'

Write-Step 'Packe ZIP-Dateien...'
Compress-Archive -LiteralPath $teacherRoot -DestinationPath $teacherZip -Force
Compress-Archive -LiteralPath $participantRoot -DestinationPath $participantZip -Force

Remove-DirectorySafe -Path $workRoot

Write-Step "Fertig: $teacherZip"
Write-Step "Fertig: $participantZip"
