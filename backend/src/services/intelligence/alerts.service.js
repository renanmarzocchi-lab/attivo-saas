/**
 * Alerts Service — detecta problemas e cria alertas inteligentes.
 *
 * Tipos de alerta:
 *   LEAD_STALE           — lead parado sem atividade
 *   PROPOSAL_NO_RESPONSE — proposta enviada sem resposta
 *   TASK_OVERDUE         — tarefa vencida
 *   BROKER_INACTIVE      — corretor sem atividade
 *   PIPELINE_STUCK       — etapa travada há muito tempo
 *   RENEWAL_RISK         — renovação próxima sem ação
 *   HIGH_SCORE_NO_ACTION — lead quente sem follow-up
 *   LOSS_RISK_HIGH       — alto risco de perda detectado
 */

import { prisma }  from '../../lib/prisma.js';
import { logger }  from '../../lib/logger.js';

const log = logger.child({ service: 'alerts' });

/**
 * Executa varredura completa de alertas para um tenant.
 * Idempotente: não cria duplicatas para o mesmo alerta no mesmo dia.
 *
 * @param {string|null} tenantId
 * @returns {Promise<{ created: number, skipped: number }>}
 */
export async function runAlertScan(tenantId) {
  const tf = tenantId ? { tenantId } : {};
  let created = 0;
  let skipped = 0;

  const results = await Promise.all([
    detectStaleLeads(tf),
    detectProposalNoResponse(tf),
    detectOverdueTasks(tf),
    detectBrokerInactivity(tf),
    detectPipelineStuck(tf),
    detectRenewalRisk(tf),
    detectHighScoreNoAction(tf),
    detectLossRisk(tf),
  ]);

  for (const batch of results) {
    for (const r of batch) {
      created += r.created;
      skipped += r.skipped;
    }
  }

  log.info({ tenantId, created, skipped }, 'Alert scan concluido');
  return { created, skipped };
}

// ── Detectores individuais ────────────────────────────

async function detectStaleLeads(tf) {
  const cutoff = daysAgo(7);
  const leads = await prisma.lead.findMany({
    where: {
      ...tf,
      status:    { in: ['NEW', 'IN_PROGRESS', 'CONTACT_ATTEMPTED'] },
      updatedAt: { lt: cutoff },
    },
    select: { id: true, name: true, assignedBrokerId: true, tenantId: true, updatedAt: true },
  });

  return Promise.all(leads.map((lead) => upsertAlert({
    tenantId:  lead.tenantId,
    type:      'LEAD_STALE',
    severity:  'WARNING',
    title:     `Lead parado: ${lead.name}`,
    message:   `Lead ${lead.name} sem atividade há ${Math.floor(daysSince(lead.updatedAt))} dias.`,
    leadId:    lead.id,
    brokerId:  lead.assignedBrokerId,
    dedupeKey: `LEAD_STALE-${lead.id}`,
  })));
}

async function detectProposalNoResponse(tf) {
  const cutoff = daysAgo(3);
  const records = await prisma.insuranceRecord.findMany({
    where: {
      ...tf,
      stage:     'PROPOSTA_ENVIADA',
      updatedAt: { lt: cutoff },
    },
    select: { id: true, customerName: true, ownerUserId: true, tenantId: true, updatedAt: true },
  });

  return Promise.all(records.map((r) => upsertAlert({
    tenantId:    r.tenantId,
    type:        'PROPOSAL_NO_RESPONSE',
    severity:    daysSince(r.updatedAt) > 7 ? 'CRITICAL' : 'WARNING',
    title:       `Proposta sem resposta: ${r.customerName}`,
    message:     `Proposta enviada para ${r.customerName} há ${Math.floor(daysSince(r.updatedAt))} dias sem resposta.`,
    insuranceId: r.id,
    brokerId:    r.ownerUserId,
    dedupeKey:   `PROPOSAL_NO_RESPONSE-${r.id}`,
  })));
}

