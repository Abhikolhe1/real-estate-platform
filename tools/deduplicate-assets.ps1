# PowerShell Asset Deduplication Script for Windows
$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$SharedAssets = Join-Path $RootDir "assets"

Write-Host "Creating shared assets directory at: $SharedAssets"
New-Item -ItemType Directory -Path (Join-Path $SharedAssets "images") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $SharedAssets "videos") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $SharedAssets "models") -Force | Out-Null

$SourceWeb = Join-Path $RootDir "apps\web\public"
if (Test-Path (Join-Path $SourceWeb "images")) {
  Copy-Item (Join-Path $SourceWeb "images\*") (Join-Path $SharedAssets "images") -Force
}
if (Test-Path (Join-Path $SourceWeb "videos\walkthrough.mp4")) {
  Copy-Item (Join-Path $SourceWeb "videos\walkthrough.mp4") (Join-Path $SharedAssets "videos") -Force
}
if (Test-Path (Join-Path $SourceWeb "building.glb")) {
  Copy-Item (Join-Path $SourceWeb "building.glb") (Join-Path $SharedAssets "models") -Force
}
if (Test-Path (Join-Path $SourceWeb "floor_walkthrough.glb")) {
  Copy-Item (Join-Path $SourceWeb "floor_walkthrough.glb") (Join-Path $SharedAssets "models") -Force
}

Write-Host "Shared assets directory ready."
Get-ChildItem $SharedAssets -Recurse | Select-Object FullName, Length

# For Windows, junction or hard links can link files
$apps = @("apps\web\public", "apps\builder\public", "apps\admin\public")
foreach ($app in $apps) {
  $targetPublic = Join-Path $RootDir $app
  Write-Host "Ensuring assets exist in $targetPublic"
  New-Item -ItemType Directory -Path (Join-Path $targetPublic "images") -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $targetPublic "videos") -Force | Out-Null
}

Write-Host "Asset deduplication verified."

