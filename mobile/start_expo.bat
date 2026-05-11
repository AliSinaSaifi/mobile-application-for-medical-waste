@echo off
cd /d "c:\Users\dell\Downloads\medwaste-main\medwaste-main\mobile"
set /p PCIP=Enter your laptop LAN IP (example 192.168.1.23): 
set EXPO_PUBLIC_WEB_APP_URL=http://%PCIP%:5173
echo Using EXPO_PUBLIC_WEB_APP_URL=%EXPO_PUBLIC_WEB_APP_URL%
call npm start
pause
