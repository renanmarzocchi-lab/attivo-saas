# install-docker.ps1
# Instala Docker Desktop via winget (solucao definitiva para dev com compose).
# Execute como: powershell -ExecutionPolicy Bypass -File scripts\install-docker.ps1

Write-Host ""
Write-Host "=== Attivo SaaS — Instalar Docker Desktop ===" -ForegroundColor Cyan
Write-Host ""

# Verifica se Docker ja existe
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerCmd) {
    Write-Host "[OK] Docker ja esta instalado: $(docker --version)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Suba os containers:"
    Write-Host "  docker compose -f backend/docker-compose.yml up -d"
    exit 0
}

# Verifica winget
$wingetCmd = Get-Command winget -ErrorAction SilentlyContinue
if (-not $wingetCmd) {
    Write-Host "[ERRO] winget nao encontrado." -ForegroundColor Red
    Write-Host "Instale Docker Desktop manualmente: https://www.docker.com/products/docker-desktop/"
    exit 1
}

Write-Host "Instalando Docker Desktop via winget..." -ForegroundColor Yellow
Write-Host "(isso pode demorar alguns minutos)"
Write-Host ""

winget install -e --id Docker.DockerDesktop --accept-source-agreements --accept-package-agreements

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] Docker Desktop instalado!" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANTE:" -ForegroundColor Yellow
    Write-Host "  1. Reinicie o computador (ou faça logoff/logon)"
    Write-Host "  2. Abra Docker Desktop e aguarde iniciar"
    Write-Host "  3. Depois execute:"
    Write-Host "     docker compose -f backend/docker-compose.yml up -d"
} else {
    Write-Host ""
    Write-Host "[ERRO] Falha na instalacao. Tente manualmente:" -ForegroundColor Red
    Write-Host "  https://www.docker.com/products/docker-desktop/"
}
