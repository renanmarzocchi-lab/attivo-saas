import { z } from 'zod';
import { prisma, normalizeDocument } from '../../lib/prisma.js';
import { audit } from '../../lib/audit.js';

// Tipos de seguro disponíveis no sistema
const TIPOS_SEGURO = ['AUTO', 'RESIDENCIAL', 'EMPRESARIAL', 'VIDA', 'PREVIDENCIA', 'SAUDE', 'ODONTO', 'VIAGEM', 'RC', 'EQUIPAMENTOS', 'OUTROS'];

// Mapeamento de tipo para label em português
const TIPO_LABEL = {
  AUTO: 'Automóvel', RESIDENCIAL: 'Residencial', EMPRESARIAL: 'Empresarial',
  VIDA: 'Vida', PREVIDENCIA: 'Previdência', SAUDE: 'Saúde', ODONTO: 'Odonto',
  VIAGEM: 'Viagem', RC: 'RC', EQUIPAMENTOS: 'Equipamentos', OUTROS: 'Outros',
};

const policySchema = z.object({
  type:                   z.enum(['AUTO','RESIDENCIAL','EMPRESARIAL','VIDA','PREVIDENCIA','SAUDE','ODONTO','VIAGEM','RC','EQUIPAMENTOS','OUTROS']),
  insurer:                z.string().min(1).max(120),
  policyNumber:           z.string().min(1).max(60),
  numeroCi:               z.string().max(60).optional(),
  tipoEmissao:            z.enum(['NOVO', 'RENOVACAO']).default('NOVO'),
  customerName:           z.string().min(2).max(200),
  customerDocument:       z.string().optional(),
  customerPhone:          z.string().max(20).optional(),
  premiumAmount:          z.number().positive(),
  percComissao:           z.number().min(0).max(1),
  startDate:              z.string().datetime(),
  endDate:                z.string().datetime(),
  comissaoPaga:           z.enum(['PAGA', 'PENDENTE']).default('PENDENTE'),
  dataPagamentoComissao:  z.string().datetime().optional().nullable(),
  notes:                  z.string().max(2000).optional(),
});

const updateSchema = policySchema.partial().omit({ policyNumber: true });

