/**
 * Testes: Isolamento Multi-Tenant
 *
 * Cenários cobertos:
 *  1. BROKER do tenantA NÃO acessa seguros do tenantB
 *  2. BROKER do tenantA SÓ vê seus próprios seguros na listagem
 *  3. MASTER_ADMIN sem tenant acessa tudo (admin global)
 *  4. MASTER_ADMIN com tenantA NÃO acessa seguros do tenantB
 *  5. PATCH de seguro de outro tenant retorna 403
 *  6. Criação de seguro herda tenantId do usuário criador
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app.js';
import { prisma }   from '../lib/prisma.js';
import bcrypt       from 'bcrypt';

let app;

// Tenants
let tenantA;
let tenantB;

// Usuários
let brokerA;        // BROKER do tenantA
let brokerB;        // BROKER do tenantB
let globalAdmin;    // MASTER_ADMIN sem tenant (acesso global)
let adminA;         // MASTER_ADMIN com tenantA

// Seguros
let insuranceA;     // criado por brokerA (tenantA)
let insuranceB;     // criado por brokerB (tenantB)

// Tokens
let tokenBrokerA;
let tokenBrokerB;
let tokenGlobalAdmin;
let tokenAdminA;

const PASSWORD = 'Teste@123456';

async function createHash() {
  return bcrypt.hash(PASSWORD, 10);
}

async function login(app_, email) {
  const res = await app_.inject({
    method:  'POST',
    url:     '/api/v1/auth/login',
    payload: { email, password: PASSWORD },
  });
  return res.json().accessToken;
}

beforeAll(async () => {
  app = buildApp();
  await app.ready();

  const hash = await createHash();

  // Criar tenants
  [tenantA, tenantB] = await Promise.all([
    prisma.tenant.create({ data: { name: 'Corretora A', slug: `corretora-a-${Date.now()}` } }),
    prisma.tenant.create({ data: { name: 'Corretora B', slug: `corretora-b-${Date.now()}` } }),
  ]);

  // Criar usuários
  [brokerA, brokerB, globalAdmin, adminA] = await Promise.all([
    prisma.user.create({ data: {
      name: 'Broker A', email: `broker-a-${Date.now()}@test.local`,
      passwordHash: hash, role: 'BROKER', status: 'ACTIVE', tenantId: tenantA.id,
    }}),
    prisma.user.create({ data: {
      name: 'Broker B', email: `broker-b-${Date.now()}@test.local`,
      passwordHash: hash, role: 'BROKER', status: 'ACTIVE', tenantId: tenantB.id,
    }}),
    prisma.user.create({ data: {
      name: 'Global Admin', email: `global-admin-${Date.now()}@test.local`,
      passwordHash: hash, role: 'MASTER_ADMIN', status: 'ACTIVE', tenantId: null,
    }}),
    prisma.user.create({ data: {
      name: 'Admin A', email: `admin-a-${Date.now()}@test.local`,
      passwordHash: hash, role: 'MASTER_ADMIN', status: 'ACTIVE', tenantId: tenantA.id,
    }}),
  ]);

  // Fazer login e pegar tokens
  [tokenBrokerA, tokenBrokerB, tokenGlobalAdmin, tokenAdminA] = await Promise.all([
    login(app, brokerA.email),
    login(app, brokerB.email),
    login(app, globalAdmin.email),
    login(app, adminA.email),
  ]);

  // Criar seguros via API (garante tenantId correto pelo fluxo real)
  const createInsurance = (token, extra = {}) => app.inject({
    method:  'POST',
    url:     '/api/v1/broker/insurance',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      type:             'AUTO',
      customerName:     'Cliente Teste',
      customerDocument: '12345678909',
      ...extra,
    },
  });

  const [resA, resB] = await Promise.all([
    createInsurance(tokenBrokerA),
    createInsurance(tokenBrokerB),
  ]);

  insuranceA = resA.json().record;
  insuranceB = resB.json().record;
});

afterAll(async () => {
  // Limpeza na ordem correta (FK constraints)
  await prisma.insuranceTimeline.deleteMany({
    where: { insuranceRecordId: { in: [insuranceA?.id, insuranceB?.id].filter(Boolean) } },
  });
  await prisma.notification.deleteMany({
    where: { insuranceRecordId: { in: [insuranceA?.id, insuranceB?.id].filter(Boolean) } },
  });
  await prisma.insuranceRecord.deleteMany({
    where: { id: { in: [insuranceA?.id, insuranceB?.id].filter(Boolean) } },
  });
  await prisma.session.deleteMany({
    where: { userId: { in: [brokerA?.id, brokerB?.id, globalAdmin?.id, adminA?.id].filter(Boolean) } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [brokerA?.id, brokerB?.id, globalAdmin?.id, adminA?.id].filter(Boolean) } },
  });
  await prisma.tenant.deleteMany({
    where: { id: { in: [tenantA?.id, tenantB?.id].filter(Boolean) } },
  });
  await app.close();
});

// --- Testes de criação ---

describe('Criação de seguro herda tenantId', () => {
  it('seguro criado por brokerA tem tenantId do tenantA', () => {
    expect(insuranceA).toBeDefined();
    expect(insuranceA.tenantId).toBe(tenantA.id);
  });

  it('seguro criado por brokerB tem tenantId do tenantB', () => {
    expect(insuranceB).toBeDefined();
    expect(insuranceB.tenantId).toBe(tenantB.id);
  });
});

// --- Testes de isolamento na listagem ---

describe('GET /broker/insurance — isolamento de listagem', () => {
  it('brokerA NAO ve o seguro do brokerB na listagem', async () => {
    const res = await app.inject({
      method:  'GET',
      url:     '/api/v1/broker/insurance',
      headers: { authorization: `Bearer ${tokenBrokerA}` },
    });
    expect(res.statusCode).toBe(200);
    const ids = res.json().data.map((r) => r.id);
    expect(ids).not.toContain(insuranceB.id);
  });

  it('brokerA ve apenas seu proprio seguro', async () => {
    const res = await app.inject({
      method:  'GET',
      url:     '/api/v1/broker/insurance',
      headers: { authorization: `Bearer ${tokenBrokerA}` },
    });
    expect(res.statusCode).toBe(200);
    const ids = res.json().data.map((r) => r.id);
    expect(ids).toContain(insuranceA.id);
  });

  it('adminA (tenantA) NAO ve seguro do tenantB', async () => {
    const res = await app.inject({
      method:  'GET',
      url:     '/api/v1/broker/insurance',
      headers: { authorization: `Bearer ${tokenAdminA}` },
    });
    expect(res.statusCode).toBe(200);
    const ids = res.json().data.map((r) => r.id);
    expect(ids).not.toContain(insuranceB.id);
  });

  it('globalAdmin (sem tenant) ve seguros de todos os tenants', async () => {
    const res = await app.inject({
      method:  'GET',
      url:     '/api/v1/broker/insurance',
      headers: { authorization: `Bearer ${tokenGlobalAdmin}` },
    });
    expect(res.statusCode).toBe(200);
    const ids = res.json().data.map((r) => r.id);
    expect(ids).toContain(insuranceA.id);
    expect(ids).toContain(insuranceB.id);
  });
});

// --- Testes de isolamento no detalhe ---

describe('GET /broker/insurance/:id — IDOR prevention', () => {
  it('brokerA recebe 403 ao acessar seguro do brokerB', async () => {
    const res = await app.inject({
      method:  'GET',
      url:     `/api/v1/broker/insurance/${insuranceB.id}`,
      headers: { authorization: `Bearer ${tokenBrokerA}` },
    });
    // 403 (tenant) ou 403 (ownership) — ambos corretos
    expect(res.statusCode).toBe(403);
  });

  it('adminA recebe 403 ao acessar seguro do tenantB', async () => {
    const res = await app.inject({
      method:  'GET',
      url:     `/api/v1/broker/insurance/${insuranceB.id}`,
      headers: { authorization: `Bearer ${tokenAdminA}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('globalAdmin pode acessar seguro de qualquer tenant', async () => {
    const [resA, resB] = await Promise.all([
      app.inject({
        method:  'GET',
        url:     `/api/v1/broker/insurance/${insuranceA.id}`,
        headers: { authorization: `Bearer ${tokenGlobalAdmin}` },
      }),
      app.inject({
        method:  'GET',
        url:     `/api/v1/broker/insurance/${insuranceB.id}`,
        headers: { authorization: `Bearer ${tokenGlobalAdmin}` },
      }),
    ]);
    expect(resA.statusCode).toBe(200);
    expect(resB.statusCode).toBe(200);
  });
});

// --- Testes de isolamento em updates ---

describe('PATCH /broker/insurance/:id — update cross-tenant bloqueado', () => {
  it('brokerA recebe 403 ao tentar editar seguro do brokerB', async () => {
    const res = await app.inject({
      method:  'PATCH',
      url:     `/api/v1/broker/insurance/${insuranceB.id}`,
      headers: { authorization: `Bearer ${tokenBrokerA}` },
      payload: { notes: 'tentativa de invasao' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('adminA recebe 403 ao tentar editar seguro do tenantB', async () => {
    const res = await app.inject({
      method:  'PATCH',
      url:     `/api/v1/broker/insurance/${insuranceB.id}`,
      headers: { authorization: `Bearer ${tokenAdminA}` },
      payload: { notes: 'invasao de admin' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('brokerA pode editar seu proprio seguro', async () => {
    const res = await app.inject({
      method:  'PATCH',
      url:     `/api/v1/broker/insurance/${insuranceA.id}`,
      headers: { authorization: `Bearer ${tokenBrokerA}` },
      payload: { notes: 'nota atualizada pelo broker correto' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().record.notes).toBe('nota atualizada pelo broker correto');
  });
});
