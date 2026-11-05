@echo off
title Simmons Office
cd /d "%~dp0"
echo.
echo   SIMMONS OFFICE
echo   A iniciar...
echo.
if not exist node_modules (
  echo   A instalar dependencias pela primeira vez...
  call npm install --no-audit --no-fund
)
start "" http://localhost:3000
node server.js
pause
