@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0"
if not exist "%ROOT_DIR%\deployment\common\install-check.ps1" set "ROOT_DIR=%~dp0..\.."
set "CHECK_SCRIPT=%ROOT_DIR%\deployment\common\install-check.ps1"

if not exist "%CHECK_SCRIPT%" (
  echo [FEHLER] deployment\common\install-check.ps1 wurde nicht gefunden.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%CHECK_SCRIPT%" -Role Dozent -Start -WizardTest
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [FEHLER] Wizard-Test konnte nicht gestartet werden.
  pause
  exit /b %ERRORLEVEL%
)
