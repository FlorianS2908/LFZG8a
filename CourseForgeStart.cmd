@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title CourseForge

set "ROOT_DIR=%~dp0"
set "APP_DIR=%ROOT_DIR%desktop-app"
set "PACKAGE_JSON=%APP_DIR%\package.json"
set "ELECTRON_CMD=%APP_DIR%\node_modules\.bin\electron.cmd"
set "ELECTRON_LOCAL_EXE=%APP_DIR%\node_modules\electron\dist\electron.exe"
set "BUNDLED_NODE_DIR=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "ELECTRON_EXE="

echo [CourseForge] The AI-powered Course Compiler
echo [CourseForge] Projektordner: %ROOT_DIR%

if not exist "%PACKAGE_JSON%" (
  echo [FEHLER] desktop-app\package.json wurde nicht gefunden.
  echo Bitte starte diese Datei aus dem Repository-Hauptordner.
  pause
  exit /b 1
)

if exist "%ELECTRON_LOCAL_EXE%" (
  echo [CourseForge] Starte lokale Electron-App...
  cd /d "%APP_DIR%"
  "%ELECTRON_LOCAL_EXE%" . --courseforge
  if errorlevel 1 pause
  exit /b %ERRORLEVEL%
)

where node >nul 2>nul
if errorlevel 1 if exist "%BUNDLED_NODE_DIR%\node.exe" set "PATH=%BUNDLED_NODE_DIR%;%PATH%"

if exist "%ELECTRON_CMD%" (
  echo [CourseForge] Starte Electron aus node_modules...
  cd /d "%APP_DIR%"
  call "%ELECTRON_CMD%" . --courseforge
  if errorlevel 1 pause
  exit /b %ERRORLEVEL%
)

for /f "delims=" %%E in ('where electron 2^>nul') do if not defined ELECTRON_EXE set "ELECTRON_EXE=%%E"
if defined ELECTRON_EXE (
  echo [CourseForge] Starte globales Electron...
  cd /d "%APP_DIR%"
  "%ELECTRON_EXE%" . --courseforge
  if errorlevel 1 pause
  exit /b %ERRORLEVEL%
)

echo [FEHLER] Electron wurde nicht gefunden.
echo Bitte im Ordner desktop-app zuerst die Abhaengigkeiten installieren: npm install
pause
exit /b 1
