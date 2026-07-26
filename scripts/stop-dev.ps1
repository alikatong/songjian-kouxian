$ErrorActionPreference = 'Stop'
$projectPorts = 3001, 3002, 5173, 5174, 5175
$connections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $projectPorts -contains $_.LocalPort }

foreach ($connection in $connections) {
  $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$($connection.OwningProcess)"
  $command = [string]$processInfo.CommandLine
  $isGameProcess = $processInfo.Name -eq 'node.exe' -and (
    $command -match 'src[/\\]server\.js' -or
    $command -match 'vite[/\\]bin[/\\]vite\.js'
  )
  if ($isGameProcess) {
    Stop-Process -Id $connection.OwningProcess -Force
    Write-Host "[stopped] Port $($connection.LocalPort), PID $($connection.OwningProcess)"
  } else {
    throw "Port $($connection.LocalPort) is owned by an unrelated process. Startup stopped to avoid terminating it."
  }
}
