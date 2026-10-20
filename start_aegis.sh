#!/bin/bash
# ==============================================================================
# AEGIS-GIS // CYBER-GEOSPATIAL COMMAND CENTER LAUNCHER
# K.J. Somaiya College of Engineering - Dept. of AI & DS (Batch B2)
# Yoosha (16014224101)  |  Yash (16014224077)
# Parth (16014224095)   |  Tanishq (16014224099)
# ==============================================================================

echo "=============================================================================="
echo "          AEGIS-GIS // CYBER-GEOSPATIAL COMMAND CENTER LAUNCHER"
echo "   K.J. Somaiya College of Engineering - Dept. of AI & DS (Batch B2)"
echo "=============================================================================="

# 1. Environment self-healing
echo "[1/3] Probing system environment and self-healing credentials..."
python3 backend/env_manager.py

# 2. Launch FastAPI Backend
echo "[2/3] Starting FastAPI Async Backend on http://localhost:8000 ..."
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# 3. Launch Vite Frontend
echo "[3/3] Starting Vite Frontend on http://localhost:5173 ..."
cd frontend && npm run dev -- --host &
FRONTEND_PID=$!
cd ..

echo "AEGIS-GIS Command Center launched!"
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:8000"

# Open browser
sleep 3
if which xdg-open > /dev/null; then
  xdg-open http://localhost:5173
elif which open > /dev/null; then
  open http://localhost:5173
fi

wait $BACKEND_PID $FRONTEND_PID
