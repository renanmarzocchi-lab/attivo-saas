# Deploy — Attivo SaaS em Produção

**Domínio:** attivocorretora.com.br
**Stack:** Next.js (frontend) + Fastify (backend) + PostgreSQL + Redis + Nginx + PM2

---

## Pré-requisitos

- VPS Ubuntu 22.04 (mín. 2 GB RAM / 2 vCPU)
- Acesso SSH root
- Domínio `attivocorretora.com.br` apontando para o IP da VPS

**Recomendações de VPS (custo/benefício):**

| Provedor | Plano | RAM | CPU | Preço aprox. |
|---|---|---|---|---|
| Hostinger | VPS 2 | 2 GB | 2 vCPU | ~R$ 40/mês |
| DigitalOcean | Droplet Basic | 2 GB | 1 vCPU | ~R$ 55/mês |
| Contabo | VPS S | 8 GB | 4 vCPU | ~R$ 45/mês |

---

## PASSO 1 — Apontar DNS

No painel do seu registrador (registro.br, Cloudflare, etc.):

```
Tipo  | Nome                           | Valor
------+--------------------------------+----------
A     | attivocorretora.com.br         | IP_DA_VPS
A     | www.attivocorretora.com.br     | IP_DA_VPS
A     | api.attivocorretora.com.br     | IP_DA_VPS
```

> Aguarde propagação (geralmente 5–30 min). Verifique com: `ping attivocorretora.com.br`

---

## PASSO 2 — Subir código no GitHub

Se ainda não tem repositório:

```bash
# No seu computador Windows:
cd C:\Users\Usuario\Downloads\attivo-saas-repositorio-completo-reconstruido

git init
git add .
git commit -m "Initial commit"

# Crie um repositório no github.com e depois:
git remote add origin https://github.com/SEU_USUARIO/attivo-saas.git
git push -u origin main
```

---

## PASSO 3 — Conectar na VPS e configurar

```bash
# Conectar via SSH
ssh root@IP_DA_VPS

# Baixar e executar o script de setup (faz tudo automaticamente)
curl -fsSL https://raw.githubusercontent.com/SEU_USUARIO/attivo-saas/main/scripts/setup-vps.sh -o setup.sh

# EDITE as variáveis no início do script antes de rodar:
# - REPO_URL: seu repositório
# - DOMAIN: attivocorretora.com.br
# - EMAIL_CERTBOT: seu email
nano setup.sh

bash setup.sh
```

