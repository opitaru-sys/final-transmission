@echo off
echo.
echo  Final Words -- Deploying to Netlify
echo  =====================================
echo.
cd /d "%~dp0"
echo  Directory: %CD%
echo.
echo y | npx netlify-cli deploy --dir=dist --prod --allow-anonymous
echo.
pause
