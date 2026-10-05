param(
  [ValidateSet('Production','Development')][string]$Mode = 'Production',
  [switch]$Restart
)
$ErrorActionPreference = 'Stop'
$reviewRoot = Split-Path -Parent $PSScriptRoot
$reviewLogs = Join-Path $reviewRoot '.cache/review'
New-Item -ItemType Directory -Force -Path $reviewLogs | Out-Null
$nodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodeExe -and (Test-Path 'C:/nvm4w/nodejs/node.exe')) { $nodeExe = 'C:/nvm4w/nodejs/node.exe' }
if (-not $nodeExe) { throw 'Node.js is required.' }
$pythonExe = Join-Path $reviewRoot 'apps/ai-service/.venv/Scripts/python.exe'
if (-not (Test-Path $pythonExe)) { throw 'The AI service virtual environment is missing.' }
$env:PATH = (Split-Path -Parent $nodeExe) + ';' + $env:PATH
$env:NEXT_PUBLIC_API_URL = 'http://localhost:3001'
$env:AI_SERVICE_URL = 'http://localhost:8000'
$env:DB_SYNCHRONIZE = 'false'
$env:PYTHONDONTWRITEBYTECODE = '1'
$env:PYTHONUNBUFFERED = '1'
$env:NEXT_TELEMETRY_DISABLED = '1'
$env:NODE_OPTIONS = '--max-old-space-size=2048'
$reviewApps = @(
  @{ Name='api'; Port=3001; Exe=$nodeExe; Dir='apps/api'; Args=@('../../node_modules/@nestjs/cli/bin/nest.js','start','--watch') },
  @{ Name='web'; Port=3000; Exe=$nodeExe; Dir='apps/web'; Args=@('../../node_modules/next/dist/bin/next','dev','-p','3000') },
  @{ Name='admin'; Port=3002; Exe=$nodeExe; Dir='apps/admin'; Args=@('../../node_modules/next/dist/bin/next','dev','-p','3002') },
  @{ Name='builder'; Port=3003; Exe=$nodeExe; Dir='apps/builder'; Args=@('../../node_modules/next/dist/bin/next','dev','-p','3003') },
  @{ Name='ai'; Port=8000; Exe=$pythonExe; Dir='apps/ai-service'; Args=@('-m','uvicorn','main:app','--host','127.0.0.1','--port','8000') }
)
if ($Mode -eq 'Production') {
  foreach ($reviewApp in $reviewApps | Where-Object { $_.Name -in 'web','admin','builder' }) {
    $reviewApp.Dir = '.cache/review-build/' + $reviewApp.Name
    if (-not (Test-Path (Join-Path $reviewRoot ($reviewApp.Dir + '/.next/BUILD_ID')))) {
      throw "Missing $($reviewApp.Name) production build. Run: node tools/build-review.cjs $($reviewApp.Name)"
    }
    $reviewApp.Args = @((Join-Path $reviewRoot 'node_modules/next/dist/bin/next'),'start','-p',"$($reviewApp.Port)")
  }
}
foreach ($reviewApp in $reviewApps) {
  $listener = Get-NetTCPConnection -LocalPort $reviewApp.Port -State Listen -ErrorAction SilentlyContinue
  if ($listener -and $Restart -and $reviewApp.Name -in 'web','admin','builder') {
    $pidFile = Join-Path $reviewLogs "$($reviewApp.Name).pid"
    if (-not (Test-Path $pidFile)) { throw "Cannot safely restart untracked process on port $($reviewApp.Port)." }
    $trackedId = [int](Get-Content $pidFile)
    $processes = @(Get-CimInstance Win32_Process)
    $tracked = $processes | Where-Object { $_.ProcessId -eq $trackedId }
    if (-not $tracked -or $tracked.CommandLine -notmatch 'next.*(dev|start)' -or $tracked.CommandLine -notmatch "-p $($reviewApp.Port)") { throw 'Tracked PID no longer matches this review app.' }
    $currentId = $listener[0].OwningProcess
    $owned = $false
    for ($depth=0; $depth -lt 20; $depth++) {
      if ($currentId -eq $trackedId) { $owned=$true; break }
      $parent = $processes | Where-Object { $_.ProcessId -eq $currentId }
      if (-not $parent) { break }
      $currentId = $parent.ParentProcessId
    }
    if (-not $owned) { throw "Port $($reviewApp.Port) belongs to a different process." }
    & taskkill.exe /PID $trackedId /T /F | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Unable to restart $($reviewApp.Name)." }
    $listener = $null
  }
  if ($listener) { Write-Output "$($reviewApp.Name): already running on http://localhost:$($reviewApp.Port)"; continue }
  $process = Start-Process -FilePath $reviewApp.Exe -ArgumentList $reviewApp.Args -WorkingDirectory (Join-Path $reviewRoot $reviewApp.Dir) -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $reviewLogs "$($reviewApp.Name).log") -RedirectStandardError (Join-Path $reviewLogs "$($reviewApp.Name)-error.log")
  $process.Id | Set-Content (Join-Path $reviewLogs "$($reviewApp.Name).pid")
  Write-Output "$($reviewApp.Name): $Mode, http://localhost:$($reviewApp.Port), PID $($process.Id)"
}
Write-Output "Logs: $reviewLogs"
