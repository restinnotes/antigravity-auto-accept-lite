Set WshShell = CreateObject("WScript.Shell")
' 0 means hidden window
WshShell.Run "powershell -WindowStyle Hidden -Command ""Get-Process Antigravity -ErrorAction SilentlyContinue | Stop-Process -Force; Start-Process -FilePath 'D:\Develop\Antigravity\Antigravity.exe' -ArgumentList '--remote-debugging-port=9000'""", 0, False
