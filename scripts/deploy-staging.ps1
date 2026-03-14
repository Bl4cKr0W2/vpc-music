# ── deploy-staging.ps1 — Build & deploy VPC Music API staging ──
#
# Runs entirely from your local machine. No GitHub secrets needed.
#
# Prerequisites (one-time):
#   1. Install Docker Desktop: https://docs.docker.com/desktop/install/windows/
#   2. Install doctl:          winget install DigitalOcean.Doctl
#   3. Authenticate:           doctl auth init
#   4. Create a registry:      doctl registry create vpc-music
#   5. Create the app:         doctl apps create --spec .do/app.stg.yaml
#   6. Note your App ID:       doctl apps list --format ID,DefaultIngress
#
# Usage:
#   .\scripts\deploy-staging.ps1                    # deploy staging tag
#   .\scripts\deploy-staging.ps1 -SkipTests         # skip test suite
#   .\scripts\deploy-staging.ps1 -Wait              # block until deployment completes
#   .\scripts\deploy-staging.ps1 -Tag "feature-x"   # custom image tag
#
# What it does:
#   1. Syncs shared/ → apps/api/shared/
#   2. Runs tests (unless -SkipTests)
#   3. Builds API Docker image
#   4. Pushes image to DigitalOcean Container Registry (DOCR)
#   5. Triggers staging App Platform deployment
# ──────────────────────────────────────────────────────────────

param(
    [switch]$SkipTests,
    [switch]$Wait,
    [string]$Tag = "staging"
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$appName = 'stg-vpc-music-api'
$specPath = Join-Path $repoRoot '.do\app.stg.yaml'

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  VPC Music API — Deploy Staging" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# ── Preflight checks ─────────────────────────────────────────

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
Assert-Command "git"    "Install Git: https://git-scm.com/download/win"

if (-not (Test-Path $specPath)) {
    Write-Host "ERROR: Missing staging app spec at $specPath" -ForegroundColor Red
    exit 1
}

docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker is not running. Start Docker Desktop first." -ForegroundColor Red
    exit 1
}

$account = doctl account get --format Email --no-header 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: doctl not authenticated. Run: doctl auth init" -ForegroundColor Red
    exit 1
}
Write-Host "[ok] Authenticated as $account" -ForegroundColor Green

$registry = (doctl registry get --format Name --no-header 2>&1).Trim()
if ($LASTEXITCODE -ne 0 -or -not $registry) {
    Write-Host "ERROR: No DOCR registry found. Create one: doctl registry create vpc-music" -ForegroundColor Red
    exit 1
}
Write-Host "[ok] Registry: $registry" -ForegroundColor Green

$apps = doctl apps list --format ID,Spec.Name --no-header 2>&1
$appLine = ($apps -split "`n") | Where-Object { $_ -match $appName } | Select-Object -First 1
if (-not $appLine) {
    Write-Host "ERROR: No '$appName' app found. Create it:" -ForegroundColor Red
    Write-Host "  doctl apps create --spec .do/app.stg.yaml" -ForegroundColor Yellow
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

# ── Step 3: Build Docker image ───────────────────────────────
Write-Host ""
Write-Host "[3/5] Building API Docker image ..." -ForegroundColor Cyan

$image = "registry.digitalocean.com/$registry/vpc-music-api"
$gitSha = git -C $repoRoot rev-parse --short HEAD 2>$null
if (-not $gitSha) { $gitSha = "unknown" }
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

# Always refresh the canonical staging tag. Also push a commit-specific tag
# and a deployment timestamp tag for traceability.
docker build `
    -f "$repoRoot\apps\api\Dockerfile" `
    -t "${image}:staging" `
    -t "${image}:${Tag}" `
    -t "${image}:stg-${gitSha}" `
    -t "${image}:stg-${timestamp}" `
    "$repoRoot\apps\api"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker build failed." -ForegroundColor Red
    exit 1
}
Write-Host "[ok] Built: ${image}:staging" -ForegroundColor Green

# ── Step 4: Push to DOCR ─────────────────────────────────────
Write-Host ""
Write-Host "[4/5] Pushing image to DOCR ..." -ForegroundColor Cyan

doctl registry login --expiry-seconds 600
docker push "${image}:staging"
if ($Tag -ne 'staging') {
    docker push "${image}:${Tag}"
}
docker push "${image}:stg-${gitSha}"
docker push "${image}:stg-${timestamp}"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker push failed." -ForegroundColor Red
    exit 1
}
Write-Host "[ok] Pushed staging image(s) to DOCR" -ForegroundColor Green

# ── Step 5: Trigger deployment ───────────────────────────────
Write-Host ""
Write-Host "[5/5] Triggering staging deployment ..." -ForegroundColor Cyan

if ($Wait) {
    doctl apps create-deployment $appId --wait
} else {
    doctl apps create-deployment $appId
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Deployment trigger returned non-zero. Check status:" -ForegroundColor Yellow
    Write-Host "  doctl apps list-deployments $appId" -ForegroundColor Yellow
} else {
    Write-Host "[ok] Staging deployment triggered" -ForegroundColor Green
}

# ── Done ─────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Staging deploy complete!" -ForegroundColor Green
Write-Host "  Image:  ${image}:staging" -ForegroundColor Green
Write-Host "  Commit: $gitSha" -ForegroundColor Green
Write-Host "  App:    $appId" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Verify at: https://stg-api.vpcmusic.life/health" -ForegroundColor Cyan
Write-Host "Logs:      doctl apps logs $appId --type run" -ForegroundColor Cyan
Write-Host ""
