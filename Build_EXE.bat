@echo off
title Blue Frontline Balancing Tool - EXE Builder
cd /d "%~dp0"
echo Building standalone EXE...
call npm run electron:build
pause
