# ── deploy.ps1 — Build & deploy VPC Music API to DigitalOcean ──
#
# Runs entirely from your local machine. No GitHub secrets needed.
#
# Prerequisites (one-time):
#   1. Install Docker Desktop: https://docs.docker.com/desktop/install/windows/
#   2. Install doctl:          winget install DigitalOcean.Doctl
#   3. Authenticate:           doctl auth init
#   4. Create a registry:      doctl registry create vpc-music
#   5. Create the app:         doctl apps create --spec .do/app.yaml
#   6. Note your App ID:       doctl apps list --format ID,DefaultIngress
#
# Usage:
#   .\scripts\deploy.ps1                       # deploy latest
#   .\scripts\deploy.ps1 -SkipTests            # skip test suite
#   .\scripts\deploy.ps1 -Tag "v1.0.0"        # custom image tag
#
# What it does:
#   1. Syncs shared/ → apps/api/shared/
#   2. Runs tests (unless -SkipTests)
#   3. Builds API Docker image
#   4. Pushes image to DigitalOcean Container Registry (DOCR)
#   5. Triggers App Platform deployment
# ──────────────────────────────────────────────────────────────

param(
    [switch]$SkipTests,
    [string]$Tag = "latest"
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VPC Music API — Deploy to DigitalOcean" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Preflight checks ─────────────────────────────────────────

# Resolve winget-installed binaries that may not be in the spawned shell's PATH
$wingetPkgs = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages"
@("DigitalOcean.Doctl") | ForEach-Object {
    $dir = Get-ChildItem $wingetPkgs -Filter "${_}_*" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($dir -and -not (Get-Command ($_ -split '\.' | Select-Object -Last 1).ToLower() -ErrorAction SilentlyContinue)) {
        $env:PATH = "$($dir.FullName);$env:PATH"
    }
}

function Assert-Command($cmd, $installHint) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: '$cmd' not found. $installHint" -ForegroundColor Red
        exit 1
    }
}

Assert-Command "docker" "Install Docker Desktop: https://docs.docker.com/desktop/install/windows/"
Assert-Command "doctl"  "Install doctl: winget install DigitalOcean.Doctl"

# Verify Docker is running
docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker is not running. Start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Verify doctl is authenticated
$account = doctl account get --format Email --no-header 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: doctl not authenticated. Run: doctl auth init" -ForegroundColor Red
    exit 1
}
Write-Host "[ok] Authenticated as $account" -ForegroundColor Green

# Get registry name
$registry = (doctl registry get --format Name --no-header 2>&1).Trim()
if ($LASTEXITCODE -ne 0 -or -not $registry) {
    Write-Host "ERROR: No DOCR registry found. Create one: doctl registry create vpc-music" -ForegroundColor Red
    exit 1
}
Write-Host "[ok] Registry: $registry" -ForegroundColor Green

# Get app ID
$apps = doctl apps list --format ID,Spec.Name --no-header 2>&1
$appLine = ($apps -split "`n") | Where-Object { $_ -match "vpc-music-api" -and $_ -notmatch "stg-" } | Select-Object -First 1
if (-not $appLine) {
    Write-Host "ERROR: No 'vpc-music-api' app found. Create it:" -ForegroundColor Red
    Write-Host "  doctl apps create --spec .do/app.yaml" -ForegroundColor Yellow
    exit 1
}
$appId = ($appLine.Trim() -split '\s+')[0]
Write-Host "[ok] App ID: $appId" -ForegroundColor Green
Write-Host ""

# ── Step 1: Sync shared/ ─────────────────────────────────────
Write-Host "[1/5] Syncing shared/ -> apps/api/shared/ ..." -ForegroundColor Cyan
& "$PSScriptRoot\sync-shared.ps1"
if ($LASTEXITCODE -ne 0) { exit 1 }

# ── Step 2: Run tests ────────────────────────────────────────
if (-not $SkipTests) {
    Write-Host ""
    Write-Host "[2/5] Running tests ..." -ForegroundColor Cyan
    Push-Location "$repoRoot\apps\web"
    pnpm vitest run
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Tests failed. Fix them before deploying, or use -SkipTests." -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
    Write-Host "[ok] All tests passed" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[2/5] Skipping tests (-SkipTests)" -ForegroundColor Yellow
}

# ── Step 3: Build Docker image ────────────────────────────────
Write-Host ""
Write-Host "[3/5] Building API Docker image ..." -ForegroundColor Cyan

$image = "registry.digitalocean.com/$registry/vpc-music-api"
$gitSha = git -C $repoRoot rev-parse --short HEAD 2>$null
if (-not $gitSha) { $gitSha = "unknown" }
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

docker build `
    -f "$repoRoot\apps\api\Dockerfile" `
    -t "${image}:${Tag}" `
    -t "${image}:${gitSha}" `
    -t "${image}:deploy-${timestamp}" `
    "$repoRoot\apps\api"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker build failed." -ForegroundColor Red
    exit 1
}
Write-Host "[ok] Built: ${image}:${Tag}" -ForegroundColor Green

# ── Step 4: Push to DOCR ─────────────────────────────────────
Write-Host ""
Write-Host "[4/5] Pushing image to DOCR ..." -ForegroundColor Cyan

doctl registry login --expiry-seconds 600
docker push "${image}:${Tag}"
docker push "${image}:${gitSha}"
docker push "${image}:deploy-${timestamp}"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker push failed." -ForegroundColor Red
    exit 1
}
Write-Host "[ok] Pushed to DOCR" -ForegroundColor Green

# ── Step 5: Trigger deployment ────────────────────────────────
Write-Host ""
Write-Host "[5/5] Triggering App Platform deployment ..." -ForegroundColor Cyan

doctl apps create-deployment $appId --wait
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Deployment trigger returned non-zero. Check status:" -ForegroundColor Yellow
    Write-Host "  doctl apps list-deployments $appId" -ForegroundColor Yellow
} else {
    Write-Host "[ok] Deployment complete!" -ForegroundColor Green
}

# ── Done ──────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deploy complete!" -ForegroundColor Green
Write-Host "  Image:  ${image}:${Tag}" -ForegroundColor Green
Write-Host "  Commit: $gitSha" -ForegroundColor Green
Write-Host "  App:    $appId" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Verify at: https://api.vpcmusic.life/health" -ForegroundColor Cyan
Write-Host "Logs:      doctl apps logs $appId --type run" -ForegroundColor Cyan
Write-Host ""
