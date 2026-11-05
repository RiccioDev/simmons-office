@echo off
title Simmons Office - acesso de fora
cd /d "%~dp0"
echo.
echo   A abrir o acesso de fora (Cloudflare). O link aparece em segundos.
echo.
node expor.js
pause
