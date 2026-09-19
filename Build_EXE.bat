@echo off
title Blue Frontline Balancing Tool - EXE Builder
cd /d "%~dp0"
echo Building standalone EXE...
call npm run electron:build
if exist "release\BlueFrontlineBalancingTool 1.0.0.exe" (
    echo Finalizing single executable in root...
    move /y "release\BlueFrontlineBalancingTool 1.0.0.exe" "BlueFrontlineBalancingTool.exe" >nul
    rmdir /s /q "release" >nul 2>&1
    if exist "node_modules\rcedit\bin\rcedit-x64.exe" (
        echo Applying custom icon directly to executable...
        call "node_modules\rcedit\bin\rcedit-x64.exe" "BlueFrontlineBalancingTool.exe" --set-icon "img\icon.ico" >nul 2>&1
    )
    echo =======================================================
    echo SUCCESS: BlueFrontlineBalancingTool.exe created in root!
    echo =======================================================
)
pause
