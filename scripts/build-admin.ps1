$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$solutionPath = Join-Path $workspaceRoot 'admin-tool\SongJian.AdminTool.sln'
$projectPath = Join-Path $workspaceRoot 'admin-tool\SongJian.AdminTool\SongJian.AdminTool.csproj'
$publishPath = Join-Path $workspaceRoot 'artifacts\admin-tool\win-x64\'
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'

if (-not (Test-Path -LiteralPath $vswhere)) { throw 'vswhere.exe was not found' }
$visualStudioPath = & $vswhere -latest -products * -requires Microsoft.Component.MSBuild -property installationPath
if (-not $visualStudioPath) { throw 'Visual Studio with MSBuild was not found' }
$msbuild = Join-Path $visualStudioPath 'MSBuild\Current\Bin\MSBuild.exe'
if (-not (Test-Path -LiteralPath $msbuild)) { throw "MSBuild was not found: $msbuild" }

& $msbuild $solutionPath /restore /t:Rebuild /p:Configuration=Release /p:Platform=x64 /m
if ($LASTEXITCODE -ne 0) { throw 'Visual Studio Release x64 build failed' }

& $msbuild $projectPath /restore /t:Publish /p:Configuration=Release /p:Platform=x64 /p:RuntimeIdentifier=win-x64 /p:SelfContained=true /p:PublishSingleFile=true /p:IncludeNativeLibrariesForSelfExtract=true /p:DebugType=None "/p:PublishDir=$publishPath"
if ($LASTEXITCODE -ne 0) { throw 'Visual Studio single-file publish failed' }

$exe = Get-ChildItem -LiteralPath $publishPath -Filter '*.exe' -File | Select-Object -First 1
if (-not $exe) { throw 'Publish completed but EXE was not found' }
Write-Host "Admin tool published: $($exe.FullName)"
