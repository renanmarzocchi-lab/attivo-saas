import { z } from 'zod';
import { prisma, normalizeDocument } from '../../lib/prisma.js';
import { audit } from '../../lib/audit.js';
import { tenantWhere, assertTenantAccess, resolveTenantId } from '../../lib/tenant.js';
import {
  calcRenewalAlertDate,
  addTimeline,
  scheduleRenewalNotifications,
  INSURANCE_LIST_SELECT,
} from '../../lib/insurance.js';
import { triggerStageAutomation } from '../../services/automation.service.js';

const PIPELINE_STAGES = ['LEAD', 'EM_COTACAO', 'COTADO', 'PROPOSTA_ENVIADA', 'PROPOSTA_ACEITA', 'APOLICE_EMITIDA'];

const createSchema = z.object({
  type:                z.enum(['AUTO','RESIDENCIAL','EMPRESARIAL','VIDA','PREVIDENCIA','SAUDE','ODONTO','VIAGEM','RC','EQUIPAMENTOS','OUTROS']),
  stage:               z.enum(['LEAD','EM_COTACAO','COTADO','PROPOSTA_ENVIADA','PROPOSTA_ACEITA','APOLICE_EMITIDA','PERDIDO','CANCELADO']).default('LEAD'),
  insurer:             z.string().max(120).optional(),
  customerName:        z.string().min(2).max(200),
  customerDocument:    z.string().min(11),
  customerEmail:       z.string().email().optional(),
  customerPhone:       z.string().max(20).optional(),
  customerCityUf:      z.string().max(60).optional(),
  sourceType:          z.enum(['DIRECT','AFFILIATE','SITE','WHATSAPP','MANUAL']).default('MANUAL'),
  affiliateId:         z.string().optional(),
  refCode:             z.string().optional(),
  leadId:              z.string().optional(),
  premiumAmount:       z.number().positive().optional(),
  estimatedCommission: z.number().positive().optional(),
  policyNumber:        z.string().max(60).optional(),
  proposalNumber:      z.string().max(60).optional(),
  startDate:           z.string().datetime().optional(),
  endDate:             z.string().datetime().optional(),
  renewalReminderDays: z.number().int().min(1).max(365).default(30),
  notes:               z.string().max(2000).optional(),
});

const updateSchema = createSchema.partial().omit({ customerDocument: true });

