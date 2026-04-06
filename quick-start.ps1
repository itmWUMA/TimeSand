param(
    [switch]$SkipInstall,
    [int]$FrontendPort = 5173,
    [int]$BackendPort = 8000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Assert-Command {
    param([Parameter(Mandatory = $true)][string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found in PATH."
    }
}

function Run-InDir {
    param(
        [Parameter(Mandatory = $true)][string]$Dir,
        [Parameter(Mandatory = $true)][string]$Command
    )

    Push-Location $Dir
    try {
        Invoke-Expression $Command
    }
    finally {
        Pop-Location
    }
}

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $rootDir "frontend"
$backendDir = Join-Path $rootDir "backend"

if (-not (Test-Path $frontendDir)) {
    throw "Frontend directory not found: $frontendDir"
}

if (-not (Test-Path $backendDir)) {
    throw "Backend directory not found: $backendDir"
}

Assert-Command "powershell"
Assert-Command "bun"
Assert-Command "uv"

if (-not $SkipInstall) {
    if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
        Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
        Run-InDir -Dir $frontendDir -Command "bun install"
    }

    if (-not (Test-Path (Join-Path $backendDir ".venv"))) {
        Write-Host "Creating backend virtual environment..." -ForegroundColor Yellow
        Run-InDir -Dir $backendDir -Command "uv venv -p 3.12"
    }

    Write-Host "Syncing backend dependencies..." -ForegroundColor Yellow
    Run-InDir -Dir $backendDir -Command "uv sync"
}

$frontendCmd = "Set-Location '$frontendDir'; bun run dev --host 0.0.0.0 --port $FrontendPort"
$backendCmd = "Set-Location '$backendDir'; if (-not (Test-Path '.venv')) { uv venv -p 3.12 }; uv sync; .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port $BackendPort"

$frontendProc = Start-Process powershell -ArgumentList @("-NoExit", "-Command", $frontendCmd) -PassThru
$backendProc = Start-Process powershell -ArgumentList @("-NoExit", "-Command", $backendCmd) -PassThru

Write-Host ""
Write-Host "TimeSand quick start is running." -ForegroundColor Green
Write-Host "Frontend: http://127.0.0.1:$FrontendPort"
Write-Host "Backend:  http://127.0.0.1:$BackendPort"
Write-Host "Health:   http://127.0.0.1:$BackendPort/api/health"
Write-Host ""
Write-Host "Frontend PID: $($frontendProc.Id)"
Write-Host "Backend PID:  $($backendProc.Id)"
Write-Host ""
Write-Host "Use Ctrl+C in each opened window to stop services."
