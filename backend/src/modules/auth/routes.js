import bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { z } from 'zod';
import { prisma, normalizeEmail } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

const REFRESH_TOKEN_EXPIRES_DAYS = parseInt(process.env.REFRESH_TOKEN_DAYS ?? '30');
const ACCESS_TOKEN_EXPIRES       = process.env.ACCESS_TOKEN_EXPIRES ?? '8h';

function generateRefreshToken() {
  return randomBytes(48).toString('hex');
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function refreshExpiresAt() {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);
  return d;
}

export default async function authRoutes(app) {

  // POST /auth/login
  app.post('/auth/login', async (request, reply) => {
    const schema = z.object({
      email:    z.string().email(),
      password: z.string().min(6),
    });
    const { email, password } = schema.parse(request.body);

    const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
    if (!user) return reply.code(401).send({ message: 'Credenciais inválidas' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      logger.warn({ email }, 'Login falhou: senha incorreta');
      return reply.code(401).send({ message: 'Credenciais inválidas' });
    }

    if (user.status !== 'ACTIVE') {
      return reply.code(403).send({ message: 'Conta inativa ou bloqueada' });
    }

    // Access token (JWT curto)
    const accessToken = app.jwt.sign({ role: user.role }, { sub: user.id, expiresIn: ACCESS_TOKEN_EXPIRES });

    // Refresh token (armazenado como hash)
    const refreshToken = generateRefreshToken();
    await prisma.session.create({
      data: {
        userId:           user.id,
        refreshTokenHash: hashToken(refreshToken),
        userAgent:        request.headers['user-agent'] ?? null,
        ipAddress:        request.ip,
        expiresAt:        refreshExpiresAt(),
      },
    });

    logger.info({ userId: user.id, ip: request.ip }, 'Login bem-sucedido');

    return reply.send({
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRES,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, affiliateId: user.affiliateId ?? null },
    });
  });

  // POST /auth/refresh — renova access token
  app.post('/auth/refresh', async (request, reply) => {
    const schema = z.object({ refreshToken: z.string().min(10) });
    const { refreshToken } = schema.parse(request.body);

    const hash = hashToken(refreshToken);
    const session = await prisma.session.findFirst({
      where: { refreshTokenHash: hash, status: 'ACTIVE' },
      include: { user: true },
    });

    if (!session) return reply.code(401).send({ message: 'Refresh token inválido ou expirado' });
    if (new Date() > session.expiresAt) {
      await prisma.session.update({ where: { id: session.id }, data: { status: 'EXPIRED' } });
      return reply.code(401).send({ message: 'Sessão expirada — faça login novamente' });
    }
    if (session.user.status !== 'ACTIVE') {
      return reply.code(403).send({ message: 'Usuário inativo' });
    }

    // Rotaciona o refresh token (evita reutilização)
    const newRefreshToken = generateRefreshToken();
    await prisma.session.update({
      where: { id: session.id },
      data:  { refreshTokenHash: hashToken(newRefreshToken), expiresAt: refreshExpiresAt() },
    });

    const accessToken = app.jwt.sign(
      { role: session.user.role },
      { sub: session.user.id, expiresIn: ACCESS_TOKEN_EXPIRES },
    );

    return { accessToken, refreshToken: newRefreshToken, expiresIn: ACCESS_TOKEN_EXPIRES };
  });

  // POST /auth/logout — revoga sessão
  app.post('/auth/logout', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { refreshToken } = request.body ?? {};
    if (refreshToken) {
      const hash = hashToken(refreshToken);
      await prisma.session.updateMany({
        where: { refreshTokenHash: hash, userId: request.currentUser.id },
        data:  { status: 'REVOKED', revokedAt: new Date() },
      });
    } else {
      // Revoga todas as sessões do usuário
      await prisma.session.updateMany({
        where: { userId: request.currentUser.id, status: 'ACTIVE' },
        data:  { status: 'REVOKED', revokedAt: new Date() },
      });
    }
    logger.info({ userId: request.currentUser.id }, 'Logout realizado');
    return { message: 'Logout realizado' };
  });

  // GET /auth/me
  app.get('/auth/me', { preHandler: [app.authenticate] }, async (request) => {
    const user = request.currentUser;
    const result = { id: user.id, name: user.name, email: user.email, role: user.role, affiliateId: user.affiliateId ?? null };

    // Para afiliados, incluir flags de pendencias
    if (user.role === 'AFFILIATE' && user.affiliateId) {
      const affiliate = await prisma.affiliate.findUnique({
        where: { id: user.affiliateId },
        select: { profileComplete: true, id: true },
      });

      let documentAccepted = true;
      const doc = await prisma.documentVersion.findFirst({ where: { isCurrent: true, isRequired: true } });
      if (doc && affiliate) {
        const acceptance = await prisma.affiliateDocumentAcceptance.findUnique({
          where: { affiliateId_documentVersionId: { affiliateId: affiliate.id, documentVersionId: doc.id } },
        });
        documentAccepted = !!acceptance;
      }

      return { user: { ...result, profileComplete: affiliate?.profileComplete ?? false, documentAccepted } };
    }

    return { user: result };
  });

  // GET /auth/sessions — lista sessões ativas do usuário
  app.get('/auth/sessions', { preHandler: [app.authenticate] }, async (request) => {
    const sessions = await prisma.session.findMany({
      where:   { userId: request.currentUser.id, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      select:  { id: true, userAgent: true, ipAddress: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return { sessions };
  });
}
