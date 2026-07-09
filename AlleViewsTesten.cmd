@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0"
set "CHECK_SCRIPT=%ROOT_DIR%deployment\common\install-check.ps1"
set "TARGET=%ROOT_DIR%desktop-app\package.json"

echo [Ploglan] Alle drei Views zum Testen starten
echo [HTML/CSS] Projektordner: %ROOT_DIR%
echo [Views] Dozenten-Steuerung, Kursview, Teilnehmeransicht

if not exist "%TARGET%" (
  echo [FEHLER] desktop-app\package.json wurde nicht gefunden.
  echo Bitte starte diese Datei aus dem HTML/CSS-Projektordner.
  pause
  exit /b 1
)

if not exist "%CHECK_SCRIPT%" (
  echo [FEHLER] deployment\common\install-check.ps1 wurde nicht gefunden.
  echo Bitte starte diese Datei aus dem HTML/CSS-Projektordner.
  pause
  exit /b 1
)

echo [Ploglan] Starte Electron im Drei-Views-Testmodus...
powershell -NoProfile -ExecutionPolicy Bypass -File "%CHECK_SCRIPT%" -Role Dozent -Start -TestAllViews
exit /b %ERRORLEVEL%
