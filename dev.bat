@echo off
echo Iniciando base de datos PostgreSQL...
wsl -d Ubuntu -u root service postgresql start >nul 2>&1

echo Iniciando MARAL OS en modo desarrollo...

start "MARAL Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"
start "MARAL Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Backend : http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Cierra las dos ventanas para detener el servidor.
