@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0"
if not exist "%ROOT_DIR%\deployment\common\install-check.ps1" set "ROOT_DIR=%~dp0..\.."
set "CHECK_SCRIPT=%ROOT_DIR%\deployment\common\install-check.ps1"

if not exist "%CHECK_SCRIPT%" (
  echo [FEHLER] deployment\common\install-check.ps1 wurde nicht gefunden.
  echo Bitte starte diese Datei aus dem LFZQ8a-Paket oder erstelle das Paket neu.
  pause
  exit /b 1
)

if /I "%~1"=="--check" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%CHECK_SCRIPT%" -Role Dozent
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%CHECK_SCRIPT%" -Role Dozent -Start
)
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [FEHLER] Start oder Einrichtung der Dozenten-App ist fehlgeschlagen.
  pause
  exit /b %ERRORLEVEL%
)