/** Calcula status de vigência baseado na data de vencimento */
function calcStatus(endDate) {
  if (!endDate) return 'ACTIVE';
  const now  = new Date();
  const end  = new Date(endDate);
  const diff = Math.floor((end - now) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return 'EXPIRED';
  if (diff <= 30) return 'EXPIRING_SOON';
  return 'ACTIVE';
}

export default async function policiesRoutes(app) {

  // ── GET /admin/policies/dashboard ─────────────────────────────────────────
  app.get('/admin/policies/dashboard', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async () => {
    const now    = new Date();
    const in30d  = new Date(now); in30d.setDate(in30d.getDate() + 30);

    const [totalAtivas, aVencer, vencidas, comissaoPendente, records] = await Promise.all([
      // Apólices ativas (vencimento futuro > 30 dias)
      prisma.insuranceRecord.count({
        where: { stage: 'APOLICE_EMITIDA', endDate: { gt: in30d } },
      }),
      // A vencer nos próximos 30 dias
      prisma.insuranceRecord.count({
        where: { stage: 'APOLICE_EMITIDA', endDate: { gte: now, lte: in30d } },
      }),
      // Vencidas
      prisma.insuranceRecord.count({
        where: { stage: 'APOLICE_EMITIDA', endDate: { lt: now } },
      }),
      // Comissão pendente
      prisma.insuranceRecord.aggregate({
        where: { stage: 'APOLICE_EMITIDA', comissaoPaga: 'PENDENTE', percComissao: { not: null } },
        _sum: { premiumAmount: true },
      }),
      // Para breakdown por tipo e seguradora
      prisma.insuranceRecord.findMany({
        where: { stage: 'APOLICE_EMITIDA' },
        select: {
          type: true, insurer: true,
          premiumAmount: true, percComissao: true, comissaoPaga: true,
        },
      }),
    ]);

    // Prêmio total e comissão total/pendente
    let premioTotal      = 0;
    let comissaoTotal    = 0;
    let comissaoPend     = 0;
    const porTipo       = {};
    const porSeguradora  = {};

    for (const r of records) {
      const premio = Number(r.premiumAmount ?? 0);
      const perc   = Number(r.percComissao ?? 0);
      const com    = premio * perc;

      premioTotal   += premio;
      comissaoTotal += com;
      if (r.comissaoPaga === 'PENDENTE') comissaoPend += com;

      // Por tipo
      const tipoLabel = TIPO_LABEL[r.type] || r.type;
      if (!porTipo[tipoLabel]) porTipo[tipoLabel] = { qtd: 0, premio: 0, comissao: 0 };
      porTipo[tipoLabel].qtd++;
      porTipo[tipoLabel].premio    += premio;
      porTipo[tipoLabel].comissao  += com;

      // Por seguradora
      const seg = r.insurer || 'Outros';
      if (!porSeguradora[seg]) porSeguradora[seg] = { qtd: 0, comissaoGerada: 0, comissaoPaga: 0 };
      porSeguradora[seg].qtd++;
      porSeguradora[seg].comissaoGerada += com;
      if (r.comissaoPaga === 'PAGA') porSeguradora[seg].comissaoPaga += com;
    }

    return {
      kpis: {
        totalAtivas,
        aVencer,
        vencidas,
        premioTotal,
        comissaoTotal,
        comissaoPendente: comissaoPend,
      },
      porTipo: Object.entries(porTipo).map(([tipo, v]) => ({
        tipo, ...v, pendente: v.comissao,
      })),
      porSeguradora: Object.entries(porSeguradora).map(([seguradora, v]) => ({
        seguradora, ...v, pendente: v.comissaoGerada - v.comissaoPaga,
      })),
    };
  });

  // ── GET /admin/policies/expiring ──────────────────────────────────────────
  app.get('/admin/policies/expiring', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const schema = z.object({
      dias: z.coerce.number().int().min(1).max(365).default(30),
    });
    const { dias } = schema.parse(request.query);

    const now  = new Date();
    const limit = new Date(now); limit.setDate(limit.getDate() + dias);

    const records = await prisma.insuranceRecord.findMany({
      where: {
        stage: 'APOLICE_EMITIDA',
        endDate: { gte: now, lte: limit },
      },
      orderBy: { endDate: 'asc' },
      select: {
        id: true, type: true, insurer: true, policyNumber: true,
        customerName: true, customerPhone: true,
        endDate: true, premiumAmount: true, percComissao: true,
        comissaoPaga: true,
      },
    });

    return records.map(r => ({
      ...r,
      diasRestantes: Math.floor((new Date(r.endDate) - now) / (1000 * 60 * 60 * 24)),
      comissaoGerada: Number(r.premiumAmount ?? 0) * Number(r.percComissao ?? 0),
    }));
  });

  // ── GET /admin/policies ───────────────────────────────────────────────────
  app.get('/admin/policies', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const schema = z.object({
      page:         z.coerce.number().int().min(1).default(1),
      limit:        z.coerce.number().int().min(1).max(100).default(20),
      type:         z.string().optional(),
      status:       z.enum(['ACTIVE','EXPIRING_SOON','EXPIRED']).optional(),
      comissaoPaga: z.enum(['PAGA','PENDENTE']).optional(),
      search:       z.string().optional(),
    });
    const { page, limit, type, status, comissaoPaga, search } = schema.parse(request.query);

    const now   = new Date();
    const in30d = new Date(now); in30d.setDate(in30d.getDate() + 30);

    const where = { stage: 'APOLICE_EMITIDA' };

    if (type)         where.type = type;
    if (comissaoPaga) where.comissaoPaga = comissaoPaga;

    // Filtro de status por data de vencimento
    if (status === 'ACTIVE')        where.endDate = { gt: in30d };
    if (status === 'EXPIRING_SOON') where.endDate = { gte: now, lte: in30d };
    if (status === 'EXPIRED')       where.endDate = { lt: now };

    if (search) {
      where.OR = [
        { customerName:  { contains: search, mode: 'insensitive' } },
        { policyNumber:  { contains: search, mode: 'insensitive' } },
        { insurer:       { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [total, records] = await Promise.all([
      prisma.insuranceRecord.count({ where }),
      prisma.insuranceRecord.findMany({
        where, skip, take: limit,
        orderBy: { endDate: 'asc' },
        select: {
          id: true, type: true, insurer: true, policyNumber: true,
          numeroCi: true, tipoEmissao: true,
          customerName: true, customerDocument: true, customerPhone: true,
          startDate: true, endDate: true,
          premiumAmount: true, percComissao: true,
          comissaoPaga: true, dataPagamentoComissao: true,
          notes: true, createdAt: true,
        },
      }),
    ]);

    const data = records.map(r => {
      const end   = r.endDate ? new Date(r.endDate) : null;
      const diff  = end ? Math.floor((end - now) / (1000 * 60 * 60 * 24)) : null;
      const stat  = diff === null ? 'ACTIVE' : diff < 0 ? 'EXPIRED' : diff <= 30 ? 'EXPIRING_SOON' : 'ACTIVE';
      const com   = Number(r.premiumAmount ?? 0) * Number(r.percComissao ?? 0);
      return { ...r, diasRestantes: diff, vigenciaStatus: stat, comissaoGerada: com };
    });

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  });

  // ── POST /admin/policies ──────────────────────────────────────────────────
  app.post('/admin/policies', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const user = request.currentUser;
    const data = policySchema.parse(request.body);

    // Duplicidade de nº de apólice
    const dup = await prisma.insuranceRecord.findUnique({
      where: { policyNumber: data.policyNumber },
    });
    if (dup) return reply.code(409).send({ message: 'Número de apólice já cadastrado.' });

    const customerDocument = data.customerDocument
      ? normalizeDocument(data.customerDocument)
      : '';

    const record = await prisma.insuranceRecord.create({
      data: {
        type:                  data.type,
        stage:                 'APOLICE_EMITIDA',
        insurer:               data.insurer,
        policyNumber:          data.policyNumber,
        numeroCi:              data.numeroCi,
        tipoEmissao:           data.tipoEmissao,
        customerName:          data.customerName,
        customerDocument,
        customerPhone:         data.customerPhone,
        premiumAmount:         data.premiumAmount,
        estimatedCommission:   data.premiumAmount * data.percComissao,
        percComissao:          data.percComissao,
        comissaoPaga:          data.comissaoPaga,
        dataPagamentoComissao: data.dataPagamentoComissao ? new Date(data.dataPagamentoComissao) : null,
        startDate:             new Date(data.startDate),
        endDate:               new Date(data.endDate),
        renewalReminderDays:   30,
        status:                calcStatus(data.endDate),
        notes:                 data.notes,
        sourceType:            'MANUAL',
        createdByUserId:       user.id,
        ownerUserId:           user.id,
      },
    });

    await audit(user.id, 'POLICY_CREATED', 'InsuranceRecord', record.id, {
      type: data.type, insurer: data.insurer, policyNumber: data.policyNumber,
    });

    return reply.code(201).send({ record });
  });

  // ── PATCH /admin/policies/:id ─────────────────────────────────────────────
  app.patch('/admin/policies/:id', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const user = request.currentUser;
    const { id } = request.params;
    const data = updateSchema.parse(request.body);

    const existing = await prisma.insuranceRecord.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ message: 'Apólice não encontrada.' });

    const updates = { ...data };
    if (data.startDate) updates.startDate = new Date(data.startDate);
    if (data.endDate)   { updates.endDate = new Date(data.endDate); updates.status = calcStatus(data.endDate); }
    if (data.dataPagamentoComissao) updates.dataPagamentoComissao = new Date(data.dataPagamentoComissao);
    if (data.premiumAmount && data.percComissao) {
      updates.estimatedCommission = data.premiumAmount * data.percComissao;
    }

    const record = await prisma.insuranceRecord.update({
      where: { id },
      data: updates,
    });

    await audit(user.id, 'POLICY_UPDATED', 'InsuranceRecord', id, data);

    return { record };
  });

  // ── PATCH /admin/policies/:id/mark-paid ───────────────────────────────────
  app.patch('/admin/policies/:id/mark-paid', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const user = request.currentUser;
    const { id } = request.params;
    const schema = z.object({
      dataPagamentoComissao: z.string().datetime().optional(),
    });
    const { dataPagamentoComissao } = schema.parse(request.body ?? {});

    const existing = await prisma.insuranceRecord.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ message: 'Apólice não encontrada.' });

    await prisma.insuranceRecord.update({
      where: { id },
      data: {
        comissaoPaga:          'PAGA',
        dataPagamentoComissao: dataPagamentoComissao
          ? new Date(dataPagamentoComissao)
          : new Date(),
      },
    });

    await audit(user.id, 'POLICY_COMMISSION_PAID', 'InsuranceRecord', id, {});
    return { message: 'Comissão marcada como paga.' };
  });

  // ── DELETE /admin/policies/:id ────────────────────────────────────────────
  app.delete('/admin/policies/:id', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const user = request.currentUser;
    const { id } = request.params;

    const existing = await prisma.insuranceRecord.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ message: 'Apólice não encontrada.' });

    await prisma.insuranceRecord.update({
      where: { id },
      data: { stage: 'CANCELADO', status: 'CANCELED' },
    });

    await audit(user.id, 'POLICY_DELETED', 'InsuranceRecord', id, {});
    return { message: 'Apólice removida.' };
  });
}
