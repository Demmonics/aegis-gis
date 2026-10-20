@echo off
title AEGIS-GIS // When Location Lies - Command Center Launcher
color 0B

echo ==============================================================================
echo             AEGIS-GIS // CYBER-GEOSPATIAL COMMAND CENTER LAUNCHER
echo      K.J. Somaiya College of Engineering - Dept. of AI & DS (Batch B2)
echo            Yoosha (16014224101)  |  Yash (16014224077)
echo            Parth (16014224095)   |  Tanishq (16014224099)
echo ==============================================================================
echo.

:: 1. Self-Healing Environment Diagnostic
echo [1/3] Probing system environment and self-healing credentials...
python backend\env_manager.py

:: 2. Launch FastAPI Async Server on Port 8000
echo.
echo [2/3] Starting FastAPI Async Backend Server on http://localhost:8000 ...
start "AEGIS-GIS FastAPI Backend" cmd /k "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

:: 3. Launch Vite Frontend Dev Server on Port 5173
echo.
echo [3/3] Starting React + Vite Command Center on http://localhost:5173 ...
cd frontend
start "AEGIS-GIS Vite Frontend" cmd /k "npm run dev -- --host"
cd ..

echo.
echo ==============================================================================
echo [READY] AEGIS-GIS Command Center is launching!
echo         Frontend UI: http://localhost:5173
echo         FastAPI Swagger Docs: http://localhost:8000/api/docs
echo ==============================================================================
echo.
timeout /t 3 >nul
start http://localhost:5173
pause
