import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';

export default async function adminWithdrawalsRoutes(app) {

  // GET /admin/withdrawals — lista todas solicitações de retirada
  app.get('/admin/withdrawals', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const schema = z.object({
      page:   z.coerce.number().int().min(1).default(1),
      limit:  z.coerce.number().int().min(1).max(100).default(20),
      status: z.enum(['PENDING', 'APPROVED', 'PAID', 'REJECTED']).optional(),
    });
    const { page, limit, status } = schema.parse(request.query);
    const where = status ? { status } : {};
    const skip  = (page - 1) * limit;

    const [total, withdrawals] = await Promise.all([
      prisma.withdrawalRequest.count({ where }),
      prisma.withdrawalRequest.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { requestedAt: 'desc' },
        include: {
          requestedBy: { select: { id: true, name: true, email: true, role: true } },
          affiliateCommission: {
            include: { affiliate: { select: { name: true, refCode: true, pixKey: true } } },
          },
          brokerCommission: {
            include: { insurance: { select: { customerName: true, type: true, policyNumber: true } } },
          },
        },
      }),
    ]);

    return { data: withdrawals, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  });

  // PATCH /admin/withdrawals/:id/pay — marca como pago e atualiza comissão
  app.patch('/admin/withdrawals/:id/pay', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id }   = request.params;
    const { notes } = z.object({ notes: z.string().optional() }).parse(request.body ?? {});

    const withdrawal = await prisma.withdrawalRequest.findUnique({ where: { id } });
    if (!withdrawal) return reply.code(404).send({ message: 'Solicitação não encontrada' });
    if (withdrawal.status !== 'PENDING' && withdrawal.status !== 'APPROVED')
      return reply.code(400).send({ message: 'Solicitação não está pendente' });

    await prisma.$transaction(async (tx) => {
      await tx.withdrawalRequest.update({
        where: { id },
        data: { status: 'PAID', resolvedAt: new Date(), resolvedByUserId: request.currentUser.id, notes },
      });

      if (withdrawal.affiliateCommissionId) {
        await tx.affiliateCommission.update({
          where: { id: withdrawal.affiliateCommissionId },
          data:  { status: 'PAID' },
        });
      }
      if (withdrawal.brokerCommissionId) {
        await tx.brokerCommission.update({
          where: { id: withdrawal.brokerCommissionId },
          data:  { status: 'PAID' },
        });
      }
    });

    return { message: 'Pagamento registrado com sucesso' };
  });

  // PATCH /admin/withdrawals/:id/reject — rejeita a solicitação
  app.patch('/admin/withdrawals/:id/reject', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id }    = request.params;
    const { notes } = z.object({ notes: z.string().optional() }).parse(request.body ?? {});

    const withdrawal = await prisma.withdrawalRequest.findUnique({ where: { id } });
    if (!withdrawal) return reply.code(404).send({ message: 'Solicitação não encontrada' });
    if (withdrawal.status !== 'PENDING')
      return reply.code(400).send({ message: 'Solicitação não está pendente' });

    await prisma.withdrawalRequest.update({
      where: { id },
      data:  { status: 'REJECTED', resolvedAt: new Date(), resolvedByUserId: request.currentUser.id, notes },
    });

    return { message: 'Solicitação rejeitada' };
  });

  // PATCH /admin/commissions/affiliate/:id/release — libera comissão de afiliado
  app.patch('/admin/commissions/affiliate/:id/release', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params;
    const commission = await prisma.affiliateCommission.findUnique({ where: { id } });
    if (!commission) return reply.code(404).send({ message: 'Comissão não encontrada' });
    if (commission.status !== 'PENDING')
      return reply.code(400).send({ message: 'Comissão não está pendente' });

    await prisma.affiliateCommission.update({ where: { id }, data: { status: 'AVAILABLE' } });
    return { message: 'Comissão disponibilizada para o afiliado' };
  });

  // PATCH /admin/commissions/broker/:id/release — libera comissão de corretor
  app.patch('/admin/commissions/broker/:id/release', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params;
    const commission = await prisma.brokerCommission.findUnique({ where: { id } });
    if (!commission) return reply.code(404).send({ message: 'Comissão não encontrada' });
    if (commission.status !== 'PENDING')
      return reply.code(400).send({ message: 'Comissão não está pendente' });

    await prisma.brokerCommission.update({ where: { id }, data: { status: 'AVAILABLE' } });
    return { message: 'Comissão disponibilizada para o corretor' };
  });

  // GET /admin/commissions/brokers — lista comissões de corretores
  app.get('/admin/commissions/brokers', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const schema = z.object({
      page:   z.coerce.number().int().min(1).default(1),
      limit:  z.coerce.number().int().min(1).max(100).default(20),
      userId: z.string().optional(),
      status: z.enum(['PENDING', 'AVAILABLE', 'PAID', 'CANCELED']).optional(),
    });
    const { page, limit, userId, status } = schema.parse(request.query);
    const where = {
      ...(userId ? { userId } : {}),
      ...(status ? { status } : {}),
    };
    const skip = (page - 1) * limit;

    const [total, commissions] = await Promise.all([
      prisma.brokerCommission.count({ where }),
      prisma.brokerCommission.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user:     { select: { id: true, name: true, email: true } },
          insurance: { select: { customerName: true, type: true, insurer: true, policyNumber: true } },
          withdrawalRequest: { select: { id: true, status: true } },
        },
      }),
    ]);

    return { data: commissions, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  });
}
