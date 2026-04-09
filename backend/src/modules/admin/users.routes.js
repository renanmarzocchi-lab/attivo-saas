import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma, normalizeEmail } from '../../lib/prisma.js';
import { audit } from '../../lib/audit.js';

export default async function userRoutes(app) {

  // GET /admin/users — listar usuários (paginado)
  app.get('/admin/users', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const schema = z.object({
      page:   z.coerce.number().int().min(1).default(1),
      limit:  z.coerce.number().int().min(1).max(100).default(20),
      role:   z.enum(['MASTER_ADMIN', 'BROKER', 'AFFILIATE']).optional(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional(),
      search: z.string().optional(),
    });
    const { page, limit, role, status, search } = schema.parse(request.query);

    const where = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, role: true, status: true,
          createdAt: true, affiliateId: true,
        },
      }),
    ]);

    return {
      data: users,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  });

  // POST /admin/users — criar usuário (BROKER ou MASTER_ADMIN)
  app.post('/admin/users', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const schema = z.object({
      name:     z.string().min(3),
      email:    z.string().email(),
      password: z.string().min(8),
      role:     z.enum(['BROKER', 'MASTER_ADMIN']),
    });

    const data = schema.parse(request.body);
    const email = normalizeEmail(data.email);

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return reply.code(409).send({ message: 'E-mail já cadastrado' });

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: { name: data.name, email, passwordHash, role: data.role, status: 'ACTIVE' },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    });

    await audit(request.currentUser.id, 'USER_CREATED', 'User', user.id, {
      role: data.role, createdBy: request.currentUser.email,
    });

    return reply.code(201).send({ user });
  });

  // PATCH /admin/users/:id/block — bloquear usuário
  app.patch('/admin/users/:id/block', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params;

    if (request.currentUser.id === id) {
      return reply.code(422).send({ message: 'Você não pode bloquear a si mesmo' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return reply.code(404).send({ message: 'Usuário não encontrado' });
    if (user.status === 'BLOCKED') return reply.code(422).send({ message: 'Usuário já está bloqueado' });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { status: 'BLOCKED' } });
      // Revogar todas as sessões ativas
      await tx.session.deleteMany({ where: { userId: id } });
    });

    await audit(request.currentUser.id, 'USER_BLOCKED', 'User', id, {
      blockedBy: request.currentUser.email,
    });

    return { message: 'Usuário bloqueado' };
  });

  // PATCH /admin/users/:id/unblock — desbloquear usuário
  app.patch('/admin/users/:id/unblock', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return reply.code(404).send({ message: 'Usuário não encontrado' });
    if (user.status !== 'BLOCKED') return reply.code(422).send({ message: 'Usuário não está bloqueado' });

    await prisma.user.update({ where: { id }, data: { status: 'ACTIVE' } });

    await audit(request.currentUser.id, 'USER_UNBLOCKED', 'User', id, {
      unblockedBy: request.currentUser.email,
    });

    return { message: 'Usuário reativado' };
  });

  // POST /admin/users/:id/reset-password — resetar senha
  app.post('/admin/users/:id/reset-password', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params;
    const schema = z.object({
      newPassword: z.string().min(8),
    });
    const { newPassword } = schema.parse(request.body);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return reply.code(404).send({ message: 'Usuário não encontrado' });

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { passwordHash } });
      // Revogar sessões para forçar re-login
      await tx.session.deleteMany({ where: { userId: id } });
    });

    await audit(request.currentUser.id, 'USER_PASSWORD_RESET_BY_ADMIN', 'User', id, {
      resetBy: request.currentUser.email,
    });

    return { message: 'Senha alterada com sucesso' };
  });
}
