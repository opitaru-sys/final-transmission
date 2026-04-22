@echo off
cd /d "%~dp0"
echo Adding changes...
git add src/pages/Landing.tsx src/pages/Landing.module.css src/pages/Mission.tsx src/pages/Mission.module.css src/data/crewImages.ts src/index.css index.html
git commit -m "Fix: rename to Final Transmission, fix crew photo URLs, add speech synthesis for transcript"
echo Pushing to GitHub...
git push
echo.
echo Done! Netlify will auto-deploy in ~1 minute.
pause
