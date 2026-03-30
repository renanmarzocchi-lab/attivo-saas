.PHONY: dev dev-backend dev-frontend dev-infra setup migrate seed stop logs help

## ─── Desenvolvimento local ──────────────────────────────────────────────────

dev-infra: ## Sobe PostgreSQL + Redis via Docker (pré-requisito para dev)
	docker compose -f backend/docker-compose.yml up -d
	@echo "Aguardando serviços..."
	@sleep 5
	@echo "  PostgreSQL → localhost:5432"
	@echo "  Redis      → localhost:6379"

dev: dev-infra ## Sobe tudo em dev (infra + migrations + backend + frontend)
	$(MAKE) migrate
	$(MAKE) seed
	@echo ""
	@echo "Inicie em terminais separados:"
	@echo "  make dev-backend   → http://localhost:3333"
	@echo "  make dev-frontend  → http://localhost:3000"
	@echo "  Health             → http://localhost:3333/health"
	@echo "  Ready              → http://localhost:3333/ready"

dev-backend: ## Sobe apenas o backend (requer infra rodando)
	cd backend && npm run dev

dev-frontend: ## Sobe apenas o frontend
	cd frontend && npm run dev

## ─── Banco de dados ─────────────────────────────────────────────────────────

db-up: ## Sobe PostgreSQL + Redis via Docker
	docker compose -f backend/docker-compose.yml up -d

db-down: ## Para PostgreSQL + Redis
	docker compose -f backend/docker-compose.yml down

migrate: ## Executa migrations do Prisma
	cd backend && npx prisma migrate dev --name init 2>/dev/null || npx prisma migrate deploy

seed: ## Popula banco com dados iniciais (admin)
	cd backend && node prisma/seed.js

prisma-studio: ## Abre o Prisma Studio (GUI do banco)
	cd backend && npx prisma studio

## ─── Setup inicial ──────────────────────────────────────────────────────────

setup: ## Configura o projeto do zero
	@echo "Instalando dependências..."
	cd backend  && npm install
	cd frontend && npm install
	@[ -f backend/.env  ] || cp backend/.env.example  backend/.env
	@[ -f frontend/.env.local ] || cp frontend/.env.example frontend/.env.local
	@echo ""
	@echo "Setup concluído! Edite backend/.env com suas configurações."
	@echo "Execute 'make dev' para iniciar."

## ─── Produção (Docker Compose completo) ────────────────────────────────────

prod-up: ## Sobe stack completa em produção
	docker-compose up -d --build

prod-down: ## Para a stack de produção
	docker-compose down

prod-logs: ## Exibe logs de todos os serviços
	docker-compose logs -f

## ─── Utilitários ────────────────────────────────────────────────────────────

stop: ## Para todos os serviços Docker
	docker compose down 2>/dev/null; docker compose -f backend/docker-compose.yml down 2>/dev/null; true

logs: ## Exibe logs do backend em dev
	cd backend && npm run dev

help: ## Exibe esta ajuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
