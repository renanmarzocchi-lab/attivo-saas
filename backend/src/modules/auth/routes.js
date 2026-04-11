import bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { z } from 'zod';
import { prisma, normalizeEmail } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { sendEmail } from '../../integrations/email/service.js';

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

  // PATCH /auth/change-password — troca de senha autenticada
  app.patch('/auth/change-password', { preHandler: [app.authenticate] }, async (request, reply) => {
    const schema = z.object({
      currentPassword: z.string().min(1, 'Informe a senha atual'),
      newPassword:     z.string().min(8, 'Nova senha deve ter no mínimo 8 caracteres'),
    });
    const { currentPassword, newPassword } = schema.parse(request.body);

    const user = await prisma.user.findUnique({ where: { id: request.currentUser.id } });
    if (!user) return reply.code(404).send({ message: 'Usuário não encontrado' });

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return reply.code(400).send({ message: 'Senha atual incorreta' });

    if (currentPassword === newPassword) {
      return reply.code(400).send({ message: 'A nova senha deve ser diferente da atual' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      // Revoga todas as sessões ativas para forçar novo login em outros dispositivos
      await tx.session.updateMany({
        where: { userId: user.id, status: 'ACTIVE' },
        data:  { status: 'REVOKED', revokedAt: new Date() },
      });
    });

    logger.info({ userId: user.id }, 'Senha alterada pelo usuário');
    return { message: 'Senha alterada com sucesso.' };
  });

  // DELETE /auth/sessions/:id — revoga uma sessão específica
  app.delete('/auth/sessions/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = await prisma.session.findFirst({
      where: { id, userId: request.currentUser.id, status: 'ACTIVE' },
    });
    if (!session) return reply.code(404).send({ message: 'Sessão não encontrada' });
    await prisma.session.update({ where: { id }, data: { status: 'REVOKED', revokedAt: new Date() } });
    return { message: 'Sessão encerrada' };
  });

  // POST /auth/forgot-password — solicita reset de senha
  app.post('/auth/forgot-password', async (request, reply) => {
    const schema = z.object({ email: z.string().email() });
    const { email } = schema.parse(request.body);

    const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });

    // Sempre retorna sucesso (nao revelar se email existe)
    if (!user) {
      logger.info({ email }, 'Forgot password para email inexistente — ignorando');
      return { message: 'Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.' };
    }

    // Gerar token de reset (expira em 1h)
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenHash = hashToken(resetToken);
    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Salvar token como sessão especial (reutilizando a tabela session)
    await prisma.session.create({
      data: {
        userId:           user.id,
        refreshTokenHash: resetTokenHash,
        userAgent:        'password-reset',
        ipAddress:        request.ip,
        expiresAt:        resetExpiresAt,
      },
    });

    // Enviar email
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    await sendEmail({
      to:      user.email,
      subject: 'ATTIVO — Recuperação de senha',
      html:    `<p>Olá ${user.name},</p><p>Você solicitou a recuperação de senha. Clique no link abaixo para criar uma nova senha:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Este link expira em 1 hora.</p><p>Se você não solicitou, ignore este e-mail.</p>`,
      text:    `Olá ${user.name}, acesse ${resetUrl} para redefinir sua senha. Link válido por 1 hora.`,
      templateKey: 'password-reset',
    }).catch((err) => {
      logger.error({ err, userId: user.id }, 'Falha ao enviar email de reset');
    });

    logger.info({ userId: user.id }, 'Token de reset gerado');
    return { message: 'Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.' };
  });

  // POST /auth/reset-password — reseta a senha com token
  app.post('/auth/reset-password', async (request, reply) => {
    const schema = z.object({
      token:    z.string().min(10),
      password: z.string().min(8),
    });
    const { token, password } = schema.parse(request.body);

    const tokenHash = hashToken(token);
    const session = await prisma.session.findFirst({
      where: {
        refreshTokenHash: tokenHash,
        userAgent:        'password-reset',
        status:           'ACTIVE',
        expiresAt:        { gt: new Date() },
      },
      include: { user: true },
    });

    if (!session) {
      return reply.code(400).send({ message: 'Link inválido ou expirado. Solicite novamente.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: session.userId }, data: { passwordHash } });
      // Invalidar o token de reset
      await tx.session.update({ where: { id: session.id }, data: { status: 'REVOKED', revokedAt: new Date() } });
      // Revogar todas as sessoes ativas
      await tx.session.updateMany({
        where: { userId: session.userId, status: 'ACTIVE', id: { not: session.id } },
        data:  { status: 'REVOKED', revokedAt: new Date() },
      });
    });

    logger.info({ userId: session.userId }, 'Senha resetada com sucesso');
    return { message: 'Senha alterada com sucesso! Faça login com a nova senha.' };
  });
}
