@echo off
cd /d "%~dp0"
set "MAIMAI_NODE=node"
where node >nul 2>nul
if errorlevel 1 set "MAIMAI_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "dist\index.html" (
  echo Please install dependencies and build first. See README.md.
  pause
  exit /b 1
)
"%MAIMAI_NODE%" server.mjs
pause
