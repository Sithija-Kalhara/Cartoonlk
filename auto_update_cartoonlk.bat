@echo off
cd /d "C:\Users\sithi\Desktop\cartoonlk"

echo Fetching latest changes from GitHub...
git pull origin main --no-rebase

echo Adding local changes...
git add .

echo Committing changes...
git commit -m "Auto update at startup: %date% %time%"

echo Pushing to GitHub...
git push origin main

pause