async function detectOverdueTasks(tf) {
  const cutoff = daysAgo(0); // hoje
  const tasks = await prisma.task.findMany({
    where: {
      ...tf,
      completed: false,
      dueDate:   { lt: cutoff },
    },
    select: { id: true, title: true, userId: true, tenantId: true, dueDate: true, insuranceId: true, leadId: true },
  });

  return Promise.all(tasks.map((t) => upsertAlert({
    tenantId:    t.tenantId,
    type:        'TASK_OVERDUE',
    severity:    daysSince(t.dueDate) > 3 ? 'CRITICAL' : 'WARNING',
    title:       `Tarefa vencida: ${t.title}`,
    message:     `Tarefa "${t.title}" venceu há ${Math.floor(daysSince(t.dueDate))} dia(s).`,
    insuranceId: t.insuranceId,
    leadId:      t.leadId,
    brokerId:    t.userId,
    dedupeKey:   `TASK_OVERDUE-${t.id}`,
  })));
}

async function detectBrokerInactivity(tf) {
  const cutoff = daysAgo(5);
  // Corretores que não atualizaram nenhum lead/insurance nos últimos 5 dias
  const brokers = await prisma.user.findMany({
    where: { ...(tf.tenantId ? { tenantId: tf.tenantId } : {}), role: 'BROKER', status: 'ACTIVE' },
    select: {
      id: true, name: true, tenantId: true,
      ownedInsurances: {
        where: { updatedAt: { gte: cutoff } },
        select: { id: true },
        take: 1,
      },
      assignedLeads: {
        where: { updatedAt: { gte: cutoff } },
        select: { id: true },
        take: 1,
      },
    },
  });

  const inactive = brokers.filter(
    (b) => b.ownedInsurances.length === 0 && b.assignedLeads.length === 0
  );

  return Promise.all(inactive.map((b) => upsertAlert({
    tenantId: b.tenantId,
    type:     'BROKER_INACTIVE',
    severity: 'INFO',
    title:    `Corretor inativo: ${b.name}`,
    message:  `Corretor ${b.name} não registrou atividade nos últimos 5 dias.`,
    brokerId: b.id,
    dedupeKey:`BROKER_INACTIVE-${b.id}`,
  })));
}

async function detectPipelineStuck(tf) {
  const cutoff = daysAgo(14);
  const records = await prisma.insuranceRecord.findMany({
    where: {
      ...tf,
      stage:     { in: ['EM_COTACAO', 'COTADO', 'NEGOCIACAO'] },
      updatedAt: { lt: cutoff },
    },
    select: { id: true, customerName: true, stage: true, ownerUserId: true, tenantId: true, updatedAt: true },
  });

  return Promise.all(records.map((r) => upsertAlert({
    tenantId:    r.tenantId,
    type:        'PIPELINE_STUCK',
    severity:    'WARNING',
    title:       `Pipeline travado: ${r.customerName}`,
    message:     `Oportunidade com ${r.customerName} parada em "${r.stage}" há ${Math.floor(daysSince(r.updatedAt))} dias.`,
    insuranceId: r.id,
    brokerId:    r.ownerUserId,
    dedupeKey:   `PIPELINE_STUCK-${r.id}`,
  })));
}

