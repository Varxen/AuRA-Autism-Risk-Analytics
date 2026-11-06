# AuRA one-time setup. Run from repo root:
#   powershell -ExecutionPolicy Bypass -File .\setup.ps1
# Installs: Python 3.12, Node.js LTS, PostgreSQL 17, Ollama (via winget),
# then Python packages, npm packages, .env, database, tables, Ollama model.

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
Set-Location $Root

function Step($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "    OK: $m" -ForegroundColor Green }

function Refresh-Path {
    $m = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $u = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$m;$u"
}

function Has($cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

function Winget-Install($id, $extra) {
    if (-not (Has 'winget')) {
        throw "winget not found. Update 'App Installer' from Microsoft Store, then rerun setup.ps1."
    }
    $args = @('install', '-e', '--id', $id, '--accept-package-agreements', '--accept-source-agreements') + $extra
    & winget @args
    Refresh-Path
}

function Find-Psql {
    if (Has 'psql') { return (Get-Command psql).Source }
    $hit = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\psql.exe' -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending | Select-Object -First 1
    if ($hit) { return $hit.FullName }
    return $null
}

# ---------- Python ----------
Step 'Python 3.12+'
$py = $null
foreach ($c in @('py -3.13', 'py -3.12', 'python')) {
    try {
        $v = Invoke-Expression "$c --version" 2>$null
        if ($v -match 'Python 3\.(\d+)' -and [int]$Matches[1] -ge 12) { $py = $c; break }
    } catch {}
}
if (-not $py) {
    Winget-Install 'Python.Python.3.12' @()
    $py = 'py -3.12'
    try { Invoke-Expression "$py --version" | Out-Null } catch { $py = 'python' }
}
Ok (Invoke-Expression "$py --version")

# ---------- Node ----------
Step 'Node.js 22+'
$needNode = $true
if (Has 'node') { if ((node --version) -match 'v(\d+)' -and [int]$Matches[1] -ge 22) { $needNode = $false } }
if ($needNode) { Winget-Install 'OpenJS.NodeJS.LTS' @() }
Ok (node --version)

# ---------- PostgreSQL ----------
Step 'PostgreSQL'
$psql = Find-Psql
$dbPassword = $null
if (-not $psql) {
    $sec = Read-Host 'Choose a password for the PostgreSQL "postgres" user (remember it)' -AsSecureString
    $dbPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
    Winget-Install 'PostgreSQL.PostgreSQL.17' @('--override', "--mode unattended --unattendedmodeui none --superpassword $dbPassword --serverport 5432")
    $psql = Find-Psql
    if (-not $psql) { throw 'PostgreSQL install failed. Install manually, see DATABASE_SETUP.md.' }
}
Ok $psql

# ---------- Ollama ----------
Step 'Ollama'
if (-not (Has 'ollama')) { Winget-Install 'Ollama.Ollama' @() }
Ok 'ollama installed'

# ---------- Backend ----------
Step 'Backend virtualenv + packages'
Set-Location "$Root\backend"
if (-not (Test-Path '.venv\Scripts\python.exe')) { Invoke-Expression "$py -m venv .venv" }
& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\python.exe -m pip install -e ".[dev]"
Ok 'backend packages installed'

# ---------- .env ----------
Step 'backend/.env'
if (-not (Test-Path '.env')) { Copy-Item '.env.example' '.env' }
if (-not $dbPassword) {
    $sec = Read-Host 'Enter your PostgreSQL "postgres" password' -AsSecureString
    $dbPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
}
$lines = Get-Content '.env' | ForEach-Object {
    if ($_ -match '^AURA_DB_PASSWORD=') { "AURA_DB_PASSWORD=$dbPassword" } else { $_ }
}
Set-Content -Path '.env' -Value $lines -Encoding utf8
Ok '.env written'

# ---------- Database ----------
Step 'Create database aura_db'
$env:PGPASSWORD = $dbPassword
$exists = & $psql -h localhost -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='aura_db'"
if ($LASTEXITCODE -ne 0) { throw 'Cannot connect to PostgreSQL. Wrong password or service not running. See DATABASE_SETUP.md.' }
if ($exists -ne '1') {
    & $psql -h localhost -U postgres -c 'CREATE DATABASE aura_db'
    if ($LASTEXITCODE -ne 0) { throw 'CREATE DATABASE failed.' }
}
Remove-Item Env:PGPASSWORD
Ok 'aura_db ready'

Step 'Create tables (alembic upgrade head)'
& .\.venv\Scripts\python.exe -m alembic upgrade head
if ($LASTEXITCODE -ne 0) { throw 'alembic upgrade failed.' }
Ok 'tables created'

# ---------- Machine learning ----------
Step 'ML packages (only needed to retrain models)'
& .\.venv\Scripts\python.exe -m pip install -r "$Root\machine-learning\requirements.txt"

# ---------- Frontend ----------
Step 'Frontend packages'
Set-Location "$Root\frontend"
npm.cmd install
if ($LASTEXITCODE -ne 0) { throw 'npm install failed.' }
Ok 'frontend packages installed'

# ---------- Ollama model ----------
Step 'Download Ollama model llama3.2:3b (about 2 GB)'
$ollamaExe = if (Has 'ollama') { 'ollama' } else { "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" }
& $ollamaExe pull llama3.2:3b
if ($LASTEXITCODE -ne 0) { Write-Host '    WARN: model pull failed. Run "ollama pull llama3.2:3b" later.' -ForegroundColor Yellow }

Set-Location $Root
Write-Host "`nSETUP DONE. Next: .\start.ps1" -ForegroundColor Green
