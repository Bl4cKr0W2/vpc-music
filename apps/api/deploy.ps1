# ── VPC Music API — Droplet Deployment Script ──────────────────
#
# Usage:
#   pwsh apps/api/deploy.ps1
#   pwsh apps/api/deploy.ps1 -Env production
#   pwsh apps/api/deploy.ps1 -Env staging
#   pnpm run deploy production
#   pnpm run deploy staging
#
# Config: apps/api/deploy.config.jsonc  (fill this in once, never commit it)
# The script will:
#   1. Read config from deploy.config.jsonc
#   2. Create the DigitalOcean Droplet if it doesn't exist
#   3. Open firewall ports 80/443
#   4. Sync shared/ into apps/api/shared/
#   5. Archive and SCP the API source to the Droplet
#   6. Run docker compose up --build on the Droplet
# ─────────────────────────────────────────────────────────────────

param(
    [string]$Env = "production"
)

$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# ── Helpers ───────────────────────────────────────────────────────

function Read-Config {
    $configPath = Join-Path $scriptRoot "deploy.config.jsonc"
    if (-not (Test-Path $configPath)) {
        throw "Missing config file: $configPath`nCopy deploy.config.example.jsonc to deploy.config.jsonc and fill in your values."
    }
    $raw = Get-Content $configPath -Raw
    # Strip // and /* */ comments
    $raw = [regex]::Replace($raw, "/\*[\s\S]*?\*/", "")
    $raw = [regex]::Replace($raw, "(?m)^\s*//.*$", "")
    $raw = [regex]::Replace($raw, ",\s*([}\]])", '$1')
    return ConvertFrom-Json $raw
}

function Get-Setting {
    param(
        [object]$Cfg,
        [string]$Key,
        [object]$Default = $null
    )

    $names = New-Object System.Collections.Generic.List[string]
    if ($Env -match '^(stg|stage|staging)$') {
        $names.Add("STG_$Key")
        $names.Add("STAGING_$Key")
    }
    $names.Add($Key)

    foreach ($name in $names) {
        $envValue = [Environment]::GetEnvironmentVariable($name)
        if (-not [string]::IsNullOrWhiteSpace($envValue)) {
            return $envValue
        }
    }

    if ($Key -eq 'DO_TOKEN') {
        foreach ($alias in @('DIGITALOCEAN_TOKEN', 'DIGITALOCEAN_ACCESS_TOKEN')) {
            $envValue = [Environment]::GetEnvironmentVariable($alias)
            if (-not [string]::IsNullOrWhiteSpace($envValue)) {
                return $envValue
            }
        }
    }

    foreach ($name in $names) {
        $prop = $Cfg.PSObject.Properties[$name]
        if ($prop) {
            $value = $prop.Value
            if ($null -ne $value -and -not [string]::IsNullOrWhiteSpace([string]$value)) {
                return $value
            }
        }
    }

    return $Default
}

function Invoke-DO {
    param([string]$Method, [string]$Path, [object]$Body, [string]$Token)
    $headers = @{ Authorization = "Bearer $Token"; "Content-Type" = "application/json" }
    $uri = "https://api.digitalocean.com/v2$Path"
    $json = if ($Body) { $Body | ConvertTo-Json -Depth 10 } else { $null }
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -Body $json -ErrorAction Stop
}

function Get-DropletByName {
    param([string]$Name, [string]$Token)
    $res = Invoke-DO -Method Get -Path "/droplets?page=1&per_page=200" -Body $null -Token $Token
    $found = $res.droplets | Where-Object { $_.name -eq $Name }
    return $found | Select-Object -First 1
}