async function detectRenewalRisk(tf) {
  const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const records = await prisma.insuranceRecord.findMany({
    where: {
      ...tf,
      stage:   'APOLICE_EMITIDA',
      status:  { in: ['ACTIVE', 'EXPIRING_SOON'] },
      endDate: { lte: in60Days, gte: new Date() },
    },
    select: { id: true, customerName: true, ownerUserId: true, tenantId: true, endDate: true, type: true },
  });

  return Promise.all(records.map((r) => {
    const days = Math.ceil((new Date(r.endDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    return upsertAlert({
      tenantId:    r.tenantId,
      type:        'RENEWAL_RISK',
      severity:    days <= 30 ? 'CRITICAL' : 'WARNING',
      title:       `Renovação em ${days} dias: ${r.customerName}`,
      message:     `Apólice de ${r.customerName} (${r.type}) vence em ${days} dias. Inicie a renovação.`,
      insuranceId: r.id,
      brokerId:    r.ownerUserId,
      dedupeKey:   `RENEWAL_RISK-${r.id}-${days <= 30 ? '30' : '60'}`,
    });
  }));
}

async function detectHighScoreNoAction(tf) {
  // Leads quentes (score >= 70) sem atividade recente
  const cutoff = daysAgo(2);
  const leads = await prisma.lead.findMany({
    where: {
      ...tf,
      score:     { gte: 70 },
      status:    { in: ['NEW', 'CONTACT_ATTEMPTED'] },
      updatedAt: { lt: cutoff },
    },
    select: { id: true, name: true, score: true, assignedBrokerId: true, tenantId: true },
  });

  return Promise.all(leads.map((l) => upsertAlert({
    tenantId: l.tenantId,
    type:     'HIGH_SCORE_NO_ACTION',
    severity: 'CRITICAL',
    title:    `Lead QUENTE sem contato: ${l.name}`,
    message:  `Lead ${l.name} com score ${l.score} (QUENTE) sem ação há 2+ dias. Ação imediata recomendada.`,
    leadId:   l.id,
    brokerId: l.assignedBrokerId,
    dedupeKey:`HIGH_SCORE_NO_ACTION-${l.id}`,
  })));
}

async function detectLossRisk(tf) {
  const [leads, insurances] = await Promise.all([
    prisma.lead.findMany({
      where: { ...tf, lossRisk: 'HIGH', status: { in: ['IN_PROGRESS', 'CONTACT_ATTEMPTED'] } },
      select: { id: true, name: true, assignedBrokerId: true, tenantId: true },
    }),
    prisma.insuranceRecord.findMany({
      where: { ...tf, lossRisk: 'HIGH', stage: { in: ['PROPOSTA_ENVIADA', 'NEGOCIACAO', 'PROPOSTA_ACEITA'] } },
      select: { id: true, customerName: true, ownerUserId: true, tenantId: true },
    }),
  ]);

  const leadAlerts = leads.map((l) => upsertAlert({
    tenantId: l.tenantId,
    type:     'LOSS_RISK_HIGH',
    severity: 'CRITICAL',
    title:    `Alto risco de perda: ${l.name}`,
    message:  `Lead ${l.name} com alto risco de perda. Ação imediata necessária.`,
    leadId:   l.id,
    brokerId: l.assignedBrokerId,
    dedupeKey:`LOSS_RISK_LEAD-${l.id}`,
  }));

  const insAlerts = insurances.map((r) => upsertAlert({
    tenantId:    r.tenantId,
    type:        'LOSS_RISK_HIGH',
    severity:    'CRITICAL',
    title:       `Alto risco de perda: ${r.customerName}`,
    message:     `Oportunidade com ${r.customerName} com alto risco de perda.`,
    insuranceId: r.id,
    brokerId:    r.ownerUserId,
    dedupeKey:   `LOSS_RISK_INS-${r.id}`,
  }));

  return Promise.all([...leadAlerts, ...insAlerts]);
}

// ── Upsert helper — evita duplicatas ─────────────────

/**
 * Cria ou ignora alerta idempotente por dedupeKey (baseado em title+brokerId+tipo no dia).
 * @returns {{ created: number, skipped: number }}
 */
async function upsertAlert({ tenantId, type, severity, title, message, leadId, insuranceId, brokerId, dedupeKey }) {
  try {
    // Verifica se já existe alerta não resolvido com a mesma chave criado hoje
    const existing = await prisma.alert.findFirst({
      where: {
        tenantId: tenantId ?? null,
        type,
        ...(leadId      ? { leadId }      : {}),
        ...(insuranceId ? { insuranceId } : {}),
        ...(brokerId    ? { brokerId }    : {}),
        resolvedAt: null,
        createdAt:  { gte: daysAgo(1) },
      },
    });

    if (existing) return { created: 0, skipped: 1 };

    await prisma.alert.create({
      data: {
        tenantId:   tenantId ?? null,
        type,
        severity,
        title,
        message,
        leadId:     leadId ?? null,
        insuranceId:insuranceId ?? null,
        brokerId:   brokerId ?? null,
      },
    });
    return { created: 1, skipped: 0 };
  } catch (err) {
    log.error({ err, type, dedupeKey }, 'Erro ao criar alerta');
    return { created: 0, skipped: 1 };
  }
}

// ── Helpers ──────────────────────────────────────────

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function daysSince(date) {
  if (!date) return 0;
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
}
