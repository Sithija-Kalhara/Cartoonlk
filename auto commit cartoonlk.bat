@echo off
chcp 65001 > nul
cd /d "C:\Users\sithi\Desktop\cartoonlk"

git pull origin main --rebase

git add .

for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'"`) do set "TIMESTAMP=%%i"

git commit --allow-empty -m "Auto update at startup: %TIMESTAMP%"

git push origin main

echo Done! Everything is up to date.
pause