function Resolve-Droplet {
    param([object]$Cfg, [string]$Token)
    $existing = Get-DropletByName -Name $Cfg.DROPLET_NAME -Token $Token
    if ($existing) {
        $ip = $existing.networks.v4 | Where-Object { $_.type -eq "public" } | Select-Object -First 1 -ExpandProperty ip_address
        Write-Host "  Droplet '$($Cfg.DROPLET_NAME)' already exists at $ip" -ForegroundColor Green
        return @{ id = $existing.id; ip = $ip }
    }

    Write-Host "  Creating droplet '$($Cfg.DROPLET_NAME)'..." -ForegroundColor Yellow
    $body = @{
        name       = $Cfg.DROPLET_NAME
        region     = $Cfg.DO_REGION
        size       = $Cfg.DO_SIZE
        image      = $Cfg.DO_IMAGE
        monitoring = $true
        ipv6       = $false
        tags       = @("vpc-music", "api", $Env)
    }
    if ($Cfg.DO_SSH_KEY_ID) { $body.ssh_keys = @($Cfg.DO_SSH_KEY_ID) }

    $resp = Invoke-DO -Method Post -Path "/droplets" -Body $body -Token $Token
    $id = $resp.droplet.id
    Write-Host "  Droplet created (id $id). Waiting for IP..." -ForegroundColor Yellow
    $ip = $null
    $attempts = 0
    while (-not $ip -and $attempts -lt 24) {
        Start-Sleep -Seconds 10
        $attempts++
        $created = Get-DropletByName -Name $Cfg.DROPLET_NAME -Token $Token
        $ip = $created.networks.v4 | Where-Object { $_.type -eq "public" } | Select-Object -First 1 -ExpandProperty ip_address
        if (-not $ip) { Write-Host "  Still waiting... ($($attempts * 10)s)" -ForegroundColor DarkGray }
    }
    if (-not $ip) { throw "Droplet created but IP never assigned after 4 minutes. Check DigitalOcean dashboard." }
    Write-Host "  Droplet ready at $ip" -ForegroundColor Green
    return @{ id = $id; ip = $ip }
}

function Ensure-FirewallRules {
    param([string]$DropletId, [string]$Token, [string]$FirewallName)
    $firewalls = (Invoke-DO -Method Get -Path "/firewalls?page=1&per_page=200" -Body $null -Token $Token).firewalls
    $fw = $firewalls | Where-Object { $_.droplet_ids -contains [int]$DropletId } | Select-Object -First 1

    $rulesToAdd = @(
        @{ protocol = 'tcp'; ports = '80';  sources = @{ addresses = @('0.0.0.0/0', '::/0') } },
        @{ protocol = 'tcp'; ports = '443'; sources = @{ addresses = @('0.0.0.0/0', '::/0') } }
    )

    if (-not $fw) {
        Write-Host "  Creating firewall for droplet $DropletId..." -ForegroundColor Yellow
        $body = @{
            name          = $FirewallName
            droplet_ids   = @([int]$DropletId)
            inbound_rules = @(
                @{ protocol = 'tcp'; ports = '22';  sources = @{ addresses = @('0.0.0.0/0', '::/0') } }
            ) + $rulesToAdd
            outbound_rules = @(
                @{ protocol = 'tcp';  ports = 'all'; destinations = @{ addresses = @('0.0.0.0/0', '::/0') } },
                @{ protocol = 'udp';  ports = 'all'; destinations = @{ addresses = @('0.0.0.0/0', '::/0') } },
                @{ protocol = 'icmp';               destinations = @{ addresses = @('0.0.0.0/0', '::/0') } }
            )
        }
        Invoke-DO -Method Post -Path "/firewalls" -Body $body -Token $Token | Out-Null
        Write-Host "  Firewall created." -ForegroundColor Green
    } else {
        Write-Host "  Firewall '$($fw.name)' exists. Ensuring 80/443 rules..." -ForegroundColor Yellow
        $missing = $rulesToAdd | Where-Object {
            $port = $_.ports
            -not ($fw.inbound_rules | Where-Object { $_.protocol -eq 'tcp' -and $_.ports -eq $port })
        }
        if ($missing.Count -gt 0) {
            Invoke-DO -Method Post -Path "/firewalls/$($fw.id)/rules" -Body @{ inbound_rules = $missing } -Token $Token | Out-Null
            Write-Host "  Rules added." -ForegroundColor Green
        } else {
            Write-Host "  Rules already present." -ForegroundColor Green
        }
    }
}

function Find-SshKey {
    $userProfile = [Environment]::GetFolderPath("UserProfile")
    foreach ($name in @("id_ed25519", "id_rsa", "id_ecdsa")) {
        $path = Join-Path $userProfile ".ssh/$name"
        if (Test-Path $path) { return $path }
    }
    return $null
}

