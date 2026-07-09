@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0"
set "APP_DIR=%ROOT_DIR%desktop-app"
set "SCRIPT=%APP_DIR%\scripts\workflow-check.js"

echo ============================================================
echo ueTool_asSaaS Workflow-Check
echo ============================================================

where node >nul 2>nul
if errorlevel 1 (
  echo [FEHLER] Node.js wurde nicht gefunden. Bitte Node.js installieren oder ueber die normale App-Ausfuehrung testen.
  pause
  exit /b 1
)

if not exist "%APP_DIR%\package.json" (
  echo [FEHLER] desktop-app\package.json wurde nicht gefunden.
  pause
  exit /b 1
)

if not exist "%SCRIPT%" (
  echo [FEHLER] desktop-app\scripts\workflow-check.js wurde nicht gefunden.
  pause
  exit /b 1
)

cd /d "%APP_DIR%"
node "%SCRIPT%"
set "EXIT_CODE=%ERRORLEVEL%"
echo.
pause
exit /b %EXIT_CODE%
