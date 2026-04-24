import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';

export default async function brokerCommissionsRoutes(app) {

  // GET /broker/commissions — lista as próprias comissões do corretor
  app.get('/broker/commissions', {
    preHandler: [app.authenticate, app.authorize('BROKER', 'MASTER_ADMIN')],
  }, async (request) => {
    const schema = z.object({
      page:   z.coerce.number().int().min(1).default(1),
      limit:  z.coerce.number().int().min(1).max(100).default(20),
      status: z.enum(['PENDING', 'AVAILABLE', 'PAID', 'CANCELED']).optional(),
    });
    const { page, limit, status } = schema.parse(request.query);
    const user = request.currentUser;

    const where = {
      ...(user.role === 'BROKER' ? { userId: user.id } : {}),
      ...(status ? { status } : {}),
    };
    const skip = (page - 1) * limit;

    const [total, commissions] = await Promise.all([
      prisma.brokerCommission.count({ where }),
      prisma.brokerCommission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          insurance: { select: { customerName: true, type: true, insurer: true, policyNumber: true } },
          withdrawalRequest: { select: { id: true, status: true, requestedAt: true } },
        },
      }),
    ]);

    return { data: commissions, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  });

  // GET /broker/commission-rate — retorna a taxa do corretor logado
  app.get('/broker/commission-rate', {
    preHandler: [app.authenticate, app.authorize('BROKER', 'MASTER_ADMIN')],
  }, async (request) => {
    const user = await prisma.user.findUnique({
      where:  { id: request.currentUser.id },
      select: { commissionRate: true, pixKey: true },
    });
    return { commissionRate: Number(user.commissionRate), pixKey: user.pixKey };
  });

  // POST /broker/commissions/:id/request-withdrawal — solicita retirada
  app.post('/broker/commissions/:id/request-withdrawal', {
    preHandler: [app.authenticate, app.authorize('BROKER', 'MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id }  = request.params;
    const user    = request.currentUser;
    const schema  = z.object({ pixKey: z.string().min(5).optional() });
    const { pixKey } = schema.parse(request.body);

    const commission = await prisma.brokerCommission.findUnique({
      where:   { id },
      include: { withdrawalRequest: true },
    });
    if (!commission) return reply.code(404).send({ message: 'Comissão não encontrada' });
    if (user.role === 'BROKER' && commission.userId !== user.id)
      return reply.code(403).send({ message: 'Sem permissão' });
    if (commission.status !== 'AVAILABLE')
      return reply.code(400).send({ message: 'Comissão não está disponível para retirada' });
    if (commission.withdrawalRequest)
      return reply.code(409).send({ message: 'Solicitação de retirada já existe' });

    const brokerPixKey = pixKey ?? (await prisma.user.findUnique({
      where:  { id: commission.userId },
      select: { pixKey: true },
    }))?.pixKey;

    const withdrawal = await prisma.withdrawalRequest.create({
      data: {
        ownerType:         'BROKER',
        requestedByUserId: user.id,
        brokerCommissionId: id,
        amount:            commission.amount,
        pixKey:            brokerPixKey ?? null,
        status:            'PENDING',
      },
    });

    return reply.code(201).send({ withdrawal });
  });
}
