/**
 * Testes: Auth — login, sessão, isolamento
 *
 * Estes testes requerem banco de dados de teste real.
 * Configure TEST_DATABASE_URL no .env.test se necessário.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app.js';
import { prisma }   from '../lib/prisma.js';
import bcrypt       from 'bcrypt';

let app;
let testUserId;

beforeAll(async () => {
  app = buildApp();
  await app.ready();

  // Cria usuário de teste
  const hash = await bcrypt.hash('Senha@123456', 10);
  const user = await prisma.user.create({
    data: {
      name:         'Teste Auth',
      email:        `test-auth-${Date.now()}@attivo.test`,
      passwordHash: hash,
      role:         'MASTER_ADMIN',
      status:       'ACTIVE',
    },
  });
  testUserId = user.id;
});

afterAll(async () => {
  await prisma.session.deleteMany({ where: { userId: testUserId } });
  await prisma.user.delete({ where: { id: testUserId } });
  await app.close();
});

describe('POST /api/v1/auth/login', () => {
  it('retorna accessToken e refreshToken com credenciais válidas', async () => {
    const user = await prisma.user.findUnique({ where: { id: testUserId } });
    const res = await app.inject({
      method: 'POST',
      url:    '/api/v1/auth/login',
      payload: { email: user.email, password: 'Senha@123456' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('refreshToken');
    expect(body.user.id).toBe(testUserId);
  });

  it('retorna 401 com senha errada', async () => {
    const user = await prisma.user.findUnique({ where: { id: testUserId } });
    const res = await app.inject({
      method: 'POST',
      url:    '/api/v1/auth/login',
      payload: { email: user.email, password: 'errada123' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('retorna 401 com email inexistente', async () => {
    const res = await app.inject({
      method: 'POST',
      url:    '/api/v1/auth/login',
      payload: { email: 'nao-existe@exemplo.com', password: 'qualquer123' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('rotaciona o refresh token e retorna novo accessToken', async () => {
    const user = await prisma.user.findUnique({ where: { id: testUserId } });
    // Login para obter refresh token
    const loginRes = await app.inject({
      method: 'POST',
      url:    '/api/v1/auth/login',
      payload: { email: user.email, password: 'Senha@123456' },
    });
    const { refreshToken } = loginRes.json();

    const res = await app.inject({
      method: 'POST',
      url:    '/api/v1/auth/refresh',
      payload: { refreshToken },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('refreshToken');
    // Novo refresh token deve ser diferente do original
    expect(body.refreshToken).not.toBe(refreshToken);
  });

  it('retorna 401 com token inválido', async () => {
    const res = await app.inject({
      method: 'POST',
      url:    '/api/v1/auth/refresh',
      payload: { refreshToken: 'token-invalido-totalmente-fake-000000' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('retorna dados do usuário com token válido', async () => {
    const user = await prisma.user.findUnique({ where: { id: testUserId } });
    const loginRes = await app.inject({
      method: 'POST',
      url:    '/api/v1/auth/login',
      payload: { email: user.email, password: 'Senha@123456' },
    });
    const { accessToken } = loginRes.json();

    const res = await app.inject({
      method:  'GET',
      url:     '/api/v1/auth/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.id).toBe(testUserId);
  });

  it('retorna 401 sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/auth/me' });
    expect(res.statusCode).toBe(401);
  });
});
