import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';

export default async function adminRoutes(app) {

  // GET /admin/dashboard/summary
  app.get('/admin/dashboard/summary', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async () => {
    const [totalAffiliates, pendingAffiliates, totalLeads, totalClicks, totalConversions, activeAffiliates] =
      await Promise.all([
        prisma.affiliate.count(),
        prisma.affiliate.count({ where: { status: 'PENDING' } }),
        prisma.affiliateLead.count(),
        prisma.affiliateClick.count(),
        prisma.affiliateConversion.count({ where: { status: 'APPROVED' } }),
        prisma.affiliate.count({ where: { status: 'ACTIVE' } }),
      ]);

    return { totalAffiliates, pendingAffiliates, activeAffiliates, totalLeads, totalClicks, totalConversions };
  });

  // GET /admin/dashboard/financial
  app.get('/admin/dashboard/financial', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async () => {
    const [pendingCommissions, availableCommissions, paidCommissions, totalPayments] = await Promise.all([
      prisma.affiliateCommission.aggregate({ _sum: { amount: true }, where: { status: 'PENDING' } }),
      prisma.affiliateCommission.aggregate({ _sum: { amount: true }, where: { status: 'AVAILABLE' } }),
      prisma.affiliateCommission.aggregate({ _sum: { amount: true }, where: { status: 'PAID' } }),
      prisma.affiliatePayment.aggregate({ _sum: { totalAmount: true }, where: { status: 'PAID' } }),
    ]);

    return {
      pendingCommissions:   Number(pendingCommissions._sum.amount ?? 0),
      availableCommissions: Number(availableCommissions._sum.amount ?? 0),
      paidCommissions:      Number(paidCommissions._sum.amount ?? 0),
      totalPayments:        Number(totalPayments._sum.totalAmount ?? 0),
    };
  });

  // GET /admin/dashboard/top-affiliates
  app.get('/admin/dashboard/top-affiliates', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async () => {
    const topByCommission = await prisma.affiliateCommission.groupBy({
      by:      ['affiliateId'],
      _sum:    { amount: true },
      where:   { status: { in: ['AVAILABLE', 'PAID'] } },
      orderBy: { _sum: { amount: 'desc' } },
      take:    10,
    });

    const ids = topByCommission.map((r) => r.affiliateId);
    const affiliates = await prisma.affiliate.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, refCode: true, status: true },
    });
    const affiliateMap = Object.fromEntries(affiliates.map((a) => [a.id, a]));

    return topByCommission.map((r) => ({
      affiliate:       affiliateMap[r.affiliateId],
      totalCommission: Number(r._sum.amount ?? 0),
    }));
  });

  // GET /admin/commissions — listagem (MASTER_ADMIN)
  app.get('/admin/commissions', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const schema = z.object({
      page:           z.coerce.number().int().min(1).default(1),
      limit:          z.coerce.number().int().min(1).max(100).default(20),
      affiliateId:    z.string().optional(),
      status:         z.enum(['PENDING', 'AVAILABLE', 'PAID', 'CANCELED']).optional(),
      competenceMonth: z.string().optional(),
    });
    const { page, limit, affiliateId, status, competenceMonth } = schema.parse(request.query);
    const where = {};
    if (affiliateId)     where.affiliateId = affiliateId;
    if (status)          where.status = status;
    if (competenceMonth) where.competenceMonth = competenceMonth;
    const skip = (page - 1) * limit;

    const [total, commissions] = await Promise.all([
      prisma.affiliateCommission.count({ where }),
      prisma.affiliateCommission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          affiliate:  { select: { name: true, refCode: true } },
          conversion: { select: { product: true, grossAmount: true, occurredAt: true } },
        },
      }),
    ]);

    return { data: commissions, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  });
}