function Wait-ForHealthCheck {
    param(
        [string[]]$Urls,
        [int]$MaxAttempts = 20,
        [int]$DelaySeconds = 6
    )

    foreach ($url in $Urls) {
        if ([string]::IsNullOrWhiteSpace($url)) {
            continue
        }

        Write-Host "  Checking health: $url" -ForegroundColor Yellow

        for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
            try {
                $response = Invoke-WebRequest -Uri $url -Method Get -TimeoutSec 10 -UseBasicParsing
                if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                    Write-Host "  [ok] Health check passed: $url" -ForegroundColor Green
                    return $url
                }
            } catch {
                if ($attempt -eq $MaxAttempts) {
                    Write-Host "  [warn] Health check failed for $url after $MaxAttempts attempts" -ForegroundColor Yellow
                } else {
                    Write-Host "  Waiting for API health... attempt ${attempt}/${MaxAttempts}" -ForegroundColor DarkGray
                    Start-Sleep -Seconds $DelaySeconds
                }
            }
        }
    }

    throw "API health check failed for all configured endpoints."
}

# ── Main ──────────────────────────────────────────────────────────

Write-Host ""
Write-Host "VPC Music API Deploy — env: $Env" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────" -ForegroundColor DarkGray

# [0] Load config
Write-Host "[0/5] Loading deploy config..." -ForegroundColor Yellow
$cfg = Read-Config

$doToken      = Get-Setting -Cfg $cfg -Key 'DO_TOKEN'
$deployUser   = Get-Setting -Cfg $cfg -Key 'DEPLOY_USER' -Default 'root'
$deployPath   = Get-Setting -Cfg $cfg -Key 'DEPLOY_PATH' -Default '~/vpc-music/api'
$deployPort   = Get-Setting -Cfg $cfg -Key 'DEPLOY_PORT' -Default 22
$keyPath      = Get-Setting -Cfg $cfg -Key 'DEPLOY_KEY_PATH'
$dropletName  = Get-Setting -Cfg $cfg -Key 'DROPLET_NAME' -Default 'vpc-music-api'
$doRegion     = Get-Setting -Cfg $cfg -Key 'DO_REGION' -Default 'nyc3'
$doSize       = Get-Setting -Cfg $cfg -Key 'DO_SIZE' -Default 's-1vcpu-2gb'
$doImage      = Get-Setting -Cfg $cfg -Key 'DO_IMAGE' -Default 'ubuntu-24-04-x64'
$doSshKeyId   = Get-Setting -Cfg $cfg -Key 'DO_SSH_KEY_ID'
$certDomain   = Get-Setting -Cfg $cfg -Key 'CERTBOT_DOMAIN'
$certEmail    = Get-Setting -Cfg $cfg -Key 'CERTBOT_EMAIL'
$profiles     = Get-Setting -Cfg $cfg -Key 'COMPOSE_PROFILES' -Default 'proxy'
$firewallName = Get-Setting -Cfg $cfg -Key 'FIREWALL_NAME' -Default "$dropletName-firewall"

if (-not $keyPath) {
    $keyPath = Find-SshKey
}

if (-not $keyPath -or -not (Test-Path $keyPath)) {
    throw "SSH key not found. Set DEPLOY_KEY_PATH in deploy.config.jsonc or place a key in ~/.ssh/"
}

# Expand ~ in deploy path for remote commands
$deployPathResolved = $deployPath
if ($deployPathResolved -like "~/*") {
    $homeDir = if ($deployUser -eq "root") { "/root" } else { "/home/$deployUser" }
    $deployPathResolved = $deployPathResolved -replace "^~", $homeDir
}

Write-Host "  Config loaded. Key: $keyPath" -ForegroundColor Green

# [1] Ensure Droplet exists
Write-Host "[1/5] Ensuring Droplet..." -ForegroundColor Yellow
if (-not $doToken) { throw "DO_TOKEN is required in deploy.config.jsonc or environment variables." }
Invoke-DO -Method Get -Path "/account" -Body $null -Token $doToken | Out-Null

$cfg | Add-Member -NotePropertyName "DROPLET_NAME" -NotePropertyValue $dropletName -Force
$cfg | Add-Member -NotePropertyName "DO_REGION"    -NotePropertyValue $doRegion    -Force
$cfg | Add-Member -NotePropertyName "DO_SIZE"      -NotePropertyValue $doSize      -Force
$cfg | Add-Member -NotePropertyName "DO_IMAGE"     -NotePropertyValue $doImage     -Force
$cfg | Add-Member -NotePropertyName "DO_SSH_KEY_ID" -NotePropertyValue $doSshKeyId -Force
$droplet = Resolve-Droplet -Cfg $cfg -Token $doToken
$deployHost = $droplet.ip

