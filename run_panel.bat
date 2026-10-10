@echo off
copy /Y "C:\Users\Toshiba\.gemini\antigravity-ide\brain\c76cab83-46be-48d9-8a0e-962412a8076d\media__1780573585739.jpg" "C:\Users\Toshiba\Desktop\LionX-Engine\logo.jpg" >nul 2>&1
title LionX Admin Panel Server
echo ====================================================
echo LionX Admin Panel Local Server
echo ====================================================
echo.
echo Starting local web server on port 8080...
echo.
echo Open this URL in your web browser (Chrome):
echo.
echo    http://localhost:8080
echo.
echo Keep this window open while using the panel!
echo Press Ctrl+C in this window to stop the server.
echo ====================================================
echo.
npx http-server ./ -p 8080
pause
