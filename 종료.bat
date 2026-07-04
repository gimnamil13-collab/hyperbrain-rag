@echo off
setlocal
cd /d "%~dp0"

echo Stopping HYPERBRAIN RAG...

for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do taskkill /F /PID %%A >nul 2>&1
for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do taskkill /F /PID %%A >nul 2>&1

taskkill /F /IM node.exe >nul 2>&1

del "%TEMP%\hyperbrain_rag_browser.lock" 2>nul

echo Done.
pause
