@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0"
set "CHECK_SCRIPT=%ROOT_DIR%deployment\common\install-check.ps1"
set "TARGET=%ROOT_DIR%dozent\index_dozent.html"

echo [LFZQ8a] Dozenten-Startview in Electron testen
echo [LFZQ8a] Projektordner: %ROOT_DIR%

if not exist "%TARGET%" (
  echo [FEHLER] dozent\index_dozent.html wurde nicht gefunden.
  echo Bitte pruefe, ob du die Datei aus dem LFZQ8a-Projektordner startest.
  pause
  exit /b 1
)

if not exist "%CHECK_SCRIPT%" (
  echo [FEHLER] deployment\common\install-check.ps1 wurde nicht gefunden.
  echo Bitte starte diese Datei aus dem LFZQ8a-Projektordner.
  pause
  exit /b 1
)

echo [LFZQ8a] Starte Electron, damit Monitor markieren echte Displays verwenden kann...
powershell -NoProfile -ExecutionPolicy Bypass -File "%CHECK_SCRIPT%" -Role Dozent -Start -TeacherStartviewTest
exit /b %ERRORLEVEL%
