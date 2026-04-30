@echo off
setlocal enabledelayedexpansion

echo.
echo   ==========================================
echo     AI Portfolio Chatbot -- Launcher
echo   ==========================================
echo.

REM ── Preflight checks ──────────────────────────────────────────────────────────
if not exist "Backend\.env" (
    echo [ERROR] Backend\.env not found.
    echo         Copy Backend\.env.example to Backend\.env and fill in your API keys.
    echo         See the README for the full environment variable reference.
    echo.
    pause
    exit /b 1
)

if not exist "Frontend\.env.local" (
    echo [ERROR] Frontend\.env.local not found.
    echo         Copy Frontend\.env.example to Frontend\.env.local and fill in your values.
    echo         See the README for the full environment variable reference.
    echo.
    pause
    exit /b 1
)

REM ── Backend ───────────────────────────────────────────────────────────────────
echo [1/3] Backend
echo   Setting up Python environment...

if not exist "Backend\.venv" (
    echo   Creating virtual environment...
    python -m venv Backend\.venv
    if errorlevel 1 (
        echo   [ERROR] Failed to create virtual environment. Is Python 3.11+ installed?
        pause
        exit /b 1
    )
)

echo   Starting FastAPI on http://localhost:8000
start "AI Portfolio - Backend" cmd /k ^
    "cd /d %~dp0Backend ^
    && .venv\Scripts\activate ^
    && pip install -r requirements.txt -q ^
    && echo. ^
    && echo  Backend ready: http://localhost:8000 ^
    && echo. ^
    && uvicorn main:app --reload --port 8000"

REM ── Frontend ──────────────────────────────────────────────────────────────────
echo.
echo [2/3] Frontend

if not exist "Frontend\node_modules" (
    echo   node_modules not found -- installing npm packages ^(first run only^)...
    cd Frontend
    call npm install
    if errorlevel 1 (
        echo   [ERROR] npm install failed. Is Node.js 18+ installed?
        pause
        exit /b 1
    )
    cd ..
)

echo   Starting Next.js on http://localhost:3000
start "AI Portfolio - Frontend" cmd /k ^
    "cd /d %~dp0Frontend ^
    && echo. ^
    && echo  Frontend ready: http://localhost:3000 ^
    && echo. ^
    && npm run dev"

REM ── Open browser ──────────────────────────────────────────────────────────────
echo.
echo [3/3] Opening browser in 8 seconds...
timeout /t 8 /nobreak > nul
start http://localhost:3000

echo.
echo   ==========================================
echo     Both servers are running.
echo     Frontend: http://localhost:3000
echo     Backend:  http://localhost:8000
echo   ==========================================
echo.
echo   Two terminal windows have been opened.
echo   Close those windows (or press Ctrl+C in each) to stop the servers.
echo.
pause