# [2] Ensure firewall
Write-Host "[2/5] Ensuring firewall rules..." -ForegroundColor Yellow
Ensure-FirewallRules -DropletId $droplet.id -Token $doToken -FirewallName $firewallName

# [3] Package API
Write-Host "[3/5] Packaging API..." -ForegroundColor Yellow
$repoRoot = Resolve-Path (Join-Path $scriptRoot "../../")
$archive  = Join-Path $scriptRoot "vpc-music-api-deploy.tar.gz"
if (Test-Path $archive) { Remove-Item $archive -Force }

# Sync shared/ into apps/api/shared/ first
Write-Host "  Syncing shared/..." -ForegroundColor Yellow
$sharedSrc = Join-Path $repoRoot "shared"
$sharedDst = Join-Path $scriptRoot "shared"
if (Test-Path $sharedDst) { Remove-Item $sharedDst -Recurse -Force }
Copy-Item -Path $sharedSrc -Destination $sharedDst -Recurse

Push-Location $scriptRoot
& "$env:SystemRoot\System32\tar.exe" -czf "vpc-music-api-deploy.tar.gz" --exclude=node_modules --exclude=.git --exclude=vpc-music-api-deploy.tar.gz .
Pop-Location
Write-Host "  Archive ready: $archive" -ForegroundColor Green

# [4] Upload to Droplet
Write-Host "[4/5] Uploading to $deployUser@${deployHost}:$deployPath ..." -ForegroundColor Yellow

# Wait for SSH to become available (fresh Droplets need ~30-60s to boot)
Write-Host "  Waiting for SSH..." -ForegroundColor Yellow
$sshReady = $false
for ($i = 0; $i -lt 18; $i++) {
    & ssh -i "$keyPath" -p $deployPort -o StrictHostKeyChecking=no -o ConnectTimeout=5 -o BatchMode=yes -o LogLevel=ERROR "$deployUser@$deployHost" "echo ok" 2>$null
    if ($LASTEXITCODE -eq 0) { $sshReady = $true; break }
    Write-Host "  SSH not ready yet, retrying... ($($i * 10)s)" -ForegroundColor DarkGray
    Start-Sleep -Seconds 10
}
if (-not $sshReady) { throw "SSH never became available on $deployHost. Check the Droplet in DigitalOcean." }
Write-Host "  SSH ready." -ForegroundColor Green

& ssh -i "$keyPath" -p $deployPort -o StrictHostKeyChecking=no -o LogLevel=ERROR "$deployUser@$deployHost" "mkdir -p $deployPathResolved"
& scp -i "$keyPath" -P $deployPort -o StrictHostKeyChecking=no -o LogLevel=ERROR $archive "${deployUser}@${deployHost}:${deployPathResolved}/api.tar.gz"
Remove-Item $archive -Force -ErrorAction SilentlyContinue

# Upload .env files
$envEnv = Join-Path $scriptRoot ".env.$Env.example"
if (Test-Path $envEnv) {
    Write-Host "  Uploading .env (from .env.$Env.example)..." -ForegroundColor Yellow
    & scp -i "$keyPath" -P $deployPort -o StrictHostKeyChecking=no -o LogLevel=ERROR $envEnv "${deployUser}@${deployHost}:${deployPathResolved}/.env"
    Write-Host "  Uploading .env.$Env (from .env.$Env.example)..." -ForegroundColor Yellow
    & scp -i "$keyPath" -P $deployPort -o StrictHostKeyChecking=no -o LogLevel=ERROR $envEnv "${deployUser}@${deployHost}:${deployPathResolved}/.env.$Env"
} else {
    throw "Missing .env.$Env.example at $envEnv - cannot deploy without environment config."
}

Write-Host "  Upload complete." -ForegroundColor Green

# [5] Deploy on Droplet
Write-Host "[5/5] Building and starting containers on Droplet..." -ForegroundColor Yellow
$remoteScript = @"
set -e

