$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("v:\git\messager\Messager Client.lnk")
$Shortcut.TargetPath = "v:\git\messager\client\windows_app.bat"
$Shortcut.WorkingDirectory = "v:\git\messager\client"
$Shortcut.IconLocation = "v:\git\messager\client\icon.ico"
$Shortcut.Save()
