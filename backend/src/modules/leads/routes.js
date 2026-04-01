import { z }     from 'zod';
import { prisma } from '../../lib/prisma.js';
import { tenantWhere, assertTenantAccess, resolveTenantId } from '../../lib/tenant.js';
import { createLead, convertLeadToInsurance, autoAssignLead } from '../../services/lead.service.js';
import { triggerLeadAutomation } from '../../services/automation.service.js';
import { calcRenewalAlertDate, scheduleRenewalNotifications } from '../../lib/insurance.js';

const createSchema = z.object({
  name:            z.string().min(2).max(200),
  phone:           z.string().max(20).optional(),
  email:           z.string().email().optional(),
  source:          z.enum(['AFFILIATE','ORGANIC','CAMPAIGN','WHATSAPP','SITE','INDICATION','RENEWAL','MANUAL']).default('MANUAL'),
  insuranceType:   z.enum(['AUTO','RESIDENCIAL','EMPRESARIAL','VIDA','PREVIDENCIA','SAUDE','ODONTO','VIAGEM','RC','EQUIPAMENTOS','OUTROS']).optional(),
  affiliateId:     z.string().optional(),
  affiliateRefCode:z.string().optional(),
  assignedBrokerId:z.string().optional(),
  notes:           z.string().max(2000).optional(),
});

const convertSchema = z.object({
  type:             z.enum(['AUTO','RESIDENCIAL','EMPRESARIAL','VIDA','PREVIDENCIA','SAUDE','ODONTO','VIAGEM','RC','EQUIPAMENTOS','OUTROS']),
  customerDocument: z.string().min(11),
  premiumAmount:    z.number().positive().optional(),
  startDate:        z.string().datetime().optional(),
  endDate:          z.string().datetime().optional(),
  insurer:          z.string().max(120).optional(),
  notes:            z.string().max(2000).optional(),
});

