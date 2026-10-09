@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js not found. Install the LTS version from https://nodejs.org
  echo then double-click this file again.
  echo.
  pause
  exit /b 1
)

set BLOG_OPEN=1
node dev.js

pause
