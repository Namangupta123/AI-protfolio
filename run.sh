#!/usr/bin/env bash
# Starts the FastAPI backend and Next.js frontend together.
# Prerequisites: Backend/.env and Frontend/.env.local must already exist.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}${CYAN}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║   AI Portfolio Chatbot — Launcher    ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"

# ── Preflight checks ──────────────────────────────────────────────────────────
if [ ! -f "$SCRIPT_DIR/Backend/.env" ]; then
  echo -e "${RED}✗  Backend/.env not found.${NC}"
  echo "   Copy Backend/.env.example → Backend/.env and fill in your API keys."
  echo "   See the README for the full environment variable reference."
  exit 1
fi

if [ ! -f "$SCRIPT_DIR/Frontend/.env.local" ]; then
  echo -e "${RED}✗  Frontend/.env.local not found.${NC}"
  echo "   Copy Frontend/.env.example → Frontend/.env.local and fill in your values."
  echo "   See the README for the full environment variable reference."
  exit 1
fi

# ── Backend ───────────────────────────────────────────────────────────────────
echo -e "${BOLD}[1/3] Backend${NC}"

cd "$SCRIPT_DIR/Backend"

if [ ! -d ".venv" ]; then
  echo "  Creating Python virtual environment..."
  python3 -m venv .venv
fi

# shellcheck disable=SC1091
source .venv/bin/activate

echo "  Installing / verifying Python dependencies..."
pip install -r requirements.txt -q

echo -e "  ${GREEN}✓ Starting FastAPI on http://localhost:8000${NC}"
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# ── Frontend ──────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}[2/3] Frontend${NC}"

cd "$SCRIPT_DIR/Frontend"

if [ ! -d "node_modules" ]; then
  echo "  node_modules not found — installing npm packages (first run only)..."
  npm install
fi

echo -e "  ${GREEN}✓ Starting Next.js on http://localhost:3000${NC}"
npm run dev &
FRONTEND_PID=$!

# ── Open browser ──────────────────────────────────────────────────────────────
echo -e "\n${BOLD}[3/3] Opening browser${NC}"
sleep 5

if command -v open &>/dev/null; then
  open http://localhost:3000          # macOS
elif command -v xdg-open &>/dev/null; then
  xdg-open http://localhost:3000     # Linux
fi

echo -e "
${GREEN}${BOLD}Both servers are running.${NC}
  Frontend → ${CYAN}http://localhost:3000${NC}
  Backend  → ${CYAN}http://localhost:8000${NC}

${YELLOW}Press Ctrl+C to stop both servers.${NC}
"

# ── Cleanup on exit ───────────────────────────────────────────────────────────
cleanup() {
  echo -e "\n${YELLOW}Shutting down...${NC}"
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  echo -e "${GREEN}Done. Goodbye!${NC}"
}
trap cleanup INT TERM EXIT

wait
