# Create symlink
$targetPath = "C:\Users\HOANG MINH HIEU\Desktop\An toàn mạng\Project\Snort-logs"
$linkPath = "C:\SnortLogs"

if (Test-Path $linkPath) {
    Remove-Item $linkPath -Force
}

cmd /c "mklink /D C:\SnortLogs `"$targetPath`""
Write-Host "Symlink created at C:\SnortLogs -> $targetPath"