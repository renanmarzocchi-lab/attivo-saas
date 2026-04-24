/**
 * Lead Service — lógica de negócio de leads comerciais.
 */

import { prisma }          from '../lib/prisma.js';
import { audit }           from '../lib/audit.js';
import { triggerLeadAutomation } from './automation.service.js';

/**
 * Cria um lead e dispara automações de boas-vindas.
 */
export async function createLead({ data, creatorId, tenantId }) {
  const lead = await prisma.lead.create({
    data: {
      ...data,
      tenantId: tenantId ?? null,
    },
  });

  await audit(creatorId, 'LEAD_CREATED', 'Lead', lead.id, {
    source: data.source,
    assignedBrokerId: data.assignedBrokerId,
  });

  // Disparar automação LEAD_CREATED
  const broker = data.assignedBrokerId
    ? await prisma.user.findUnique({ where: { id: data.assignedBrokerId }, select: { name: true } })
    : null;

  triggerLeadAutomation('LEAD_CREATED', {
    tenantId,
    leadId: lead.id,
    lead,
    brokerName: broker?.name,
  }).catch(() => {}); // fire and forget

  return lead;
}

/**
 * Distribui lead para um corretor (round-robin entre corretores ativos do tenant).
 */
export async function autoAssignLead(leadId, tenantId) {
  const brokers = await prisma.user.findMany({
    where: {
      role:     'BROKER',
      status:   'ACTIVE',
      ...(tenantId ? { tenantId } : {}),
    },
    orderBy: { createdAt: 'asc' },
    select:  { id: true, name: true },
  });

  if (!brokers.length) return null;

  // Count leads per broker and pick the one with fewest
  const counts = await prisma.lead.groupBy({
    by:    ['assignedBrokerId'],
    where: {
      assignedBrokerId: { in: brokers.map((b) => b.id) },
      status:           { notIn: ['LOST', 'DISQUALIFIED', 'CONVERTED'] },
    },
    _count: { id: true },
  });

  const countMap = Object.fromEntries(counts.map((c) => [c.assignedBrokerId, c._count.id]));
  const broker   = brokers.reduce((min, b) => {
    const count = countMap[b.id] ?? 0;
    return count < (countMap[min.id] ?? 0) ? b : min;
  }, brokers[0]);

  await prisma.lead.update({
    where: { id: leadId },
    data:  { assignedBrokerId: broker.id },
  });

  return broker;
}

/**
 * Converte lead em InsuranceRecord.
 * Atualiza o lead como CONVERTED e cria o registro de seguro.
 */
export async function convertLeadToInsurance({ leadId, insuranceData, userId, tenantId }) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw Object.assign(new Error('Lead nao encontrado'), { statusCode: 404 });
  if (lead.status === 'CONVERTED') throw Object.assign(new Error('Lead ja foi convertido'), { statusCode: 409 });

  const insurance = await prisma.$transaction(async (tx) => {
    const record = await tx.insuranceRecord.create({
      data: {
        ...insuranceData,
        tenantId,
        leadId,
        sourceType:      lead.source === 'AFFILIATE' ? 'AFFILIATE' : 'MANUAL',
        affiliateId:     lead.affiliateId ?? null,
        refCode:         lead.affiliateRefCode ?? null,
        customerName:    insuranceData.customerName ?? lead.name,
        customerEmail:   insuranceData.customerEmail ?? lead.email ?? null,
        customerPhone:   insuranceData.customerPhone ?? lead.phone ?? null,
        createdByUserId: userId,
        ownerUserId:     lead.assignedBrokerId ?? userId,
        stage:           'EM_COTACAO', // Lead convertido começa em cotação
      },
    });

    await tx.lead.update({
      where: { id: leadId },
      data:  { status: 'CONVERTED', convertedToId: record.id },
    });

    return record;
  });

  await audit(userId, 'LEAD_CONVERTED', 'Lead', leadId, { insuranceId: insurance.id });
  return insurance;
}
