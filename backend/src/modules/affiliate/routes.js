import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { audit } from '../../lib/audit.js';

export default async function affiliateDashboardRoutes(app) {

  // Helper: extrai affiliateId do currentUser ou query (MASTER_ADMIN)
  async function getAffiliate(request, reply) {
    const user = request.currentUser;
    // MASTER_ADMIN pode consultar qualquer afiliado via ?affiliateId=xxx
    const affiliateId = user.role === 'MASTER_ADMIN'
      ? (request.query?.affiliateId ?? null)
      : user.affiliateId;
    if (!affiliateId) {
      return user.role === 'MASTER_ADMIN'
        ? reply.code(400).send({ message: 'Informe o affiliateId como query parameter' })
        : reply.code(403).send({ message: 'Acesso negado' });
    }
    const affiliate = await prisma.affiliate.findUnique({ where: { id: affiliateId } });
    if (!affiliate) return reply.code(404).send({ message: 'Afiliado não encontrado' });
    return affiliate;
  }

  // GET /affiliate/dashboard
  app.get('/affiliate/dashboard', {
    preHandler: [app.authenticate, app.authorize('AFFILIATE', 'MASTER_ADMIN')],
  }, async (request, reply) => {
    const affiliate = await getAffiliate(request, reply);
    if (!affiliate) return;

    const [
      totalLeads, totalClicks, totalConversions,
      availableCommission, paidCommission,
      businessTotal, businessPolicies, businessPremium,
    ] = await Promise.all([
      prisma.affiliateLead.count({ where: { affiliateId: affiliate.id } }),
      prisma.affiliateClick.count({ where: { affiliateId: affiliate.id } }),
      prisma.affiliateConversion.count({ where: { affiliateId: affiliate.id, status: 'APPROVED' } }),
      prisma.affiliateCommission.aggregate({
        _sum:  { amount: true },
        where: { affiliateId: affiliate.id, status: 'AVAILABLE' },
      }),
      prisma.affiliateCommission.aggregate({
        _sum:  { amount: true },
        where: { affiliateId: affiliate.id, status: 'PAID' },
      }),
      prisma.insuranceRecord.count({
        where: { affiliateId: affiliate.id, sourceType: 'AFFILIATE' },
      }),
      prisma.insuranceRecord.count({
        where: { affiliateId: affiliate.id, sourceType: 'AFFILIATE', stage: 'APOLICE_EMITIDA' },
      }),
      prisma.insuranceRecord.aggregate({
        _sum: { premiumAmount: true },
        where: { affiliateId: affiliate.id, sourceType: 'AFFILIATE' },
      }),
    ]);

    return {
      refCode:              affiliate.refCode,
      status:               affiliate.status,
      totalLeads,
      totalClicks,
      totalConversions,
      availableCommission:  Number(availableCommission._sum.amount ?? 0),
      paidCommission:       Number(paidCommission._sum.amount ?? 0),
      businessStats: {
        total:          businessTotal,
        policies:       businessPolicies,
        premiumTotal:   Number(businessPremium._sum.premiumAmount ?? 0),
        conversionRate: businessTotal > 0 ? Math.round((businessPolicies / businessTotal) * 100) : 0,
      },
    };
  });

  // GET /affiliate/conversions
  app.get('/affiliate/conversions', {
    preHandler: [app.authenticate, app.authorize('AFFILIATE', 'MASTER_ADMIN')],
  }, async (request, reply) => {
    const affiliate = await getAffiliate(request, reply);
    if (!affiliate) return;

    const schema = z.object({
      page:   z.coerce.number().int().min(1).default(1),
      limit:  z.coerce.number().int().min(1).max(100).default(20),
      status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELED']).optional(),
    });
    const { page, limit, status } = schema.parse(request.query);
    const where = { affiliateId: affiliate.id };
    if (status) where.status = status;
    const skip = (page - 1) * limit;

    const [total, conversions] = await Promise.all([
      prisma.affiliateConversion.count({ where }),
      prisma.affiliateConversion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { occurredAt: 'desc' },
        select: {
          id:              true,
          product:         true,
          insurer:         true,
          grossAmount:     true,
          commissionValue: true,
          status:          true,
          occurredAt:      true,
          commission:      { select: { status: true, competenceMonth: true } },
        },
      }),
    ]);

    return { data: conversions, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  });

  // GET /affiliate/statement — extrato de comissões
  app.get('/affiliate/statement', {
    preHandler: [app.authenticate, app.authorize('AFFILIATE', 'MASTER_ADMIN')],
  }, async (request, reply) => {
    const affiliate = await getAffiliate(request, reply);
    if (!affiliate) return;

    const schema = z.object({
      page:           z.coerce.number().int().min(1).default(1),
      limit:          z.coerce.number().int().min(1).max(100).default(20),
      status:         z.enum(['PENDING', 'AVAILABLE', 'PAID', 'CANCELED']).optional(),
      competenceMonth: z.string().optional(),
    });
    const { page, limit, status, competenceMonth } = schema.parse(request.query);
    const where = { affiliateId: affiliate.id };
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
          conversion: { select: { product: true, grossAmount: true, occurredAt: true } },
        },
      }),
    ]);

    return { data: commissions, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  });

  // GET /affiliate/payments — histórico de pagamentos
  app.get('/affiliate/payments', {
    preHandler: [app.authenticate, app.authorize('AFFILIATE', 'MASTER_ADMIN')],
  }, async (request, reply) => {
    const affiliate = await getAffiliate(request, reply);
    if (!affiliate) return;

    const schema = z.object({
      page:  z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(20),
    });
    const { page, limit } = schema.parse(request.query);
    const where = { affiliateId: affiliate.id };
    const skip  = (page - 1) * limit;

    const [total, payments] = await Promise.all([
      prisma.affiliatePayment.count({ where }),
      prisma.affiliatePayment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paidAt: 'desc' },
        include: {
          items: {
            select: {
              amount: true,
              commission: { select: { competenceMonth: true, conversion: { select: { product: true } } } },
            },
          },
        },
      }),
    ]);

    return { data: payments, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  });

  // GET /affiliate/profile — dados do perfil do afiliado
  app.get('/affiliate/profile', {
    preHandler: [app.authenticate, app.authorize('AFFILIATE')],
  }, async (request, reply) => {
    const user = request.currentUser;
    if (!user.affiliateId) return reply.code(403).send({ message: 'Acesso negado' });
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: user.affiliateId },
      select: {
        id: true, name: true, document: true, email: true, phone: true,
        cityUf: true, pixKey: true, address: true, addressNumber: true,
        addressComplement: true, neighborhood: true, zipCode: true,
        profileComplete: true, refCode: true, status: true,
      },
    });
    if (!affiliate) return reply.code(404).send({ message: 'Afiliado não encontrado' });

    // Verificar se aceitou documento vigente
    const doc = await prisma.documentVersion.findFirst({ where: { isCurrent: true, isRequired: true } });
    let documentAccepted = true;
    if (doc) {
      const acceptance = await prisma.affiliateDocumentAcceptance.findUnique({
        where: { affiliateId_documentVersionId: { affiliateId: affiliate.id, documentVersionId: doc.id } },
      });
      documentAccepted = !!acceptance;
    }

    return { affiliate, documentAccepted };
  });

  // PATCH /affiliate/profile — atualizar perfil do afiliado
  app.patch('/affiliate/profile', {
    preHandler: [app.authenticate, app.authorize('AFFILIATE')],
  }, async (request, reply) => {
    const user = request.currentUser;
    if (!user.affiliateId) return reply.code(403).send({ message: 'Acesso negado' });

    const schema = z.object({
      phone:             z.string().optional(),
      cityUf:            z.string().optional(),
      pixKey:            z.string().optional(),
      address:           z.string().optional(),
      addressNumber:     z.string().optional(),
      addressComplement: z.string().optional(),
      neighborhood:      z.string().optional(),
      zipCode:           z.string().optional(),
    });

    const data = schema.parse(request.body);

    // Calcular profileComplete
    const current = await prisma.affiliate.findUnique({ where: { id: user.affiliateId } });
    if (!current) return reply.code(404).send({ message: 'Afiliado não encontrado' });

    const merged = { ...current, ...data };
    const profileComplete = !!(merged.phone && merged.cityUf && merged.pixKey && merged.address && merged.zipCode);

    const affiliate = await prisma.affiliate.update({
      where: { id: user.affiliateId },
      data: { ...data, profileComplete },
    });

    await audit(user.id, 'AFFILIATE_PROFILE_UPDATED', 'Affiliate', affiliate.id, { fields: Object.keys(data) });

    return { message: 'Perfil atualizado com sucesso', affiliate: { id: affiliate.id, profileComplete: affiliate.profileComplete } };
  });
}
