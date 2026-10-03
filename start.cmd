@echo off
cd /d "%~dp0"
if exist ".tools\node-v24.12.0-win-x64\node.exe" set "PATH=%CD%\.tools\node-v24.12.0-win-x64;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 24 LTS from https://nodejs.org and try again.
  pause
  exit /b 1
)
if not exist "node_modules\express" (
  call npm install --omit=dev
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo Open http://localhost:3000 in your browser.
echo Keep this window open during the party. Press Ctrl+C to stop.
node server.mjs
pause
