@echo off
setlocal

set "ROOT_DIR=%~dp0"
set "LAB_DIR=%ROOT_DIR%apps\content-factory-lab"
set "NODE_EXE=node"
set "BUNDLED_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if not exist "%LAB_DIR%\scripts\serve.mjs" (
  echo ContentFactory Lab wurde nicht gefunden:
  echo "%LAB_DIR%"
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  if exist "%BUNDLED_NODE%" (
    set "NODE_EXE=%BUNDLED_NODE%"
  ) else (
    echo Node.js wurde nicht gefunden.
    echo.
    echo Bitte Node.js installieren oder sicherstellen, dass diese Datei existiert:
    echo "%BUNDLED_NODE%"
    pause
    exit /b 1
  )
)

cd /d "%ROOT_DIR%"

echo Starte ContentFactory Standalone Lab...
echo.
echo URL: http://localhost:5174
echo.
echo Dieses Fenster offen lassen, solange das Lab genutzt wird.
echo Zum Beenden: STRG+C und dann J druecken.
echo.

"%NODE_EXE%" "%LAB_DIR%\scripts\serve.mjs"

pause
