# ATTIVO SaaS — CRM & Sistema Operacional para Corretoras de Seguros

Sistema completo de gestão comercial, afiliados, CRM de seguros e operações para corretoras.

---

## Arquitetura

```
┌─────────────┐    ┌──────────────┐    ┌───────────┐
│  Next.js    │───▶│  Fastify API │───▶│ PostgreSQL │
│  (frontend) │    │  (backend)   │    └───────────┘
└─────────────┘    └──────┬───────┘
                          │
                   ┌──────▼───────┐
                   │    Redis     │
                   │  + BullMQ   │
                   └──────┬───────┘
                          │
              ┌───────────┴───────────┐
              │         Workers        │
              │  notifications         │
              │  whatsapp             │
              │  renewal              │
              └───────────────────────┘
```

**Stack:**
- **Backend:** Node.js · Fastify · Prisma · PostgreSQL
- **Filas:** Redis · BullMQ (notifications, whatsapp, renewal, document)
- **Logs:** pino (estruturado, parseável)
- **Frontend:** Next.js · TypeScript · App Router
- **Infra:** Docker Compose · CI/CD GitHub Actions

---

## Módulos

| Módulo | Descrição |
|--------|-----------|
| Auth | Login, refresh token, sessões revogáveis |
| Afiliados | Cadastro, aprovação, tracking (refCode/clique/lead) |
| Conversões | Pipeline de conversão com comissões |
| Pagamentos | Geração e rastreamento de pagamentos |
| Comercial | CRM de seguros com pipeline Kanban |
| Broker | Carteira de seguros, upload de anexos |
| Renovação | Cron + BullMQ com idempotência e RenewalRunLog |
| Notificações | Sistema + WhatsApp (provider plugável) |
| Ops | Dashboard operacional — filas, falhas, renovações |

---

## Pré-requisitos

- Node.js 20+
- Docker + Docker Compose
- PostgreSQL 16+
- Redis 7+

---

## Setup de Desenvolvimento

### 1. Suba Postgres + Redis

```bash
docker compose up postgres redis -d
```

### 2. Configure as envs

```bash
cp backend/.env.example backend/.env   # edite conforme necessário
cp frontend/.env.example frontend/.env.local
```

### 3. Instale dependências

```bash
cd backend  && npm install
cd frontend && npm install
```

### 4. Migração e geração do client Prisma

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
node prisma/seed.js
```

### 5. Inicie os servidores

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

**URLs:**
- Frontend:  http://localhost:3000
- Backend:   http://localhost:3333
- Health:    http://localhost:3333/health
- Readiness: http://localhost:3333/ready

---

## Envs Importantes

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
JWT_SECRET=...

# WhatsApp
WHATSAPP_PROVIDER=stub            # stub | evolution | zapi | twilio
WHATSAPP_API_URL=https://...      # (evolution)
WHATSAPP_API_KEY=...
WHATSAPP_INSTANCE=...

# Storage
STORAGE_PROVIDER=local            # local | s3
STORAGE_LOCAL_PATH=./uploads
STORAGE_MAX_SIZE_MB=10

# S3 (se STORAGE_PROVIDER=s3)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=attivo-files
S3_ENDPOINT=...                   # opcional: MinIO / R2 / DO Spaces
S3_PUBLIC_URL=...                 # CDN ou endpoint público

# Auth
ACCESS_TOKEN_EXPIRES=8h
REFRESH_TOKEN_DAYS=30

LOG_LEVEL=debug
```

---

## Filas (BullMQ)

| Fila | Concorrência | Retry | Descrição |
|------|-------------|-------|-----------|
| notifications | 5 | 3x exponencial | Envio de notificações internas e WhatsApp |
| whatsapp | 3 | 5x exponencial | Envio direto de mensagens WhatsApp |
| renewal | 1 | 1x | Check diário de renovação (idempotente por data) |
| document | 3 | 3x fixo | Processamento de anexos (extensível) |

**Idempotência do renewal:** `jobId: renewal-YYYY-MM-DD` — BullMQ descarta jobs duplicados com mesmo ID.

---

## WhatsApp Providers

Configure `WHATSAPP_PROVIDER` para um dos provedores:

| Provider | Envs necessárias |
|----------|-----------------|
| `evolution` | WHATSAPP_API_URL, WHATSAPP_API_KEY, WHATSAPP_INSTANCE |
| `zapi` | ZAPI_INSTANCE_ID, ZAPI_TOKEN, ZAPI_CLIENT_TOKEN |
| `twilio` | TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM |
| `stub` | nenhuma (padrão dev, apenas loga) |

---

## Storage Providers

| Provider | Descrição |
|----------|-----------|
| `local` | Disco local em `./uploads` (dev) |
| `s3` | AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces |

**Tipos permitidos:** PDF, JPEG, PNG, WEBP, DOCX, XLSX, TXT
**Tamanho máximo:** `STORAGE_MAX_SIZE_MB` (padrão: 10 MB)

---

## Auth

O sistema usa **JWT de curta duração (8h)** + **Refresh Token (30 dias)**:

- `POST /auth/login` — retorna `accessToken` + `refreshToken`
- `POST /auth/refresh` — rotaciona refresh token, retorna novo par
- `POST /auth/logout` — revoga sessão (1 ou todas)
- `GET  /auth/sessions` — lista sessões ativas

Refresh tokens são armazenados como **SHA-256 hash** no banco (model `Session`).

---

## Observabilidade

### Logs (pino)

```bash
# Dev: colorizado
npm run dev

# Produção: JSON estruturado
NODE_ENV=production npm start

# Filtrar erros
npm start | grep '"level":50'
```

Cada request tem `requestId` propagado no header `X-Request-Id`.

### Health Endpoints

```bash
GET /health   # liveness — app está viva
GET /ready    # readiness — banco + redis ok
```

### Ops Dashboard (admin)

```
GET /api/v1/admin/ops/summary        # visão geral operacional
GET /api/v1/admin/ops/jobs           # status das filas BullMQ
GET /api/v1/admin/ops/notifications  # notificações com filtro de status
GET /api/v1/admin/ops/whatsapp       # log de mensagens WhatsApp
GET /api/v1/admin/ops/renewal-runs   # histórico de execuções do renewal job
```

---

## Testes

```bash
cd backend

# Roda todos os testes
npm test

# Watch mode
npm run test:watch

# Com cobertura
npm run test:coverage
```

**Suites:**
- `auth.test.js` — login, refresh token, sessão inválida, logout
- `insurance.test.js` — permissões broker/admin, isolamento
- `renewal.test.js` — idempotência do RenewalRunLog

> **Requer banco de dados real.** Configure `TEST_DATABASE_URL` no `.env` para isolar dos dados de dev.

---

## Deploy com Docker Compose

```bash
# Produção completa
cp .env.example .env   # edite com valores de produção
docker compose up --build -d

# Verificar
docker compose ps
curl http://localhost:3333/ready
```

O serviço `migrate` roda `prisma migrate deploy` + `prisma generate` + seed automaticamente.

---

## Makefile

```bash
make setup     # instala deps (backend + frontend)
make dev       # sobe postgres + redis e inicia dev servers
make migrate   # roda migrations
make seed      # popula banco com dados iniciais
make test      # roda testes do backend
make prod-up   # sobe stack completa em produção
make prod-down # para stack
```

---

## Multi-Tenant

O banco está preparado para multi-tenant com o model `Tenant`.
Usuários têm `tenantId` opcional — atualmente todos compartilham o tenant padrão criado pelo seed.
A camada de isolamento completo (filtro automático por tenant) é o próximo passo de escala.

---

## Limitações Conhecidas

| Item | Status |
|------|--------|
| Sentry integration | Adapter preparado (TODO: adicionar DSN) |
| Email notifications | Enum `EMAIL` presente, worker a implementar |
| Multi-tenant isolation | Schema pronto, filtro automático pendente |
| WebSocket (notificações em tempo real) | Não implementado |
| Super-admin global (cross-tenant) | Não implementado |
| Upload de múltiplos arquivos | 1 arquivo por request |

---

## Troubleshooting

**`@prisma/client did not initialize`**
```bash
cd backend && npx prisma generate
```

**Redis connection refused**
```bash
docker compose up redis -d
```

**Porta 3333 em uso**
```bash
# Windows
netstat -ano | findstr :3333
taskkill /PID <pid> /F
```

**Migrations pendentes**
```bash
cd backend && npx prisma migrate dev
```
