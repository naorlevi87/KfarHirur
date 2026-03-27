@echo off
REM Runs npm install in this folder (works when path has spaces, Hebrew, or parentheses).
cd /d "%~dp0"
echo Installing dependencies in: %CD%
call npm install
if errorlevel 1 (
  echo npm install failed.
  exit /b 1
)
echo Done.
exit /b 0
