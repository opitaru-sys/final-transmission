@echo off
cd /d "%~dp0"
echo Initializing git...
git init
git add .
git commit -m "Initial commit: Final Words narrative experience"
git branch -M main
git remote add origin https://github.com/opitaru-sys/final-transmission.git
echo Pushing to GitHub...
git push -u origin main
echo.
echo Done! Check github.com/opitaru-sys/final-transmission
pause
