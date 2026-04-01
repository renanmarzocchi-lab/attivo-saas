import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { audit } from '../../lib/audit.js';
import { roundHalfUp } from '../../lib/math.js';

export default async function conversionRoutes(app) {

  // POST /conversions — cria conversão + comissão (MASTER_ADMIN)
  app.post('/conversions', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const schema = z.object({
      affiliateId:    z.string(),
      customerName:   z.string().optional(),
      customerEmail:  z.string().email().optional(),
      customerPhone:  z.string().optional(),
      product:        z.string().optional(),
      insurer:        z.string().optional(),
      grossAmount:    z.number().positive(),
      commissionBase: z.number().positive(),
      occurredAt:     z.string().datetime(),
      competenceMonth: z.string().regex(/^\d{4}-\d{2}$/),
    });

    const data = schema.parse(request.body);
    const affiliate = await prisma.affiliate.findUnique({ where: { id: data.affiliateId } });
    if (!affiliate) return reply.code(404).send({ message: 'Afiliado não encontrado' });
    if (affiliate.status !== 'ACTIVE') return reply.code(422).send({ message: 'Afiliado não está ativo' });

    const rate = Number(affiliate.commissionRate);
    const commissionValue = roundHalfUp(data.commissionBase * rate);

    const result = await prisma.$transaction(async (tx) => {
      const conversion = await tx.affiliateConversion.create({
        data: {
          affiliateId:    data.affiliateId,
          refCode:        affiliate.refCode,
          customerName:   data.customerName,
          customerEmail:  data.customerEmail,
          customerPhone:  data.customerPhone,
          product:        data.product,
          insurer:        data.insurer,
          grossAmount:    data.grossAmount,
          commissionBase: data.commissionBase,
          commissionRate: rate,
          commissionValue,
          occurredAt:     new Date(data.occurredAt),
          status:         'APPROVED',
        },
      });

      const commission = await tx.affiliateCommission.create({
        data: {
          affiliateId:    data.affiliateId,
          conversionId:   conversion.id,
          amount:         commissionValue,
          rate,
          status:         'AVAILABLE',
          competenceMonth: data.competenceMonth,
        },
      });

      return { conversion, commission };
    });

    await audit(request.currentUser.id, 'CONVERSION_CREATED', 'AffiliateConversion', result.conversion.id, {
      affiliateId: data.affiliateId,
      commissionValue,
    });

    return reply.code(201).send(result);
  });

  // GET /conversions — listagem (MASTER_ADMIN)
  app.get('/conversions', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const schema = z.object({
      page:        z.coerce.number().int().min(1).default(1),
      limit:       z.coerce.number().int().min(1).max(100).default(20),
      affiliateId: z.string().optional(),
      status:      z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELED']).optional(),
    });
    const { page, limit, affiliateId, status } = schema.parse(request.query);
    const where = {};
    if (affiliateId) where.affiliateId = affiliateId;
    if (status)      where.status = status;
    const skip = (page - 1) * limit;

    const [total, conversions] = await Promise.all([
      prisma.affiliateConversion.count({ where }),
      prisma.affiliateConversion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { affiliate: { select: { name: true, refCode: true } }, commission: true },
      }),
    ]);

    return { data: conversions, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  });

  // PATCH /conversions/:id/cancel — cancela conversão e comissão (MASTER_ADMIN)
  app.patch('/conversions/:id/cancel', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params;
    const conversion = await prisma.affiliateConversion.findUnique({ where: { id }, include: { commission: true } });
    if (!conversion) return reply.code(404).send({ message: 'Conversão não encontrada' });
    if (conversion.status === 'CANCELED') return reply.code(409).send({ message: 'Conversão já cancelada' });

    if (conversion.commission?.status === 'PAID') {
      return reply.code(422).send({ message: 'Não é possível cancelar: comissão já paga' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.affiliateConversion.update({ where: { id }, data: { status: 'CANCELED' } });
      if (conversion.commission) {
        await tx.affiliateCommission.update({
          where: { id: conversion.commission.id },
          data:  { status: 'CANCELED' },
        });
      }
    });

    await audit(request.currentUser.id, 'CONVERSION_CANCELED', 'AffiliateConversion', id);
    return { message: 'Conversão e comissão canceladas' };
  });
}
