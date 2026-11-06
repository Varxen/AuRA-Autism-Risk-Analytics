# Start AuRA (PostgreSQL check, Ollama, backend, frontend).
#   powershell -ExecutionPolicy Bypass -File .\start.ps1
# Close the two opened windows to stop.

$Root = $PSScriptRoot

if (-not (Test-Path "$Root\backend\.venv\Scripts\python.exe")) {
    Write-Host 'Not set up yet. Run .\setup.ps1 first.' -ForegroundColor Red
    exit 1
}

# PostgreSQL service must be running
$pg = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($pg -and $pg.Status -ne 'Running') {
    Write-Host 'Starting PostgreSQL service (needs admin)...'
    try { Start-Service $pg.Name -ErrorAction Stop }
    catch { Write-Host 'Run PowerShell as Administrator, or start the PostgreSQL service manually.' -ForegroundColor Red; exit 1 }
}

# Ollama (skip if already running)
if (-not (Get-Process ollama -ErrorAction SilentlyContinue)) {
    $ollama = (Get-Command ollama -ErrorAction SilentlyContinue).Source
    if (-not $ollama) { $ollama = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" }
    if (Test-Path $ollama) { Start-Process $ollama -ArgumentList 'serve' -WindowStyle Hidden }
    else { Write-Host 'WARN: Ollama not found. Follow-up consistency check will fail.' -ForegroundColor Yellow }
}

# Backend
Start-Process powershell -ArgumentList '-NoExit', '-Command',
    "Set-Location '$Root\backend'; .\.venv\Scripts\python.exe -m uvicorn aura_api.main:create_app --factory --host 127.0.0.1 --port 8001 --no-access-log"

# Frontend
Start-Process powershell -ArgumentList '-NoExit', '-Command',
    "Set-Location '$Root\frontend'; npm.cmd run dev -- --host 127.0.0.1 --port 5173"

Start-Sleep -Seconds 6
Start-Process 'http://127.0.0.1:5173'
Write-Host 'AuRA running: http://127.0.0.1:5173  (API: http://127.0.0.1:8001/docs)' -ForegroundColor Green
