@echo off
title Simmons Office - backup do codigo
cd /d "%~dp0"

echo.
echo   A guardar uma copia do codigo que esta a funcionar...
echo.

set PASTA=versoes
if not exist "%PASTA%" mkdir "%PASTA%"

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm"') do set CARIMBO=%%i

set DESTINO=%PASTA%\simmons-office_%CARIMBO%

mkdir "%DESTINO%"
mkdir "%DESTINO%\public"

copy /y server.js      "%DESTINO%\" >nul
copy /y armazenamento.js "%DESTINO%\" >nul
copy /y auth.js        "%DESTINO%\" >nul
copy /y backup.js      "%DESTINO%\" >nul
copy /y expor.js       "%DESTINO%\" >nul
copy /y package.json   "%DESTINO%\" >nul
copy /y render.yaml    "%DESTINO%\" >nul
copy /y public\index.html "%DESTINO%\public\" >nul
copy /y public\app.js     "%DESTINO%\public\" >nul
copy /y public\style.css  "%DESTINO%\public\" >nul
if exist public\visual.js copy /y public\visual.js "%DESTINO%\public\" >nul

echo   Guardado em: %DESTINO%
echo.

echo   Versao guardada:
git log --oneline -1
echo.

rem manter apenas as 20 versoes mais recentes
for /f "skip=20 delims=" %%d in ('dir /b /o-d "%PASTA%"') do rd /s /q "%PASTA%\%%d" 2>nul

echo   Versoes guardadas: 
dir /b /o-d "%PASTA%"
echo.
pause
