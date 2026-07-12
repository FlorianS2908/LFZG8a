@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0"
set "APP_DIR=%ROOT_DIR%desktop-app"
set "PACKAGE_JSON=%APP_DIR%\package.json"
set "ELECTRON_CMD=%APP_DIR%\node_modules\.bin\electron.cmd"
set "ELECTRON_LOCAL_EXE=%APP_DIR%\node_modules\electron\dist\electron.exe"
set "BUNDLED_NODE_DIR=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "ELECTRON_EXE="

echo [ContentFactory] Main-Branch Starter
echo [ContentFactory] Projektordner: %ROOT_DIR%

if not exist "%PACKAGE_JSON%" (
  echo [FEHLER] desktop-app\package.json wurde nicht gefunden.
  echo Bitte starte diese Datei aus dem Repository-Hauptordner.
  pause
  exit /b 1
)

where git >nul 2>nul
if not errorlevel 1 (
  for /f "usebackq delims=" %%B in (`git -C "%ROOT_DIR%." branch --show-current 2^>nul`) do set "CURRENT_BRANCH=%%B"
  if /i not "%CURRENT_BRANCH%"=="main" (
    echo [WARNUNG] Aktueller Branch ist "%CURRENT_BRANCH%", nicht "main".
    echo Diese Datei ist fuer den Start aus dem Main-Branch gedacht.
    echo.
  )
)

if exist "%ELECTRON_LOCAL_EXE%" (
  echo [ContentFactory] Starte lokale Electron-App...
  cd /d "%APP_DIR%"
  "%ELECTRON_LOCAL_EXE%" . --content-factory
  if errorlevel 1 (
    echo.
    echo [FEHLER] Electron wurde mit Fehlercode %ERRORLEVEL% beendet.
    pause
  )
  exit /b %ERRORLEVEL%
)

where node >nul 2>nul
if errorlevel 1 (
  if exist "%BUNDLED_NODE_DIR%\node.exe" (
    set "PATH=%BUNDLED_NODE_DIR%;%PATH%"
  )
)

if exist "%ELECTRON_CMD%" (
  echo [ContentFactory] Starte Electron aus node_modules...
  cd /d "%APP_DIR%"
  call "%ELECTRON_CMD%" . --content-factory
  if errorlevel 1 (
    echo.
    echo [FEHLER] Electron wurde mit Fehlercode %ERRORLEVEL% beendet.
    pause
  )
  exit /b %ERRORLEVEL%
)

for /f "delims=" %%E in ('where electron 2^>nul') do (
  if not defined ELECTRON_EXE set "ELECTRON_EXE=%%E"
)

if defined ELECTRON_EXE (
  echo [ContentFactory] Starte globales Electron...
  cd /d "%APP_DIR%"
  "%ELECTRON_EXE%" . --content-factory
  if errorlevel 1 (
    echo.
    echo [FEHLER] Electron wurde mit Fehlercode %ERRORLEVEL% beendet.
    pause
  )
  exit /b %ERRORLEVEL%
)

echo [FEHLER] Electron wurde nicht gefunden.
echo Bitte im Ordner desktop-app zuerst die Abhaengigkeiten installieren:
echo   npm install
echo Danach diese Datei erneut starten.
pause
exit /b 1
