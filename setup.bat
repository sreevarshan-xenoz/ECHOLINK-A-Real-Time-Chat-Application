@echo off
setlocal enabledelayedexpansion

echo P2P Chat Application Setup
echo ========================
echo.

REM Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is not installed! Please install it from https://nodejs.org/
    echo After installation, run this script again.
    pause
    exit /b 1
)

REM Check for Git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo Git is not installed! Please install it from https://git-scm.com/
    echo After installation, run this script again.
    pause
    exit /b 1
)

REM Check for PowerShell
where powershell >nul 2>nul
if %errorlevel% neq 0 (
    echo PowerShell is not installed! Please install it from Microsoft Store.
    echo After installation, run this script again.
    pause
    exit /b 1
)

REM Create necessary directories
if not exist "build" mkdir build
if not exist "assets" mkdir assets

REM Copy icon file if it exists
if exist "build\icon.svg" (
    copy "build\icon.svg" "assets\icon.svg" >nul
) else (
    echo Warning: icon.svg not found in build directory
)

REM Clean previous installation
echo Cleaning previous installation...
if exist node_modules rmdir /s /q node_modules
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist

REM Install dependencies
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

REM Convert icons
echo Converting application icons...
powershell -ExecutionPolicy Bypass -File convert-icons.ps1
if %errorlevel% neq 0 (
    echo Error: Failed to convert icons
    pause
    exit /b 1
)

REM Build React app
echo Building React application...
call npm run build
if %errorlevel% neq 0 (
    echo Error: Failed to build React application
    pause
    exit /b 1
)

REM Build Windows executable
echo Building Windows executable...
call npm run dist:win
if %errorlevel% neq 0 (
    echo Error: Failed to build Windows executable
    pause
    exit /b 1
)

echo.
echo Build completed successfully!
echo.
echo The installer can be found in the dist folder.
echo Would you like to install the application now? (Y/N)
set /p INSTALL_NOW=

if /i "%INSTALL_NOW%"=="Y" (
    for %%f in (dist\*.exe) do (
        if not "%%~xf"==".blockmap" (
            echo Installing application...
            start "" "%%f"
        )
    )
)

echo.
echo Setup complete! Press any key to exit.
pause >nul 
pause 