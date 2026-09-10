@echo off
echo =========================================================
echo   Launching Placement Tracker Architecture v2 Platform
echo   - Backend: http://127.0.0.1:8000 (API Docs: http://127.0.0.1:8000/docs)
echo   - Frontend: http://localhost:5173
echo   - Database: Supabase PostgreSQL
echo =========================================================

start "Placement Tracker Backend" cmd /k "%~dp0start_backend.bat"
start "Placement Tracker Frontend" cmd /k "%~dp0start_frontend.bat"

echo.
echo Both servers have been launched in dedicated windows.
pause
