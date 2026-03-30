/**
 * Testes: Insurance — permissões, isolamento broker/admin
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app.js';
import { prisma }   from '../lib/prisma.js';
import bcrypt       from 'bcrypt';

let app;
let adminToken, brokerToken, otherBrokerToken;
let adminId, brokerId, otherBrokerId;
let recordId;

async function createUser(role, email) {
  const hash = await bcrypt.hash('Senha@123456', 10);
  return prisma.user.create({
    data: { name: `${role} Test`, email, passwordHash: hash, role, status: 'ACTIVE' },
  });
}

async function login(email) {
  const res = await app.inject({
    method:  'POST',
    url:     '/api/v1/auth/login',
    payload: { email, password: 'Senha@123456' },
  });
  return res.json().accessToken;
}

beforeAll(async () => {
  app = buildApp();
  await app.ready();

  const ts = Date.now();
  const admin      = await createUser('MASTER_ADMIN', `admin-ins-${ts}@t.test`);
  const broker     = await createUser('BROKER',       `broker-ins-${ts}@t.test`);
  const otherBroker = await createUser('BROKER',      `broker2-ins-${ts}@t.test`);

  adminId      = admin.id;
  brokerId     = broker.id;
  otherBrokerId = otherBroker.id;

  [adminToken, brokerToken, otherBrokerToken] = await Promise.all([
    login(admin.email), login(broker.email), login(otherBroker.email),
  ]);
});

afterAll(async () => {
  if (recordId) {
    await prisma.insuranceTimeline.deleteMany({ where: { insuranceRecordId: recordId } });
    await prisma.notification.deleteMany({ where: { insuranceRecordId: recordId } });
    await prisma.insuranceRecord.deleteMany({ where: { id: recordId } });
  }
  await prisma.session.deleteMany({ where: { userId: { in: [adminId, brokerId, otherBrokerId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [adminId, brokerId, otherBrokerId] } } });
  await app.close();
});

describe('POST /api/v1/broker/insurance', () => {
  it('broker cria registro com sucesso', async () => {
    const res = await app.inject({
      method:  'POST',
      url:     '/api/v1/broker/insurance',
      headers: { authorization: `Bearer ${brokerToken}` },
      payload: {
        type: 'AUTO', stage: 'LEAD', sourceType: 'MANUAL',
        customerName: 'João Teste', customerDocument: '12345678901',
      },
    });
    expect(res.statusCode).toBe(201);
    recordId = res.json().record.id;
    expect(recordId).toBeTruthy();
  });

  it('AFFILIATE não pode criar registro de seguro', async () => {
    // Cria um affiliate user temporário para o teste
    const hash = await bcrypt.hash('Senha@123456', 10);
    const ts = Date.now();
    const aff = await prisma.user.create({
      data: { name: 'Aff Test', email: `aff-${ts}@t.test`, passwordHash: hash, role: 'AFFILIATE', status: 'ACTIVE' },
    });
    const affToken = await login(aff.email);
    const res = await app.inject({
      method:  'POST',
      url:     '/api/v1/broker/insurance',
      headers: { authorization: `Bearer ${affToken}` },
      payload: { type: 'AUTO', stage: 'LEAD', sourceType: 'MANUAL', customerName: 'X', customerDocument: '00000000000' },
    });
    expect(res.statusCode).toBe(403);
    await prisma.session.deleteMany({ where: { userId: aff.id } });
    await prisma.user.delete({ where: { id: aff.id } });
  });
});

describe('PATCH /api/v1/broker/insurance/:id', () => {
  it('broker edita o próprio registro', async () => {
    const res = await app.inject({
      method:  'PATCH',
      url:     `/api/v1/broker/insurance/${recordId}`,
      headers: { authorization: `Bearer ${brokerToken}` },
      payload: { insurer: 'Porto Seguro' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().record.insurer).toBe('Porto Seguro');
  });

  it('outro broker NÃO pode editar o registro', async () => {
    const res = await app.inject({
      method:  'PATCH',
      url:     `/api/v1/broker/insurance/${recordId}`,
      headers: { authorization: `Bearer ${otherBrokerToken}` },
      payload: { insurer: 'Invasor' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('admin pode editar qualquer registro', async () => {
    const res = await app.inject({
      method:  'PATCH',
      url:     `/api/v1/broker/insurance/${recordId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { insurer: 'Allianz' },
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('PATCH /api/v1/broker/insurance/:id/stage', () => {
  it('broker muda stage com nota', async () => {
    const res = await app.inject({
      method:  'PATCH',
      url:     `/api/v1/broker/insurance/${recordId}/stage`,
      headers: { authorization: `Bearer ${brokerToken}` },
      payload: { stage: 'EM_COTACAO', note: 'Iniciando cotação' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().record.stage).toBe('EM_COTACAO');
  });
});
