@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0"
set "CHECK_SCRIPT=%ROOT_DIR%deployment\common\install-check.ps1"
set "TARGET=%ROOT_DIR%desktop-app\package.json"

echo [ueTool_asSaaS] Anwendung starten
echo [ueTool_asSaaS] Projektordner: %ROOT_DIR%

if not exist "%TARGET%" (
  echo [FEHLER] desktop-app\package.json wurde nicht gefunden.
  echo Bitte starte diese Datei aus dem ueTool_asSaaS-Projektordner.
  pause
  exit /b 1
)

if not exist "%CHECK_SCRIPT%" (
  echo [FEHLER] deployment\common\install-check.ps1 wurde nicht gefunden.
  echo Bitte starte diese Datei aus dem ueTool_asSaaS-Projektordner.
  pause
  exit /b 1
)

echo [ueTool_asSaaS] Starte Electron...
powershell -NoProfile -ExecutionPolicy Bypass -File "%CHECK_SCRIPT%" -Role Dozent -Start
exit /b %ERRORLEVEL%
