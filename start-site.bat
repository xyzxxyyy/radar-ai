@echo off
cd /d "%~dp0"
echo Starting Study Pressure Radar...
echo.
echo Keep this window open while using the website.
echo Frontend: http://127.0.0.1:5173/
echo API:      http://127.0.0.1:8787/api/health
echo.
npm run dev
pause
