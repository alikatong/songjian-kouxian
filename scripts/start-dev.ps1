$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$logDirectory = Join-Path $projectRoot 'logs'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

& (Join-Path $PSScriptRoot 'stop-dev.ps1')

$backendProcess = $null
$frontendProcess = $null

try {
  $backendProcess = Start-Process -FilePath 'npm.cmd' -ArgumentList 'start' `
    -WorkingDirectory (Join-Path $projectRoot 'backend') -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $logDirectory 'backend.out.log') `
    -RedirectStandardError (Join-Path $logDirectory 'backend.err.log')

  $frontendProcess = Start-Process -FilePath 'npm.cmd' -ArgumentList @('run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173') `
    -WorkingDirectory (Join-Path $projectRoot 'frontend') -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $logDirectory 'frontend.out.log') `
    -RedirectStandardError (Join-Path $logDirectory 'frontend.err.log')

  $deadline = (Get-Date).AddSeconds(15)
  do {
    Start-Sleep -Milliseconds 250
    $backendReady = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
    $frontendReady = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
  } while ((-not $backendReady -or -not $frontendReady) -and (Get-Date) -lt $deadline)

  if (-not $backendReady -or -not $frontendReady) {
    throw "New version failed to start. Check the logs directory. Backend PID=$($backendProcess.Id), frontend PID=$($frontendProcess.Id)"
  }

  Write-Host '[ready] New version is running'
  Write-Host 'Frontend: http://127.0.0.1:5173'
  Write-Host 'Backend:  http://127.0.0.1:3001'
} catch {
  foreach ($process in @($backendProcess, $frontendProcess)) {
    if ($process -and -not $process.HasExited) {
      Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
  }
  Start-Sleep -Milliseconds 500
  & (Join-Path $PSScriptRoot 'stop-dev.ps1')
  throw
}
