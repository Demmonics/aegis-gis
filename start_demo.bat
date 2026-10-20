@echo off
title AEGIS-GIS // One-Click Viva Demo Launcher
color 0A
cls

echo ========================================================================================
echo    ___   ___________ _____ ___       ________ _____ 
echo   / _ ^| / __/ ___/ //_/ _// __/      / ___/  _// __/ 
echo  / __ ^|/ _// (_ / ,^< / _/_\ \       / (_ // / _\ \   
echo /_/ ^|_/___/\___/_/^|_/___/___/       \___/___//___/   
echo.
echo                  AEGIS-GIS INITIALIZED
echo      When Location Lies: GNSS Spoofing ^& Integrity-Aware GIS
echo        K.J. Somaiya College of Engineering (Dept. of AI ^& DS)
echo ========================================================================================
echo.

:: 1. Kill any existing processes on target ports (8000 and 5173)
echo [1/5] Checking and freeing ports 8000 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo       Killing lingering process on port 8000 (PID %%a)...
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo       Killing lingering process on port 5173 (PID %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

:: 2. Activate Python Virtual Environment if present
echo [2/5] Checking Python environment...
if exist venv\Scripts\activate.bat (
    echo       Activating virtual environment (venv)...
    call venv\Scripts\activate.bat
) else if exist .venv\Scripts\activate.bat (
    echo       Activating virtual environment (.venv)...
    call .venv\Scripts\activate.bat
) else (
    echo       Using system Python environment...
)

:: 3. Start FastAPI Backend in Background
echo [3/5] Starting FastAPI Async Backend on http://localhost:8000 ...
start "AEGIS-GIS Backend" /min cmd /c "python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"

:: 4. Start Vite React Frontend in Background
echo [4/5] Starting Vite React Frontend on http://localhost:5173 ...
start "AEGIS-GIS Frontend" /min cmd /c "cd /d frontend && npm run dev"

:: 5. Open Default Browser
echo [5/5] Launching Cyber Command Center in your default browser...
timeout /t 3 >nul
start http://localhost:5173

echo.
echo ========================================================================================
echo [SUCCESS] AEGIS-GIS ALL SYSTEMS NOMINAL. READY FOR DEMO.
echo   * Cyber Command Center UI: http://localhost:5173
echo   * FastAPI OpenAPI Docs:    http://localhost:8000/api/docs
echo   * Professor God Mode:      Press [Ctrl + Shift + P] inside the UI
echo ========================================================================================
echo.
pause
