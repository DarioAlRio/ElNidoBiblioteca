@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  Actualizando el catalogo de la web desde el Excel...
echo.
set "PY=%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
if not exist "%PY%" set "PY=py"
"%PY%" "_build\actualizar.py"
echo.
pause
