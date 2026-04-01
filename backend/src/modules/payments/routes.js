import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { audit } from '../../lib/audit.js';
import { roundHalfUp } from '../../lib/math.js';

export default async function paymentRoutes(app) {

  // POST /payments — cria pagamento vinculando comissões individualmente (MASTER_ADMIN)
  app.post('/payments', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const schema = z.object({
      affiliateId:   z.string(),
      commissionIds: z.array(z.string()).min(1),
      reference:     z.string().optional(),
      paidAt:        z.string().datetime().optional(),
    });

    const data = schema.parse(request.body);
    const affiliate = await prisma.affiliate.findUnique({ where: { id: data.affiliateId } });
    if (!affiliate) return reply.code(404).send({ message: 'Afiliado não encontrado' });

    // Buscar comissões e validar
    const commissions = await prisma.affiliateCommission.findMany({
      where: { id: { in: data.commissionIds }, affiliateId: data.affiliateId },
    });

    if (commissions.length !== data.commissionIds.length) {
      return reply.code(422).send({ message: 'Uma ou mais comissões não encontradas para este afiliado' });
    }

    const notAvailable = commissions.filter((c) => c.status !== 'AVAILABLE');
    if (notAvailable.length > 0) {
      return reply.code(422).send({
        message: 'Comissões devem estar com status AVAILABLE para pagamento',
        ids: notAvailable.map((c) => c.id),
      });
    }

    const totalAmount  = commissions.reduce((sum, c) => sum + Number(c.amount), 0);
    const roundedTotal = roundHalfUp(totalAmount);

    const payment = await prisma.$transaction(async (tx) => {
      const pmt = await tx.affiliatePayment.create({
        data: {
          affiliateId: data.affiliateId,
          totalAmount: roundedTotal,
          status:      'PAID',
          paidAt:      data.paidAt ? new Date(data.paidAt) : new Date(),
          reference:   data.reference,
        },
      });

      // Criar todos os itens em batch (evita N+1)
      await tx.affiliatePaymentItem.createMany({
        data: commissions.map((c) => ({
          paymentId:    pmt.id,
          commissionId: c.id,
          amount:       c.amount,
        })),
      });

      // Marcar todas as comissões como PAID em uma única query
      await tx.affiliateCommission.updateMany({
        where: { id: { in: commissions.map((c) => c.id) } },
        data:  { status: 'PAID' },
      });

      return pmt;
    });

    await audit(request.currentUser.id, 'PAYMENT_CREATED', 'AffiliatePayment', payment.id, {
      affiliateId: data.affiliateId,
      totalAmount: roundedTotal,
      commissionCount: commissions.length,
    });

    return reply.code(201).send({ payment: { ...payment, commissionCount: commissions.length } });
  });

  // GET /payments — listagem (MASTER_ADMIN)
  app.get('/payments', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const schema = z.object({
      page:        z.coerce.number().int().min(1).default(1),
      limit:       z.coerce.number().int().min(1).max(100).default(20),
      affiliateId: z.string().optional(),
    });
    const { page, limit, affiliateId } = schema.parse(request.query);
    const where  = affiliateId ? { affiliateId } : {};
    const skip   = (page - 1) * limit;

    const [total, payments] = await Promise.all([
      prisma.affiliatePayment.count({ where }),
      prisma.affiliatePayment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          affiliate: { select: { name: true, pixKey: true } },
          items:     { select: { id: true, amount: true, commissionId: true } },
        },
      }),
    ]);

    return { data: payments, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  });

  // GET /payments/:id — detalhe (MASTER_ADMIN)
  app.get('/payments/:id', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params;
    const payment = await prisma.affiliatePayment.findUnique({
      where: { id },
      include: {
        affiliate: { select: { name: true, pixKey: true, refCode: true } },
        items: {
          include: {
            commission: {
              include: { conversion: { select: { product: true, grossAmount: true, occurredAt: true } } },
            },
          },
        },
      },
    });
    if (!payment) return reply.code(404).send({ message: 'Pagamento não encontrado' });
    return { payment };
  });
}
