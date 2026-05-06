# Check and create Snort-logs folder
$basePath = "C:\Users"
$userPath = Join-Path $basePath "HOANG MINH HIEU"
$desktopPath = Join-Path $userPath "Desktop"
$projectPath = Join-Path $desktopPath "An toàn mạng\Project"
$snortPath = Join-Path $projectPath "Snort-logs"

Write-Host "Checking path: $snortPath"

if (Test-Path $snortPath) {
    Write-Host "Folder exists"
    Get-ChildItem $snortPath
} else {
    Write-Host "Creating folder..."
    New-Item -ItemType Directory -Path $snortPath -Force
    Write-Host "Created successfully"
}

# Show actual path name
$p = Get-Item $snortPath -ErrorAction SilentlyContinue
if ($p) {
    Write-Host "FullName: $($p.FullName)"
}