export default async function brokerRoutes(app) {

  // ── POST /broker/insurance ────────────────────────────────────────────────
  app.post('/broker/insurance', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request, reply) => {
    const user = request.currentUser;
    const data = createSchema.parse(request.body);

    // Apólice duplicada
    if (data.policyNumber) {
      const dup = await prisma.insuranceRecord.findUnique({ where: { policyNumber: data.policyNumber } });
      if (dup) return reply.code(409).send({ message: 'Numero de apolice ja cadastrado' });
    }

    const customerDocument = normalizeDocument(data.customerDocument);
    const renewalAlertDate = calcRenewalAlertDate(data.endDate, data.renewalReminderDays);
    const tenantId         = resolveTenantId(request);

    // Auto-calcular comissão estimada do afiliado se não informada
    let estimatedCommission = data.estimatedCommission;
    if (!estimatedCommission && data.premiumAmount) {
      if (data.affiliateId) {
        const aff = await prisma.affiliate.findUnique({ where: { id: data.affiliateId }, select: { commissionRate: true } });
        if (aff) estimatedCommission = Math.round(data.premiumAmount * Number(aff.commissionRate) * 100) / 100;
      } else {
        // Comissão do próprio corretor
        const brokerRate = Number(user.commissionRate ?? 0);
        if (brokerRate > 0) estimatedCommission = Math.round(data.premiumAmount * brokerRate * 100) / 100;
      }
    }

    const record = await prisma.$transaction(async (tx) => {
      const r = await tx.insuranceRecord.create({
        data: {
          ...data,
          tenantId,
          customerDocument,
          renewalAlertDate,
          estimatedCommission: estimatedCommission ?? null,
          startDate:          data.startDate ? new Date(data.startDate) : null,
          endDate:            data.endDate   ? new Date(data.endDate)   : null,
          createdByUserId:    user.id,
          ownerUserId:        user.id,
        },
      });
      await addTimeline(r.id, 'CRIADO', `Registro criado por ${user.name}`, user.id, tx);
      await scheduleRenewalNotifications(r, tx);
      // Gera comissão de corretor automaticamente se stage já é APOLICE_EMITIDA
      if (r.stage === 'APOLICE_EMITIDA' && Number(user.commissionRate ?? 0) > 0 && !data.affiliateId) {
        const amt = estimatedCommission ?? (data.premiumAmount ? Math.round(data.premiumAmount * Number(user.commissionRate) * 100) / 100 : 0);
        const month = new Date().toISOString().slice(0, 7);
        await tx.brokerCommission.create({
          data: { userId: user.id, insuranceId: r.id, amount: amt, rate: user.commissionRate, competenceMonth: month },
        });
      }
      return r;
    });

    await audit(user.id, 'INSURANCE_CREATED', 'InsuranceRecord', record.id, { type: data.type, stage: data.stage });
    return reply.code(201).send({ record });
  });

  // ── GET /broker/insurance ─────────────────────────────────────────────────
  app.get('/broker/insurance', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request) => {
    const schema = z.object({
      page:   z.coerce.number().int().min(1).default(1),
      limit:  z.coerce.number().int().min(1).max(100).default(20),
      stage:  z.string().optional(),
      type:   z.string().optional(),
      status: z.string().optional(),
      search: z.string().optional(),
    });
    const { page, limit, stage, type, status, search } = schema.parse(request.query);
    const skip = (page - 1) * limit;

    // BROKER: apenas seus próprios registros
    // MASTER_ADMIN sem tenant: tudo (global admin)
    // MASTER_ADMIN com tenant: apenas seu tenant
    const ownerFilter  = request.currentUser.role === 'BROKER'
      ? { ownerUserId: request.currentUser.id }
      : {};

    const where = tenantWhere(request, {
      ...ownerFilter,
      ...(stage  ? { stage }  : {}),
      ...(type   ? { type }   : {}),
      ...(status ? { status } : {}),
      ...(search ? { customerName: { contains: search, mode: 'insensitive' } } : {}),
    });

    const [total, records] = await Promise.all([
      prisma.insuranceRecord.count({ where }),
      prisma.insuranceRecord.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        select:  INSURANCE_LIST_SELECT,
      }),
    ]);

    return { data: records, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  });

  // ── GET /broker/insurance/:id ─────────────────────────────────────────────
  app.get('/broker/insurance/:id', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request, reply) => {
    const { id } = request.params;
    const user   = request.currentUser;

    const record = await prisma.insuranceRecord.findUnique({
      where:   { id },
      include: {
        createdBy:     { select: { id: true, name: true } },
        owner:         { select: { id: true, name: true } },
        affiliate:     { select: { id: true, name: true, refCode: true } },
        timeline:      { orderBy: { createdAt: 'desc' }, include: { createdBy: { select: { name: true } } } },
        attachments:   { orderBy: { createdAt: 'desc' }, include: { uploadedBy: { select: { name: true } } } },
        notifications: { orderBy: { scheduledAt: 'asc' }, select: { id: true, message: true, status: true, channel: true, scheduledAt: true, sentAt: true } },
      },
    });

    if (!record) return reply.code(404).send({ message: 'Registro nao encontrado' });

    // Tenant isolation: garante que BROKER/MASTER_ADMIN com tenant não acessa de outro tenant
    assertTenantAccess(request, record, reply);

    // BROKER: pode ver apenas os próprios registros
    if (user.role === 'BROKER' && record.ownerUserId !== user.id) {
      return reply.code(403).send({ message: 'Voce so pode visualizar seus proprios registros' });
    }

    return { record };
  });

  // ── PATCH /broker/insurance/:id ───────────────────────────────────────────
  app.patch('/broker/insurance/:id', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request, reply) => {
    const { id } = request.params;
    const user   = request.currentUser;
    const data   = updateSchema.parse(request.body);

    const record = await prisma.insuranceRecord.findUnique({ where: { id } });
    if (!record) return reply.code(404).send({ message: 'Registro nao encontrado' });

    // Tenant isolation
    assertTenantAccess(request, record, reply);

    // BROKER só edita o que criou
    if (user.role === 'BROKER' && record.createdByUserId !== user.id) {
      return reply.code(403).send({ message: 'Voce so pode editar registros que criou' });
    }

    // Apólice duplicada
    if (data.policyNumber && data.policyNumber !== record.policyNumber) {
      const dup = await prisma.insuranceRecord.findUnique({ where: { policyNumber: data.policyNumber } });
      if (dup) return reply.code(409).send({ message: 'Numero de apolice ja cadastrado' });
    }

    const endDate            = data.endDate ? new Date(data.endDate) : record.endDate;
    const renewalReminderDays = data.renewalReminderDays ?? record.renewalReminderDays;
    const renewalAlertDate   = calcRenewalAlertDate(endDate, renewalReminderDays);

    // Auto-recalcular comissão se premiumAmount ou affiliateId mudaram e estimatedCommission não foi fornecida
    if (!data.estimatedCommission) {
      const premium    = data.premiumAmount ?? Number(record.premiumAmount ?? 0);
      const affId      = data.affiliateId ?? record.affiliateId;
      if (premium > 0) {
        if (affId) {
          const aff = await prisma.affiliate.findUnique({ where: { id: affId }, select: { commissionRate: true } });
          if (aff) data.estimatedCommission = Math.round(premium * Number(aff.commissionRate) * 100) / 100;
        } else {
          const brokerRate = Number(user.commissionRate ?? 0);
          if (brokerRate > 0) data.estimatedCommission = Math.round(premium * brokerRate * 100) / 100;
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.insuranceRecord.update({
        where: { id },
        data:  {
          ...data,
          renewalAlertDate,
          startDate:  data.startDate ? new Date(data.startDate) : undefined,
          endDate:    data.endDate   ? new Date(data.endDate)   : undefined,
          updatedAt:  new Date(),
        },
      });
      await addTimeline(id, 'EDITADO', `Registro atualizado por ${user.name}`, user.id, tx);
      if (data.endDate) await scheduleRenewalNotifications(r, tx);
      return r;
    });

    await audit(user.id, 'INSURANCE_UPDATED', 'InsuranceRecord', id);
    return { record: updated };
  });

  // ── PATCH /broker/insurance/:id/stage ────────────────────────────────────
  app.patch('/broker/insurance/:id/stage', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request, reply) => {
    const { id }  = request.params;
    const user    = request.currentUser;
    const { stage } = z.object({
      stage: z.enum(['LEAD','EM_COTACAO','COTADO','PROPOSTA_ENVIADA','PROPOSTA_ACEITA','APOLICE_EMITIDA','PERDIDO','CANCELADO']),
    }).parse(request.body);

    const record = await prisma.insuranceRecord.findUnique({ where: { id } });
    if (!record) return reply.code(404).send({ message: 'Registro nao encontrado' });

    // Tenant isolation
    assertTenantAccess(request, record, reply);

    if (user.role === 'BROKER' && record.createdByUserId !== user.id) {
      return reply.code(403).send({ message: 'Voce so pode editar registros que criou' });
    }

    const prevStage = record.stage;
    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.insuranceRecord.update({ where: { id }, data: { stage } });
      await addTimeline(id, 'STAGE_ALTERADO', `${prevStage} -> ${stage} por ${user.name}`, user.id, tx);

      // Gera comissão de corretor ao emitir apólice (se ainda não existe)
      if (stage === 'APOLICE_EMITIDA' && !r.affiliateId) {
        const owner = await tx.user.findUnique({ where: { id: r.ownerUserId }, select: { commissionRate: true } });
        const rate  = Number(owner?.commissionRate ?? 0);
        if (rate > 0) {
          const existing = await tx.brokerCommission.findUnique({ where: { insuranceId: id } });
          if (!existing) {
            const base = Number(r.estimatedCommission ?? r.premiumAmount ?? 0);
            const amt  = base > 0 ? base : Math.round(Number(r.premiumAmount ?? 0) * rate * 100) / 100;
            const month = new Date().toISOString().slice(0, 7);
            await tx.brokerCommission.create({
              data: { userId: r.ownerUserId, insuranceId: id, amount: amt, rate, competenceMonth: month },
            });
          }
        }
      }
      return r;
    });

    await audit(user.id, 'INSURANCE_STAGE_CHANGED', 'InsuranceRecord', id, { from: prevStage, to: stage });

    // Disparar automação para o novo stage
    const broker = await prisma.user.findUnique({
      where:  { id: updated.ownerUserId ?? user.id },
      select: { name: true },
    });
    triggerStageAutomation(stage, {
      tenantId:    request.tenantId,
      insuranceId: id,
      insurance:   updated,
      brokerName:  broker?.name,
    }).catch(() => {});

    return { record: updated };
  });

  // ── GET /broker/pipeline ──────────────────────────────────────────────────
  app.get('/broker/pipeline', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request) => {
    const user = request.currentUser;

    const ownerFilter = user.role === 'BROKER' ? { ownerUserId: user.id } : {};
    const where = tenantWhere(request, {
      ...ownerFilter,
      stage: { in: PIPELINE_STAGES },
    });

    const records = await prisma.insuranceRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, type: true, stage: true, insurer: true, status: true,
        customerName: true, customerPhone: true,
        premiumAmount: true, endDate: true,
        owner:     { select: { id: true, name: true } },
        affiliate: { select: { refCode: true } },
        createdAt: true,
      },
    });

    const pipeline = Object.fromEntries(PIPELINE_STAGES.map((s) => [s, []]));
    for (const r of records) pipeline[r.stage].push(r);

    const totals = Object.fromEntries(
      PIPELINE_STAGES.map((s) => [s, {
        count:   pipeline[s].length,
        premium: pipeline[s].reduce((acc, r) => acc + Number(r.premiumAmount ?? 0), 0),
      }])
    );

    return { pipeline, totals };
  });
}
