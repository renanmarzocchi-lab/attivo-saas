/**
 * Insights Service — gera insights executivos para o dashboard.
 *
 * getCommercialInsights() retorna:
 *   - leads esquecidos
 *   - oportunidades quentes
 *   - corretores com baixa performance
 *   - taxa de conversão por etapa
 *   - gargalos do pipeline
 *   - alertas críticos pendentes
 */

import { prisma } from '../../lib/prisma.js';

/**
 * @param {Object} opts
 * @param {string|null} opts.tenantId
 * @param {number} [opts.limit=10]
 */
export async function getCommercialInsights({ tenantId, limit = 10 } = {}) {
  const tf = tenantId ? { tenantId } : {};

  const [
    forgottenLeads,
    hotOpportunities,
    lowPerfBrokers,
    conversionByStage,
    pipelineBottlenecks,
    criticalAlerts,
    scoreDistribution,
    weeklyTrend,
  ] = await Promise.all([
    getForgottenLeads(tf, limit),
    getHotOpportunities(tf, limit),
    getLowPerformanceBrokers(tf),
    getConversionByStage(tf),
    getPipelineBottlenecks(tf),
    getCriticalAlerts(tf, limit),
    getScoreDistribution(tf),
    getWeeklyTrend(tf),
  ]);

  return {
    forgottenLeads,
    hotOpportunities,
    lowPerfBrokers,
    conversionByStage,
    pipelineBottlenecks,
    criticalAlerts,
    scoreDistribution,
    weeklyTrend,
    generatedAt: new Date().toISOString(),
  };
}

// ── Leads esquecidos (> 7 dias sem atividade, não convertidos) ────

async function getForgottenLeads(tf, limit) {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return prisma.lead.findMany({
    where: {
      ...tf,
      status:    { in: ['NEW', 'IN_PROGRESS', 'CONTACT_ATTEMPTED'] },
      updatedAt: { lt: cutoff },
    },
    orderBy: { score: 'desc' },
    take:    limit,
    select:  {
      id: true, name: true, phone: true, email: true,
      source: true, status: true, score: true, lossRisk: true,
      insuranceType: true, updatedAt: true,
      assignedBroker: { select: { id: true, name: true } },
    },
  });
}

// ── Oportunidades quentes (score alto, não fechadas) ─────────────

