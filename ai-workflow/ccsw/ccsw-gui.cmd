@echo off
REM Launch the ccsw WPF GUI. -STA is required for WPF ShowDialog.
powershell.exe -NoProfile -ExecutionPolicy Bypass -STA -File "%~dp0ccsw-gui.ps1"
