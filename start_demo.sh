#!/usr/bin/env bash
# ==============================================================================
# AEGIS-GIS: 1-Click Launch Script (Linux / macOS)
# Department of AI & DS, K.J. Somaiya College of Engineering
# ==============================================================================

set -e

# Terminal Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

clear
echo -e "${GREEN}${BOLD}"
echo "========================================================================================"
echo "   ___   ___________ _____ ___       ________ _____ "
echo "  / _ | / __/ ___/ //_/ _// __/      / ___/  _// __/ "
echo " / __ |/ _// (_ / ,< / _/_\ \       / (_ // / _\ \   "
echo "/_/ |_/___/\___/_/|_/___/___/       \___/___//___/   "
echo ""
echo "                 AEGIS-GIS INITIALIZED"
echo "     When Location Lies: GNSS Spoofing & Integrity-Aware GIS"
echo "       K.J. Somaiya College of Engineering (Dept. of AI & DS)"
echo "========================================================================================"
echo -e "${NC}"

# 1. Kill any existing processes on target ports (8000 and 5173)
echo -e "${CYAN}[1/5] Checking and freeing ports 8000 and 5173...${NC}"
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# 2. Activate Python virtual environment if present
echo -e "${CYAN}[2/5] Checking Python environment...${NC}"
if [ -d "venv" ]; then
    echo "      Activating virtual environment (venv)..."
    source venv/bin/activate
elif [ -d ".venv" ]; then
    echo "      Activating virtual environment (.venv)..."
    source .venv/bin/activate
else
    echo "      Using system Python environment..."
fi

# 3. Start FastAPI Backend in Background
echo -e "${CYAN}[3/5] Starting FastAPI Async Backend on http://localhost:8000 ...${NC}"
python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 > /dev/null 2>&1 &
BACKEND_PID=$!

# 4. Start Vite React Frontend in Background
echo -e "${CYAN}[4/5] Starting Vite React Frontend on http://localhost:5173 ...${NC}"
(cd frontend && npm run dev > /dev/null 2>&1) &
FRONTEND_PID=$!

# Cleanup on exit trap
cleanup() {
    echo ""
    echo -e "${CYAN}[SHUTDOWN] Stopping background servers (PID: $BACKEND_PID, $FRONTEND_PID)...${NC}"
    kill -9 $BACKEND_PID 2>/dev/null || true
    kill -9 $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}[SHUTDOWN] Clean teardown complete.${NC}"
}
trap cleanup EXIT INT TERM

# 5. Open Default Browser
echo -e "${CYAN}[5/5] Launching Cyber Command Center in your default browser...${NC}"
sleep 3
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:5173
elif command -v open > /dev/null; then
    open http://localhost:5173
fi

echo ""
echo -e "${GREEN}${BOLD}========================================================================================"
echo " [SUCCESS] AEGIS-GIS ALL SYSTEMS NOMINAL. READY FOR DEMO."
echo "   * Cyber Command Center UI: http://localhost:5173"
echo "   * FastAPI OpenAPI Docs:    http://localhost:8000/api/docs"
echo "   * Professor God Mode:      Press [Ctrl + Shift + P] inside the UI"
echo "========================================================================================${NC}"
echo "Press Ctrl+C to terminate all services."

# Keep alive until user interrupts
wait
