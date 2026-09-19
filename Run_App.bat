@echo off
title Blue Frontline Balancing Tool
cd /d "%~dp0"
if exist "release\win-unpacked\BlueFrontlineBalancingTool.exe" (
    echo Launching BlueFrontlineBalancingTool.exe...
    start "" "release\win-unpacked\BlueFrontlineBalancingTool.exe"
) else (
    echo Starting Blue Frontline Balancing Tool via Electron...
    call npx electron electron/main.cjs
)
