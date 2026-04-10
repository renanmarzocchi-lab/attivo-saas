import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma, normalizeEmail, normalizeDocument } from '../../lib/prisma.js';
import { generateUniqueRefCode } from '../../lib/refcode.js';
import { audit } from '../../lib/audit.js';

export default async function affiliateRoutes(app) {

  // POST /affiliates/register — público
  app.post('/affiliates/register', async (request, reply) => {
    const schema = z.object({
      name:     z.string().min(3),
      document: z.string().min(11),
      email:    z.string().email(),
      phone:    z.string().optional(),
      cityUf:   z.string().optional(),
      pixKey:   z.string().optional(),
      password: z.string().min(8),
      referredByCode: z.string().optional(),
    });

    const data = schema.parse(request.body);
    const email    = normalizeEmail(data.email);
    const document = normalizeDocument(data.document);

    const [emailExists, docExists] = await Promise.all([
      prisma.affiliate.findUnique({ where: { email } }),
      prisma.affiliate.findUnique({ where: { document } }),
    ]);
    if (emailExists) return reply.code(409).send({ message: 'E-mail já cadastrado' });
    if (docExists)   return reply.code(409).send({ message: 'CPF já cadastrado' });

    const refCode      = await generateUniqueRefCode(data.name);
    const passwordHash = await bcrypt.hash(data.password, 10);

    const affiliate = await prisma.$transaction(async (tx) => {
      const aff = await tx.affiliate.create({
        data: { name: data.name, document, email, phone: data.phone, cityUf: data.cityUf, pixKey: data.pixKey, refCode },
      });
      await tx.user.create({
        data: { name: data.name, email, passwordHash, document, role: 'AFFILIATE', status: 'INACTIVE', affiliateId: aff.id },
      });
      return aff;
    });

    // Registra indicação no audit log (se veio de um link com ?ref=)
    if (data.referredByCode) {
      const referrer = await prisma.affiliate.findUnique({ where: { refCode: data.referredByCode } });
      if (referrer) {
        await audit(null, 'AFFILIATE_REGISTERED_FROM_REFERRAL', 'Affiliate', affiliate.id, {
          referredByAffiliateId: referrer.id,
          referredByRefCode: referrer.refCode,
          referredByName: referrer.name,
        });
      }
    }

    return reply.code(201).send({ affiliate: { id: affiliate.id, name: affiliate.name, email: affiliate.email, refCode: affiliate.refCode, status: affiliate.status } });
  });

  // POST /affiliates/accept-document — afiliado autenticado
  app.post('/affiliates/accept-document', {
    preHandler: [app.authenticate, app.authorize('AFFILIATE')],
  }, async (request, reply) => {
    const user = request.currentUser;
    const affiliate = await prisma.affiliate.findUnique({ where: { id: user.affiliateId } });
    if (!affiliate) return reply.code(404).send({ message: 'Afiliado não encontrado' });

    const doc = await prisma.documentVersion.findFirst({ where: { isCurrent: true, isRequired: true } });
    if (!doc) return reply.code(404).send({ message: 'Nenhum documento vigente encontrado' });

    const existing = await prisma.affiliateDocumentAcceptance.findUnique({
      where: { affiliateId_documentVersionId: { affiliateId: affiliate.id, documentVersionId: doc.id } },
    });
    if (existing) return reply.code(409).send({ message: 'Documento já aceito' });

    const acceptance = await prisma.affiliateDocumentAcceptance.create({
      data: {
        affiliateId:       affiliate.id,
        documentVersionId: doc.id,
        ipAddress:         request.ip,
        userAgent:         request.headers['user-agent'],
      },
    });

    return { acceptance: { id: acceptance.id, documentVersion: doc.version, acceptedAt: acceptance.acceptedAt } };
  });

  // PATCH /affiliates/:id/approve — somente MASTER_ADMIN
  app.patch('/affiliates/:id/approve', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params;
    const affiliate = await prisma.affiliate.findUnique({ where: { id }, include: { user: true } });
    if (!affiliate) return reply.code(404).send({ message: 'Afiliado não encontrado' });
    if (affiliate.status !== 'PENDING') return reply.code(422).send({ message: 'Apenas afiliados pendentes podem ser aprovados' });

    const doc = await prisma.documentVersion.findFirst({ where: { isCurrent: true, isRequired: true } });
    if (doc) {
      const accepted = await prisma.affiliateDocumentAcceptance.findUnique({
        where: { affiliateId_documentVersionId: { affiliateId: id, documentVersionId: doc.id } },
      });
      if (!accepted) return reply.code(422).send({ message: 'Afiliado ainda não aceitou o documento vigente' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.affiliate.update({ where: { id }, data: { status: 'ACTIVE', approvedAt: new Date() } });
      if (affiliate.user) {
        await tx.user.update({ where: { id: affiliate.user.id }, data: { status: 'ACTIVE' } });
      }
    });

    await audit(request.currentUser.id, 'AFFILIATE_APPROVED', 'Affiliate', id, { approvedBy: request.currentUser.email });
    return { message: 'Afiliado aprovado com sucesso' };
  });

  // PATCH /affiliates/:id/reject — somente MASTER_ADMIN
  app.patch('/affiliates/:id/reject', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params;
    const affiliate = await prisma.affiliate.findUnique({ where: { id } });
    if (!affiliate) return reply.code(404).send({ message: 'Afiliado não encontrado' });

    await prisma.affiliate.update({ where: { id }, data: { status: 'REJECTED' } });
    await audit(request.currentUser.id, 'AFFILIATE_REJECTED', 'Affiliate', id, { rejectedBy: request.currentUser.email });
    return { message: 'Afiliado rejeitado' };
  });

  // PATCH /affiliates/:id/block — somente MASTER_ADMIN
  app.patch('/affiliates/:id/block', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params;
    const affiliate = await prisma.affiliate.findUnique({ where: { id }, include: { user: true } });
    if (!affiliate) return reply.code(404).send({ message: 'Afiliado não encontrado' });

    await prisma.$transaction(async (tx) => {
      await tx.affiliate.update({ where: { id }, data: { status: 'BLOCKED' } });
      if (affiliate.user) {
        await tx.user.update({ where: { id: affiliate.user.id }, data: { status: 'BLOCKED' } });
      }
    });

    await audit(request.currentUser.id, 'AFFILIATE_BLOCKED', 'Affiliate', id, { blockedBy: request.currentUser.email });
    return { message: 'Afiliado bloqueado' };
  });

  // PATCH /affiliates/:id/unblock — somente MASTER_ADMIN
  app.patch('/affiliates/:id/unblock', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params;
    const affiliate = await prisma.affiliate.findUnique({ where: { id }, include: { user: true } });
    if (!affiliate) return reply.code(404).send({ message: 'Afiliado não encontrado' });
    if (affiliate.status !== 'BLOCKED' && affiliate.status !== 'REJECTED') {
      return reply.code(422).send({ message: 'Apenas afiliados bloqueados ou rejeitados podem ser reativados' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.affiliate.update({ where: { id }, data: { status: 'ACTIVE', approvedAt: new Date() } });
      if (affiliate.user) {
        await tx.user.update({ where: { id: affiliate.user.id }, data: { status: 'ACTIVE' } });
      }
    });

    await audit(request.currentUser.id, 'AFFILIATE_UNBLOCKED', 'Affiliate', id, { unblockedBy: request.currentUser.email });
    return { message: 'Afiliado reativado com sucesso' };
  });

  // GET /affiliates — listagem com paginação (MASTER_ADMIN)
  app.get('/affiliates', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const schema = z.object({
      page:   z.coerce.number().int().min(1).default(1),
      limit:  z.coerce.number().int().min(1).max(100).default(20),
      status: z.enum(['PENDING', 'ACTIVE', 'REJECTED', 'BLOCKED']).optional(),
    });
    const { page, limit, status } = schema.parse(request.query);
    const where = status ? { status } : {};
    const skip  = (page - 1) * limit;

    const [total, affiliates] = await Promise.all([
      prisma.affiliate.count({ where }),
      prisma.affiliate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { clicks: true, leads: true, conversions: true, commissions: true } },
        },
      }),
    ]);

    return {
      data: affiliates,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  });

  // GET /affiliates/:id — detalhe (MASTER_ADMIN)
  app.get('/affiliates/:id', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params;
    const affiliate = await prisma.affiliate.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, status: true } },
        _count: { select: { clicks: true, leads: true, conversions: true } },
        documentAcceptances: { include: { documentVersion: true }, orderBy: { acceptedAt: 'desc' } },
      },
    });
    if (!affiliate) return reply.code(404).send({ message: 'Afiliado não encontrado' });
    return { affiliate };
  });

  // PATCH /affiliates/:id/commission-rate — somente MASTER_ADMIN
  app.patch('/affiliates/:id/commission-rate', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params;
    const schema = z.object({
      commissionRate: z.number().min(0).max(1),
    });
    const { commissionRate } = schema.parse(request.body);

    const affiliate = await prisma.affiliate.findUnique({ where: { id } });
    if (!affiliate) return reply.code(404).send({ message: 'Afiliado não encontrado' });

    const oldRate = Number(affiliate.commissionRate);
    await prisma.affiliate.update({ where: { id }, data: { commissionRate } });

    await audit(request.currentUser.id, 'AFFILIATE_COMMISSION_RATE_UPDATED', 'Affiliate', id, {
      oldRate, newRate: commissionRate, updatedBy: request.currentUser.email,
    });

    return { message: 'Taxa de comissão atualizada', affiliate: { id, commissionRate } };
  });
}
