@echo off
setlocal
cd /d "%~dp0"
echo GSF favicon downloader
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0download-images.ps1"
echo.
echo Done. Check the images folder.
pause
