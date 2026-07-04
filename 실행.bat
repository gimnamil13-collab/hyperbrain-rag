@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
title HYPERBRAIN RAG

cd /d "%~dp0"

echo.
echo ========================================
echo   HYPERBRAIN RAG — Neural Interface
echo ========================================
echo.

where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found.
    goto FAIL
)

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org/
    goto FAIL
)

if not exist ".venv\Scripts\python.exe" (
    echo [INFO] Creating Python venv...
    python -m venv .venv
)

if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

if not exist "node_modules" (
    echo [INFO] Installing root dependencies...
    call npm install
)

if not exist ".env" (
    if exist ".env.example" copy /Y ".env.example" ".env" >nul
    echo [ERROR] Set OPENAI_API_KEY in .env then run again.
    goto FAIL
)

echo [INFO] Starting API :8000 + UI :3000
echo [INFO] Browser opens once when ready: http://localhost:3000
echo [INFO] Close this window or run 종료.bat
echo.

del "%TEMP%\hyperbrain_rag_browser.lock" 2>nul
set BROWSER=none
start /B "" powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0scripts\open-once.ps1"

call npm run dev
goto END

:FAIL
echo.
pause
exit /b 1

:END
pause
endlocal