export default async function leadsRoutes(app) {

  // POST /leads — criar lead
  app.post('/leads', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request, reply) => {
    const user    = request.currentUser;
    const data    = createSchema.parse(request.body);
    const tenantId = resolveTenantId(request);

    // Auto-atribuir ao corretor logado se for BROKER
    if (user.role === 'BROKER' && !data.assignedBrokerId) {
      data.assignedBrokerId = user.id;
    }

    const lead = await createLead({ data, creatorId: user.id, tenantId });
    return reply.code(201).send({ lead });
  });

  // GET /leads — listar com filtros
  app.get('/leads', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request) => {
    const schema = z.object({
      page:     z.coerce.number().int().min(1).default(1),
      limit:    z.coerce.number().int().min(1).max(100).default(20),
      status:   z.string().optional(),
      source:   z.string().optional(),
      brokerId: z.string().optional(),
      search:   z.string().optional(),
    });
    const { page, limit, status, source, brokerId, search } = schema.parse(request.query);
    const skip = (page - 1) * limit;
    const user = request.currentUser;

    // BROKER: apenas seus próprios leads
    const brokerFilter = user.role === 'BROKER' ? { assignedBrokerId: user.id } : {};

    const where = tenantWhere(request, {
      ...brokerFilter,
      ...(status   ? { status }   : {}),
      ...(source   ? { source }   : {}),
      ...(brokerId && user.role !== 'BROKER' ? { assignedBrokerId: brokerId } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    });

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedBroker: { select: { id: true, name: true } },
          affiliate:      { select: { id: true, name: true, refCode: true } },
          _count:         { select: { tasks: true } },
        },
      }),
    ]);

    return { data: leads, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  });

  // GET /leads/:id — detalhe
  app.get('/leads/:id', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request, reply) => {
    const { id } = request.params;
    const user   = request.currentUser;

    const lead = await prisma.lead.findUnique({
      where:   { id },
      include: {
        assignedBroker: { select: { id: true, name: true } },
        affiliate:      { select: { id: true, name: true, refCode: true } },
        tasks:          { orderBy: { dueDate: 'asc' } },
        automationLogs: { orderBy: { createdAt: 'desc' }, take: 10, include: { rule: { select: { name: true } } } },
      },
    });

    if (!lead) return reply.code(404).send({ message: 'Lead nao encontrado' });
    assertTenantAccess(request, lead, reply);

    if (user.role === 'BROKER' && lead.assignedBrokerId !== user.id) {
      return reply.code(403).send({ message: 'Sem permissao para visualizar este lead' });
    }

    // Buscar InsuranceRecord se foi convertido
    let insurance = null;
    if (lead.convertedToId) {
      insurance = await prisma.insuranceRecord.findUnique({
        where:  { id: lead.convertedToId },
        select: { id: true, type: true, stage: true, status: true, premiumAmount: true },
      });
    }

    return { lead, insurance };
  });

  // PATCH /leads/:id — atualizar
  app.patch('/leads/:id', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request, reply) => {
    const { id } = request.params;
    const user   = request.currentUser;

    const schema = z.object({
      name:            z.string().min(2).max(200).optional(),
      phone:           z.string().max(20).optional(),
      email:           z.string().email().optional(),
      status:          z.enum(['NEW','CONTACT_ATTEMPTED','IN_PROGRESS','CONVERTED','LOST','DISQUALIFIED']).optional(),
      notes:           z.string().max(2000).optional(),
      assignedBrokerId:z.string().optional(),
    });
    const data = schema.parse(request.body);

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) return reply.code(404).send({ message: 'Lead nao encontrado' });
    assertTenantAccess(request, lead, reply);

    if (user.role === 'BROKER' && lead.assignedBrokerId !== user.id) {
      return reply.code(403).send({ message: 'Sem permissao' });
    }

    const prevBrokerId = lead.assignedBrokerId;
    const updated = await prisma.lead.update({ where: { id }, data });

    // Disparar automação se lead foi atribuído a novo corretor
    if (data.assignedBrokerId && data.assignedBrokerId !== prevBrokerId) {
      const broker = await prisma.user.findUnique({
        where:  { id: data.assignedBrokerId },
        select: { name: true },
      });
      triggerLeadAutomation('LEAD_ASSIGNED', {
        tenantId: request.tenantId,
        leadId:   id,
        lead:     updated,
        brokerName: broker?.name,
      }).catch(() => {});
    }

    return { lead: updated };
  });

  // POST /leads/:id/convert — converter em InsuranceRecord
  app.post('/leads/:id/convert', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request, reply) => {
    const { id } = request.params;
    const user   = request.currentUser;

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) return reply.code(404).send({ message: 'Lead nao encontrado' });
    assertTenantAccess(request, lead, reply);

    if (user.role === 'BROKER' && lead.assignedBrokerId && lead.assignedBrokerId !== user.id) {
      return reply.code(403).send({ message: 'Sem permissao para converter este lead' });
    }

    const data = convertSchema.parse(request.body);
    const insurance = await convertLeadToInsurance({
      leadId:        id,
      insuranceData: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate:   data.endDate   ? new Date(data.endDate)   : null,
        renewalAlertDate: calcRenewalAlertDate(data.endDate, 30),
      },
      userId:   user.id,
      tenantId: resolveTenantId(request),
    });

    return reply.code(201).send({ insurance, message: 'Lead convertido com sucesso' });
  });

  // POST /leads/:id/assign — atribuir a corretor
  app.post('/leads/:id/assign', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id }     = request.params;
    const { brokerId } = z.object({ brokerId: z.string() }).parse(request.body);

    const [lead, broker] = await Promise.all([
      prisma.lead.findUnique({ where: { id } }),
      prisma.user.findUnique({ where: { id: brokerId }, select: { id: true, name: true, role: true } }),
    ]);

    if (!lead)   return reply.code(404).send({ message: 'Lead nao encontrado' });
    if (!broker) return reply.code(404).send({ message: 'Corretor nao encontrado' });
    assertTenantAccess(request, lead, reply);

    const updated = await prisma.lead.update({
      where: { id },
      data:  { assignedBrokerId: brokerId },
    });

    triggerLeadAutomation('LEAD_ASSIGNED', {
      tenantId:   request.tenantId,
      leadId:     id,
      lead:       updated,
      brokerName: broker.name,
    }).catch(() => {});

    return { lead: updated, broker };
  });

  // POST /leads/:id/auto-assign — distribuição automática
  app.post('/leads/:id/auto-assign', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params;

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) return reply.code(404).send({ message: 'Lead nao encontrado' });

    const broker = await autoAssignLead(id, request.tenantId);
    if (!broker) return reply.code(422).send({ message: 'Nenhum corretor ativo disponivel' });

    return { lead: await prisma.lead.findUnique({ where: { id } }), broker };
  });

  // DELETE /leads/:id — desqualificar (soft delete)
  app.delete('/leads/:id', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params;
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) return reply.code(404).send({ message: 'Lead nao encontrado' });
    assertTenantAccess(request, lead, reply);

    await prisma.lead.update({ where: { id }, data: { status: 'DISQUALIFIED' } });
    return reply.code(204).send();
  });
}
