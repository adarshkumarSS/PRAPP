@echo off
echo Starting Placement Tracker Frontend (Vite + React)...
cd /d "%~dp0frontend"
set PATH=%~dp0tools\node;%PATH%
npm run dev
