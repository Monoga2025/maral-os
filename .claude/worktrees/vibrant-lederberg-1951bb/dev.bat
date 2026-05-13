@echo off
echo Iniciando MARAL OS en modo desarrollo...

start "MARAL Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"
start "MARAL Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Backend : http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Cierra las dos ventanas para detener el servidor.
