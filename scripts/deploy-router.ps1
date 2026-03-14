# ── deploy-router.ps1 — Route deploy commands by target ───────
#
# Usage:
#   .\scripts\deploy-router.ps1 production           # deploy to production
#   .\scripts\deploy-router.ps1 staging               # deploy to staging (default)
#   .\scripts\deploy-router.ps1 staging -SkipTests    # staging, skip tests
#   .\scripts\deploy-router.ps1 production -Tag v2    # production with custom tag
#
param(
    [Parameter(Position = 0)]
    [string]$Target = 'staging',
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$RemainingArgs
)
$ErrorActionPreference = 'Stop'
$targetName = $Target.ToLowerInvariant()
switch ($targetName) {
    { $_ -in @('prd', 'prod', 'production', 'main') } {
        & "$PSScriptRoot\deploy.ps1" @RemainingArgs
        exit $LASTEXITCODE
    }
    { $_ -in @('stg', 'stage', 'staging') } {
        & "$PSScriptRoot\deploy-staging.ps1" @RemainingArgs
        exit $LASTEXITCODE
    }
    default {
        Write-Host "ERROR: Unknown deploy target '$Target'. Use 'production' or 'staging'." -ForegroundColor Red
        exit 1
    }
}
