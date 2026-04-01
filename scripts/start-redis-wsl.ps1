# start-redis-wsl.ps1
# Instala e inicia Redis dentro do WSL Ubuntu para desenvolvimento local.
# Funciona mesmo sem Docker Desktop instalado.
# Execute como: powershell -ExecutionPolicy Bypass -File scripts\start-redis-wsl.ps1

$distro = "Ubuntu"

Write-Host ""
Write-Host "=== Attivo SaaS — Redis via WSL ===" -ForegroundColor Cyan
Write-Host ""

# Verifica se WSL existe
$wslCheck = wsl --list --verbose 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] WSL nao encontrado. Instale via: wsl --install" -ForegroundColor Red
    exit 1
}

Write-Host "[1/4] Iniciando WSL Ubuntu..." -ForegroundColor Yellow
wsl -d $distro -- bash -c "echo 'WSL OK'" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Distro $distro nao encontrada. Execute: wsl --install -d Ubuntu" -ForegroundColor Red
    exit 1
}

# Verifica se Redis já está rodando
Write-Host "[2/4] Verificando Redis..." -ForegroundColor Yellow
$ping = wsl -d $distro -- bash -c "redis-cli ping 2>/dev/null"
if ($ping -eq "PONG") {
    Write-Host "[OK] Redis ja esta rodando!" -ForegroundColor Green
} else {
    # Instala Redis se nao existir
    $hasRedis = wsl -d $distro -- bash -c "which redis-server 2>/dev/null"
    if (-not $hasRedis) {
        Write-Host "[3/4] Instalando Redis no WSL (primeira vez)..." -ForegroundColor Yellow
        wsl -d $distro -- bash -c "sudo apt-get update -qq && sudo apt-get install -y redis-server 2>&1 | tail -5"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERRO] Falha ao instalar Redis. Verifique sua conexao com a internet." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "[3/4] Redis ja instalado, iniciando servico..." -ForegroundColor Yellow
    }

    # Inicia o servico
    Write-Host "[4/4] Iniciando Redis..." -ForegroundColor Yellow
    wsl -d $distro -- bash -c "sudo service redis-server start"

    # Aguarda e verifica
    Start-Sleep -Seconds 2
    $ping = wsl -d $distro -- bash -c "redis-cli ping 2>/dev/null"
    if ($ping -eq "PONG") {
        Write-Host "[OK] Redis iniciado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "[ERRO] Redis nao respondeu. Tente manualmente:" -ForegroundColor Red
        Write-Host "  wsl -d Ubuntu -- sudo service redis-server start" -ForegroundColor Gray
        exit 1
    }
}

Write-Host ""
Write-Host "Redis ouvindo em: localhost:6379" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Cyan
Write-Host "  1. cd backend && npm run dev     (backend)"
Write-Host "  2. cd frontend && npm run dev    (frontend)"
Write-Host ""
Write-Host "Para verificar a saude: curl http://localhost:3333/ready"
Write-Host ""