### O que o setup faz automaticamente:
- Instala Node.js 20, PM2, Nginx, Certbot, Docker
- Clona o repositório em `/opt/attivo`
- Sobe PostgreSQL + Redis via Docker
- Roda migrations do Prisma e seed inicial
- Builda o frontend Next.js
- Inicia tudo com PM2
- Configura Nginx como proxy reverso
- Emite SSL grátis (Let's Encrypt)
- Configura firewall

---

## PASSO 4 — Configurar variáveis de produção

O script vai pausar para você editar `/opt/attivo/backend/.env`:

```bash
nano /opt/attivo/backend/.env
```

**Obrigatórios para funcionar:**

```env
DATABASE_URL=postgresql://attivo:SENHA_FORTE@localhost:5432/attivo_saas?schema=public
JWT_SECRET=gere_com_openssl_rand_hex_64
MASTER_ADMIN_EMAIL=seu@email.com
MASTER_ADMIN_PASSWORD=SenhaForte@123
CORS_ORIGIN=https://attivocorretora.com.br
```

**Para WhatsApp funcionar (escolha um):**

```env
# Opção 1: Evolution API (gratuito, auto-hospedado)
WHATSAPP_PROVIDER=evolution
WHATSAPP_API_URL=https://evo.attivocorretora.com.br
WHATSAPP_API_KEY=sua_key
WHATSAPP_INSTANCE=attivo

# Opção 2: Z-API (pago, mais simples — zapi.io)
WHATSAPP_PROVIDER=zapi
WHATSAPP_API_URL=https://api.z-api.io/instances/INSTANCE/token/TOKEN
WHATSAPP_API_KEY=CLIENT_TOKEN
```

**Para email funcionar:**

```env
# Gmail (crie Senha de App em: myaccount.google.com/apppasswords)
EMAIL_PROVIDER=smtp
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=seu@gmail.com
EMAIL_SMTP_PASS=xxxx_xxxx_xxxx_xxxx
```

---

## PASSO 5 — Verificar sistema

```bash
# Verificar todos os processos
pm2 list

# Saúde da API
curl https://api.attivocorretora.com.br/ready

# Esperado:
# {"status":"ready","db":"ok","redis":"ok","degradedFeatures":[]}

# Ver logs em tempo real
pm2 logs

# Ver logs do backend
pm2 logs attivo-backend

# Ver logs do frontend
pm2 logs attivo-frontend
```

---

## Deploy de atualizações (após setup)

Sempre que fizer mudanças no código:

```bash
# No computador local:
git add . && git commit -m "minha mudança" && git push

# Na VPS:
bash /opt/attivo/scripts/deploy.sh

# Ou com o alias (configurado pelo setup):
attivo-deploy
```

---

## Comandos úteis na VPS

```bash
# Status dos processos
pm2 list

# Monitoramento em tempo real (CPU, RAM, logs)
pm2 monit

# Reiniciar backend
pm2 restart attivo-backend

# Reiniciar frontend
pm2 restart attivo-frontend

# Ver últimas 100 linhas de log
pm2 logs --lines 100

# Banco de dados (via Docker)
docker exec -it attivo_postgres psql -U attivo -d attivo_saas

# Redis CLI
docker exec -it attivo_redis redis-cli

# Status dos containers
docker compose -f /opt/attivo/docker-compose.prod.yml ps

# Nginx
nginx -t                    # testa configuração
systemctl reload nginx      # recarrega sem downtime
systemctl status nginx      # status

# Certificado SSL (renova automaticamente, mas se precisar forçar)
certbot renew --dry-run     # teste
certbot renew               # renovar
```

---

## Estrutura de arquivos na VPS

```
/opt/attivo/                    ← código do projeto
  backend/
    .env                        ← variáveis de produção
    prisma/migrations/          ← migrations do banco
  frontend/
    .next/                      ← build Next.js
  ecosystem.config.cjs          ← configuração PM2
  docker-compose.prod.yml       ← PostgreSQL + Redis

/var/log/attivo/
  backend.log                   ← logs do backend
  backend.error.log             ← erros do backend
  frontend.log                  ← logs do frontend
  deploy.log                    ← histórico de deploys

/etc/nginx/sites-available/attivo   ← config Nginx
/etc/letsencrypt/                   ← certificados SSL
```

---

## Arquitetura em produção

```
Internet
    │
    ▼
Nginx (443 HTTPS / 80→443 redirect)
    ├── attivocorretora.com.br      → localhost:3000 (Next.js)
    └── api.attivocorretora.com.br  → localhost:3333 (Fastify)

PM2
    ├── attivo-backend   (Node.js Fastify, porta 3333)
    └── attivo-frontend  (Next.js, porta 3000)

Docker
    ├── attivo_postgres  (PostgreSQL 16, porta 5432 local)
    └── attivo_redis     (Redis 7, porta 6379 local)
```

---

## Problemas comuns

| Problema | Causa | Solução |
|---|---|---|
| `502 Bad Gateway` | Backend não está rodando | `pm2 restart attivo-backend` |
| `database not reachable` | Docker container parado | `docker compose -f docker-compose.prod.yml up -d` |
| `ECONNREFUSED 6379` | Redis parado | `docker compose -f docker-compose.prod.yml restart redis` |
| SSL expirado | Certbot não renovou | `certbot renew` |
| Build falhou | Erro no código | `pm2 logs attivo-frontend --lines 50` |
| Migrations pendentes | Novo deploy sem migrate | `cd /opt/attivo/backend && npx prisma migrate deploy` |

---

## Custos estimados mensais

| Serviço | Custo |
|---|---|
| VPS (Hostinger VPS 2) | ~R$ 40 |
| Domínio (registro.br) | ~R$ 4 (anual ≈ R$ 40/ano) |
| SSL (Let's Encrypt) | **Grátis** |
| WhatsApp (Z-API básico) | ~R$ 70 |
| Email (Gmail SMTP) | **Grátis** até 500 emails/dia |
| **Total mínimo** | **~R$ 114/mês** |

Para escalar: aumentar VPS, adicionar CDN (Cloudflare grátis), usar Resend para email.
