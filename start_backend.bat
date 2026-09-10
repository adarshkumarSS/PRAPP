@echo off
echo Starting Placement Tracker Backend API (FastAPI)...
cd /d "%~dp0backend"
set PATH=%~dp0tools;%PATH%
"%~dp0backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
