# Sync shared/ → apps/api/shared/
$source = Join-Path $PSScriptRoot "..\shared"
$dest = Join-Path $PSScriptRoot "..\apps\api\shared"

Write-Host "Syncing shared/ → apps/api/shared/" -ForegroundColor Cyan

if (Test-Path $dest) {
    Remove-Item -Recurse -Force $dest
}

Copy-Item -Recurse -Path $source -Destination $dest -Exclude "node_modules"

Write-Host "✅ Sync complete." -ForegroundColor Green
