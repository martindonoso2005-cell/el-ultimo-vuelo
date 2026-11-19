@echo off
cd /d "%~dp0"
echo Abriendo "66 millones de anos: el ultimo vuelo" en http://localhost:8765
start "" http://localhost:8765/index.html
python -m http.server 8765
