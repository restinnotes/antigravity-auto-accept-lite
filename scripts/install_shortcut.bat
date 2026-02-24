@echo off
setlocal

:: Get the path to this script's directory
set "SCRIPT_DIR=%~dp0"
set "VBS_PATH=%SCRIPT_DIR%Antigravity_Launcher.vbs"
set "SHORTCUT_PATH=%USERPROFILE%\Desktop\Antigravity (AutoAccept).lnk"

:: Check if the VBS file exists
if not exist "%VBS_PATH%" (
    echo Error: Antigravity_Launcher.vbs not found in %SCRIPT_DIR%
    pause
    exit /b 1
)

:: Create the shortcut using PowerShell
echo Creating desktop shortcut for Antigravity (AutoAccept)...

powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT_PATH%'); $Shortcut.TargetPath = 'wscript.exe'; $Shortcut.Arguments = '""%VBS_PATH%""'; $Shortcut.WindowStyle = 1; $Shortcut.IconLocation = 'D:\Develop\Antigravity\Antigravity.exe,0'; $Shortcut.Save()"

if %errorlevel% equ 0 (
    echo.
    echo Success! A shortcut named "Antigravity (AutoAccept)" has been created on your Desktop.
    echo Please use this shortcut to start Antigravity IDE from now on to enable the Auto-Accept feature.
    echo.
) else (
    echo.
    echo Failed to create the shortcut.
    echo.
)

pause