async function getHotOpportunities(tf, limit) {
  const [leads, insurances] = await Promise.all([
    prisma.lead.findMany({
      where: { ...tf, score: { gte: 70 }, status: { in: ['NEW', 'IN_PROGRESS', 'CONTACT_ATTEMPTED'] } },
      orderBy: { score: 'desc' },
      take:    Math.ceil(limit / 2),
      select:  {
        id: true, name: true, phone: true, email: true,
        source: true, status: true, score: true, insuranceType: true,
        assignedBroker: { select: { id: true, name: true } },
      },
    }),
    prisma.insuranceRecord.findMany({
      where: {
        ...tf,
        score: { gte: 60 },
        stage: { in: ['PROPOSTA_ENVIADA', 'PROPOSTA_ACEITA', 'NEGOCIACAO', 'COTADO'] },
      },
      orderBy: { score: 'desc' },
      take:    Math.ceil(limit / 2),
      select:  {
        id: true, customerName: true, customerPhone: true,
        type: true, stage: true, score: true, premiumAmount: true,
        owner: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    leads:      leads.map((l) => ({ ...l, entityType: 'LEAD' })),
    insurances: insurances.map((r) => ({ ...r, entityType: 'INSURANCE' })),
  };
}

// ── Corretores com baixa performance (últimos 30 dias) ────────────

async function getLowPerformanceBrokers(tf) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const brokers = await prisma.user.findMany({
    where: { ...(tf.tenantId ? { tenantId: tf.tenantId } : {}), role: 'BROKER', status: 'ACTIVE' },
    select: {
      id: true, name: true,
      ownedInsurances: {
        where: { createdAt: { gte: since } },
        select: { id: true, stage: true },
      },
      assignedLeads: {
        where: { createdAt: { gte: since } },
        select: { id: true, status: true },
      },
    },
  });

  return brokers
    .map((b) => {
      const policies  = b.ownedInsurances.filter((r) => r.stage === 'APOLICE_EMITIDA').length;
      const totalLeads = b.assignedLeads.length;
      const converted  = b.assignedLeads.filter((l) => l.status === 'CONVERTED').length;
      const convRate   = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;

      return { id: b.id, name: b.name, policies, totalLeads, converted, convRate };
    })
    .filter((b) => b.policies === 0 && b.totalLeads > 0) // sem emissão no período
    .sort((a, b) => a.convRate - b.convRate)
    .slice(0, 5);
}

// ── Taxa de conversão por etapa do funil ─────────────────────────

async function getConversionByStage(tf) {
  const stages = [
    'CONTATO_INICIAL', 'EM_COTACAO', 'COTADO',
    'PROPOSTA_ENVIADA', 'PROPOSTA_ACEITA', 'NEGOCIACAO', 'APOLICE_EMITIDA',
  ];

  const counts = await prisma.insuranceRecord.groupBy({
    by:    ['stage'],
    where: { ...tf, stage: { in: [...stages, 'PERDIDO'] } },
    _count: { id: true },
  });

  const map = Object.fromEntries(counts.map((c) => [c.stage, c._count.id]));
  const total = stages.reduce((s, st) => s + (map[st] ?? 0), 0);
  const lost  = map['PERDIDO'] ?? 0;

  return stages.map((stage, i) => {
    const count     = map[stage] ?? 0;
    const nextCount = i < stages.length - 1 ? (map[stages[i + 1]] ?? 0) : count;
    const rate      = count > 0 ? Math.round((nextCount / count) * 100) : null;
    return { stage, count, conversionToNext: rate };
  }).concat([{ stage: 'PERDIDO', count: lost, conversionToNext: null }]);
}

// ── Gargalos do pipeline (etapas com mais registros parados) ──────

async function getPipelineBottlenecks(tf) {
  const cutoff = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

  const stuck = await prisma.insuranceRecord.groupBy({
    by:    ['stage'],
    where: {
      ...tf,
      stage:     { in: ['EM_COTACAO', 'COTADO', 'PROPOSTA_ENVIADA', 'NEGOCIACAO'] },
      updatedAt: { lt: cutoff },
    },
    _count: { id: true },
    _sum:   { premiumAmount: true },
  });

  return stuck
    .sort((a, b) => b._count.id - a._count.id)
    .map((s) => ({
      stage:        s.stage,
      stuckCount:   s._count.id,
      totalPremium: Number(s._sum.premiumAmount ?? 0),
    }));
}

// ── Alertas críticos pendentes ────────────────────────────────────

async function getCriticalAlerts(tf, limit) {
  return prisma.alert.findMany({
    where: {
      ...(tf.tenantId ? { tenantId: tf.tenantId } : {}),
      severity:   { in: ['CRITICAL', 'WARNING'] },
      isRead:     false,
      resolvedAt: null,
    },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    take:    limit,
    include: {
      lead:      { select: { id: true, name: true } },
      insurance: { select: { id: true, customerName: true } },
      broker:    { select: { id: true, name: true } },
    },
  });
}

// ── Distribuição de scores ────────────────────────────────────────

async function getScoreDistribution(tf) {
  const [leads, insurances] = await Promise.all([
    prisma.lead.groupBy({
      by:    ['lossRisk'],
      where: { ...tf, status: { notIn: ['CONVERTED', 'DISQUALIFIED', 'LOST'] } },
      _count: { id: true },
    }),
    prisma.insuranceRecord.groupBy({
      by:    ['lossRisk'],
      where: { ...tf, stage: { notIn: ['APOLICE_EMITIDA', 'PERDIDO', 'CANCELADO'] } },
      _count: { id: true },
    }),
  ]);

  const toMap = (arr) => Object.fromEntries(arr.map((r) => [r.lossRisk, r._count.id]));
  return { leads: toMap(leads), insurances: toMap(insurances) };
}

// ── Tendência semanal (últimas 4 semanas) ─────────────────────────

async function getWeeklyTrend(tf) {
  const weeks = [];
  for (let i = 3; i >= 0; i--) {
    const from = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    const to   = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);

    const [newLeads, converted, policies] = await Promise.all([
      prisma.lead.count({ where: { ...tf, createdAt: { gte: from, lt: to } } }),
      prisma.lead.count({ where: { ...tf, status: 'CONVERTED', updatedAt: { gte: from, lt: to } } }),
      prisma.insuranceRecord.count({ where: { ...tf, stage: 'APOLICE_EMITIDA', updatedAt: { gte: from, lt: to } } }),
    ]);

    weeks.push({
      week:      `W-${i}`,
      from:      from.toISOString().slice(0, 10),
      to:        to.toISOString().slice(0, 10),
      newLeads,
      converted,
      policies,
    });
  }
  return weeks;
}