wait_for_apt() {
    local attempts=0
    while pgrep -x apt >/dev/null 2>&1 \
       || pgrep -x apt-get >/dev/null 2>&1 \
       || pgrep -x unattended-upgrade >/dev/null 2>&1 \
       || pgrep -x dpkg >/dev/null 2>&1 \
       || systemctl is-active --quiet apt-daily.service \
       || systemctl is-active --quiet apt-daily-upgrade.service; do
        attempts=`$((attempts + 1))
        if [ "`$attempts" -gt 60 ]; then
            echo "[preflight] Timed out waiting for apt/dpkg locks to clear."
            return 1
        fi
        echo "[preflight] Waiting for apt/dpkg locks to clear... (`${attempts}/60)"
        sleep 5
    done
}

if command -v cloud-init >/dev/null 2>&1; then
    echo "[preflight] Waiting for cloud-init to finish..."
    cloud-init status --wait || true
fi

# Install Docker if missing
if ! command -v docker >/dev/null 2>&1; then
    echo "[preflight] Installing Docker via official script..."
    export DEBIAN_FRONTEND=noninteractive
    wait_for_apt
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
fi

# Install docker compose plugin if missing
if ! docker compose version >/dev/null 2>&1; then
    echo "[preflight] Installing docker-compose-plugin..."
    wait_for_apt
    apt-get update -q
    wait_for_apt
    apt-get install -y -q docker-compose-plugin
fi

mkdir -p $deployPathResolved
cd $deployPathResolved
tar -xzf api.tar.gz
if [ ! -f .env.$Env ]; then touch .env.$Env; fi

# Issue SSL certificate if not yet present
if echo "$profiles" | grep -q "proxy" && [ ! -f "./certbot/conf/live/$certDomain/fullchain.pem" ]; then
    if [ -n "$certEmail" ] && [ -n "$certDomain" ]; then
        echo "[certbot] Issuing initial certificate for $certDomain..."
        mkdir -p ./certbot/conf ./certbot/www
        docker run --rm -p 80:80 \
            -v "`$(pwd)/certbot/conf:/etc/letsencrypt" \
            -v "`$(pwd)/certbot/www:/var/www/certbot" \
            certbot/certbot certonly --standalone \
            -d $certDomain -m $certEmail \
            --agree-tos --no-eff-email --non-interactive
    else
        echo "[certbot] Skipping (CERTBOT_EMAIL or CERTBOT_DOMAIN not set)."
    fi
fi

# Deploy
ENV=$Env COMPOSE_PROFILES=$profiles CERTBOT_DOMAIN=$certDomain \
docker compose --env-file .env --env-file .env.$Env -f compose.yml down --remove-orphans || true

ENV=$Env COMPOSE_PROFILES=$profiles CERTBOT_DOMAIN=$certDomain \
docker compose --env-file .env --env-file .env.$Env -f compose.yml up -d --build

echo "[done] Containers running:"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
"@

$remoteScript = $remoteScript -replace "`r", ""
$tmpScript = Join-Path $scriptRoot "deploy-remote-tmp.sh"
Set-Content -Path $tmpScript -Value $remoteScript -NoNewline -Encoding ascii
& scp -i "$keyPath" -P $deployPort -o StrictHostKeyChecking=no -o LogLevel=ERROR $tmpScript "${deployUser}@${deployHost}:${deployPathResolved}/deploy-remote.sh"
Remove-Item $tmpScript -Force
& ssh -i "$keyPath" -p $deployPort -o StrictHostKeyChecking=no -o LogLevel=ERROR "$deployUser@$deployHost" "chmod +x $deployPathResolved/deploy-remote.sh && bash $deployPathResolved/deploy-remote.sh"
if ($LASTEXITCODE -ne 0) {
    throw "Remote deployment failed on $deployHost with exit code $LASTEXITCODE"
}

$healthUrls = @("http://$deployHost/health")
if ($certDomain) {
    $healthUrls = @("https://$certDomain/health", "http://$deployHost/health")
}

Write-Host "[6/6] Verifying API health..." -ForegroundColor Yellow
$healthyUrl = Wait-ForHealthCheck -Urls $healthUrls

Write-Host ""
Write-Host "Deploy complete. API live at http://$deployHost" -ForegroundColor Cyan
if ($certDomain) { Write-Host "                             https://$certDomain" -ForegroundColor Cyan }
Write-Host "Health:                       $healthyUrl" -ForegroundColor Green
Write-Host ""
