# dev-start.ps1
# Script de inicializacao completo para desenvolvimento Attivo SaaS.
# Detecta automaticamente Docker ou WSL e inicia o Redis.
# Execute: powershell -ExecutionPolicy Bypass -File scripts\dev-start.ps1

$root = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Attivo SaaS — Dev Start            ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ─── 1. Verificar/Iniciar Redis ───────────────────────────────────────────────
Write-Host "[Redis] Verificando disponibilidade..." -ForegroundColor Yellow

# Testa se Redis ja responde (qualquer meio)
function Test-Redis {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.ConnectAsync("127.0.0.1", 6379).Wait(1000) | Out-Null
        $result = $tcp.Connected
        $tcp.Close()
        return $result
    } catch {
        return $false
    }
}

if (Test-Redis) {
    Write-Host "[Redis] Ja esta rodando em localhost:6379" -ForegroundColor Green
} else {
    # Tenta Docker primeiro
    $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
    if ($dockerCmd) {
        Write-Host "[Redis] Subindo via Docker Compose..." -ForegroundColor Yellow
        Push-Location $root
        docker compose -f backend/docker-compose.yml up -d redis
        Pop-Location
        Start-Sleep -Seconds 3
    }
    # Se Docker nao disponivel ou Redis ainda nao responde, tenta WSL
    if (-not (Test-Redis)) {
        Write-Host "[Redis] Docker nao disponivel, tentando WSL..." -ForegroundColor Yellow
        $wslRedis = wsl -d Ubuntu -- bash -c "redis-cli ping 2>/dev/null" 2>&1
        if ($wslRedis -ne "PONG") {
            wsl -d Ubuntu -- bash -c "sudo service redis-server start" 2>&1 | Out-Null
            Start-Sleep -Seconds 2
        }
    }
    # Verificacao final
    if (Test-Redis) {
        Write-Host "[Redis] Conectado em localhost:6379" -ForegroundColor Green
    } else {
        Write-Host "[AVISO] Redis nao iniciou. Backend rodara em modo degradado." -ForegroundColor Red
        Write-Host "        Execute: powershell -ExecutionPolicy Bypass -File scripts\start-redis-wsl.ps1"
        Write-Host ""
    }
}

# ─── 2. Verificar PostgreSQL ──────────────────────────────────────────────────
Write-Host ""
Write-Host "[PostgreSQL] Verificando..." -ForegroundColor Yellow
function Test-Postgres {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.ConnectAsync("127.0.0.1", 5432).Wait(1000) | Out-Null
        $result = $tcp.Connected
        $tcp.Close()
        return $result
    } catch {
        return $false
    }
}
if (Test-Postgres) {
    Write-Host "[PostgreSQL] Rodando em localhost:5432" -ForegroundColor Green
} else {
    Write-Host "[PostgreSQL] Nao encontrado, subindo via Docker..." -ForegroundColor Yellow
    $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
    if ($dockerCmd) {
        Push-Location $root
        docker compose -f backend/docker-compose.yml up -d postgres
        Pop-Location
        Write-Host "[PostgreSQL] Container iniciado" -ForegroundColor Green
    } else {
        Write-Host "[ERRO] PostgreSQL nao disponivel e Docker nao instalado." -ForegroundColor Red
        Write-Host "       Instale PostgreSQL: https://www.postgresql.org/download/windows/"
    }
}

# ─── 3. Instruções ───────────────────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host " Infraestrutura pronta!" -ForegroundColor Green
Write-Host " Abra 2 terminais adicionais:" -ForegroundColor White
Write-Host ""
Write-Host "  Terminal 1 (Backend):"  -ForegroundColor Yellow
Write-Host "    cd backend && npm run dev"
Write-Host ""
Write-Host "  Terminal 2 (Frontend):" -ForegroundColor Yellow
Write-Host "    cd frontend && npm run dev"
Write-Host ""
Write-Host "  Endpoints:"
Write-Host "    API    → http://localhost:3333/api/v1"
Write-Host "    Health → http://localhost:3333/health"
Write-Host "    Ready  → http://localhost:3333/ready"
Write-Host "    App    → http://localhost:3000"
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
