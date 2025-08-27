@echo off
REM BorlaCam Windows Deployment Batch Script
REM ========================================

echo 🚀 Starting BorlaCam Windows deployment...
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/
    pause
    exit /b 1
)

REM Run the Python deployment script
echo Running Python deployment script...
python deploy.py production true true

REM Check if deployment was successful
if %errorlevel% equ 0 (
    echo.
    echo ✅ Deployment completed successfully!
    echo.
    echo Your BorlaCam API is running at: http://localhost:8000
    echo Health check: http://localhost:8000/health
    echo.
) else (
    echo.
    echo ❌ Deployment failed! Check the output above for details.
    echo.
)

pause