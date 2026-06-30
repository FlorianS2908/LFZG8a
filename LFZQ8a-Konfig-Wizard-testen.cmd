@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0"
set "APP_DIR=%ROOT_DIR%desktop-app"
set "ELECTRON_EXE="

call :FindElectron

if not exist "%APP_DIR%\package.json" (
  echo [FEHLER] desktop-app\package.json wurde nicht gefunden.
  echo Bitte starte diese Datei aus dem LFZQ8a-Projektordner.
  pause
  exit /b 1
)

if /I "%~1"=="--check" (
  echo [OK] Projektordner: %ROOT_DIR%
  echo [OK] App-Ordner: %APP_DIR%
  if defined ELECTRON_EXE (
    echo [OK] Electron gefunden: %ELECTRON_EXE%
  ) else (
    echo [INFO] Electron ist noch nicht installiert.
  )
  where node >nul 2>nul
  if %ERRORLEVEL% EQU 0 (
    echo [OK] Node.js ist verfuegbar.
  ) else (
    echo [INFO] Node.js ist aktuell nicht im PATH.
  )
  exit /b 0
)

if not defined ELECTRON_EXE (
  echo Electron ist noch nicht installiert. Die automatische Ersteinrichtung wird gestartet.
  echo.
  call :EnsureNode
  if %ERRORLEVEL% NEQ 0 (
    pause
    exit /b 1
  )

  call :InstallDependencies
  if %ERRORLEVEL% NEQ 0 (
    pause
    exit /b 1
  )

  call :FindElectron
)

if not defined ELECTRON_EXE (
  echo [FEHLER] Electron konnte nach der Installation nicht gefunden werden.
  echo Erwartet wird eine electron.exe unter:
  echo %APP_DIR%\node_modules
  pause
  exit /b 1
)

echo Starte LFZQ8a Konfig-Wizard im Testmodus...
start "LFZQ8a Konfig-Wizard Test" /D "%APP_DIR%" "%ELECTRON_EXE%" . --wizard-test
exit /b 0

:FindElectron
set "ELECTRON_EXE="
if exist "%APP_DIR%\node_modules" (
  for /f "delims=" %%F in ('dir /b /s "%APP_DIR%\node_modules\electron.exe" 2^>nul') do (
    set "ELECTRON_EXE=%%F"
    goto :FindElectronDone
  )
)
:FindElectronDone
exit /b 0

:EnsureNode
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  exit /b 0
)

echo Node.js wurde nicht gefunden.
where winget >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo [FEHLER] Weder Node.js noch winget wurde gefunden.
  echo Bitte Node.js LTS installieren oder spaeter den fertigen Installer verwenden.
  exit /b 1
)

echo Installiere Node.js LTS ueber winget...
winget install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
if %ERRORLEVEL% NEQ 0 (
  echo [FEHLER] Node.js konnte ueber winget nicht installiert werden.
  exit /b 1
)

set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%PATH%"
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo [FEHLER] Node.js wurde installiert, ist aber in diesem Fenster noch nicht verfuegbar.
  echo Bitte dieses Fenster schliessen und die Startdatei erneut doppelklicken.
  exit /b 1
)
exit /b 0

:InstallDependencies
echo Installiere App-Abhaengigkeiten...
pushd "%APP_DIR%"
where pnpm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  pnpm install
) else (
  npm install
)
set "INSTALL_RESULT=%ERRORLEVEL%"
popd

if not "%INSTALL_RESULT%"=="0" (
  echo [FEHLER] Die App-Abhaengigkeiten konnten nicht installiert werden.
  exit /b 1
)
exit /b 0
