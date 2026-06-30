@echo off
setlocal

set "ROOT_DIR=%~dp0"
set "APP_DIR=%ROOT_DIR%desktop-app"
set "ELECTRON_CMD=%APP_DIR%\node_modules\.bin\electron.CMD"

if not exist "%APP_DIR%\package.json" (
  echo [FEHLER] desktop-app\package.json wurde nicht gefunden.
  echo Bitte starte diese Datei aus dem LFZQ8a-Projektordner.
  pause
  exit /b 1
)

if /I "%~1"=="--check" (
  echo [OK] Projektordner: %ROOT_DIR%
  echo [OK] App-Ordner: %APP_DIR%
  if exist "%ELECTRON_CMD%" (
    echo [OK] Electron ist installiert.
  ) else (
    echo [INFO] Electron ist noch nicht installiert.
  )
  exit /b 0
)

if not exist "%ELECTRON_CMD%" (
  echo Electron ist noch nicht installiert. Die Ersteinrichtung wird gestartet.
  echo.

  where pnpm >nul 2>nul
  if %ERRORLEVEL% EQU 0 (
    pushd "%APP_DIR%"
    pnpm install
    if %ERRORLEVEL% NEQ 0 (
      popd
      echo.
      echo [FEHLER] pnpm install ist fehlgeschlagen.
      pause
      exit /b 1
    )
    popd
  ) else (
    where npm >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
      pushd "%APP_DIR%"
      npm install
      if %ERRORLEVEL% NEQ 0 (
        popd
        echo.
        echo [FEHLER] npm install ist fehlgeschlagen.
        pause
        exit /b 1
      )
      popd
    ) else (
      echo [FEHLER] Weder pnpm noch npm wurde gefunden.
      echo Bitte Node.js installieren oder spaeter den fertigen Installer verwenden.
      pause
      exit /b 1
    )
  )
)

if not exist "%ELECTRON_CMD%" (
  echo [FEHLER] Electron konnte nicht gefunden werden.
  echo Erwartet: %ELECTRON_CMD%
  pause
  exit /b 1
)

start "LFZQ8a Workshop" /D "%APP_DIR%" "%ELECTRON_CMD%" .
exit /b 0
