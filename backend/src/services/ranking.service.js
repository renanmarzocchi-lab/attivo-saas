/**
 * Ranking Service — agrega métricas de produção dos corretores.
 *
 * Métricas por corretor no período:
 *   - totalPolicies    — apólices emitidas (stage APOLICE_EMITIDA)
 *   - totalPremium     — soma de prêmios
 *   - totalLeads       — leads atribuídos
 *   - convertedLeads   — leads convertidos
 *   - conversionRate   — converted / total (%)
 *   - avgTicket        — totalPremium / totalPolicies
 *   - tasksCompleted   — tarefas concluídas no período
 */

import { prisma } from '../lib/prisma.js';

/**
 * Retorna ranking de corretores para o período e tenant informados.
 *
 * @param {Object} opts
 * @param {Date}   opts.from        - início do período
 * @param {Date}   opts.to          - fim do período
 * @param {string|null} opts.tenantId
 * @param {number} opts.limit       - máximo de corretores retornados
 */
export async function getBrokerRanking({ from, to, tenantId, limit = 20 }) {
  const tenantFilter = tenantId ? { tenantId } : {};

  // Busca corretores ativos do tenant
  const brokers = await prisma.user.findMany({
    where: { role: 'BROKER', status: 'ACTIVE', ...tenantFilter },
    select: { id: true, name: true, email: true },
    take: 200,
  });

  if (!brokers.length) return [];

  const brokerIds = brokers.map((b) => b.id);

  const dateFilter = { gte: from, lte: to };

  // Executa todas as agregações em paralelo
  const [
    policiesAgg,
    leadsAgg,
    convertedLeadsAgg,
    tasksAgg,
  ] = await Promise.all([
    // Apólices emitidas: InsuranceRecord com stage APOLICE_EMITIDA criados no período
    prisma.insuranceRecord.groupBy({
      by:    ['ownerUserId'],
      where: {
        ownerUserId: { in: brokerIds },
        stage:       'APOLICE_EMITIDA',
        createdAt:   dateFilter,
        ...tenantFilter,
      },
      _count: { id: true },
      _sum:   { premiumAmount: true },
    }),

    // Total de leads atribuídos no período
    prisma.lead.groupBy({
      by:    ['assignedBrokerId'],
      where: {
        assignedBrokerId: { in: brokerIds },
        createdAt:        dateFilter,
        ...tenantFilter,
      },
      _count: { id: true },
    }),

    // Leads convertidos no período
    prisma.lead.groupBy({
      by:    ['assignedBrokerId'],
      where: {
        assignedBrokerId: { in: brokerIds },
        status:           'CONVERTED',
        createdAt:        dateFilter,
        ...tenantFilter,
      },
      _count: { id: true },
    }),

    // Tarefas concluídas no período
    prisma.task.groupBy({
      by:    ['assignedToId'],
      where: {
        assignedToId: { in: brokerIds },
        completed:    true,
        completedAt:  dateFilter,
        ...tenantFilter,
      },
      _count: { id: true },
    }),
  ]);

  // Cria mapas para lookup O(1)
  const policiesMap        = new Map(policiesAgg.map((r) => [r.ownerUserId, r]));
  const leadsMap           = new Map(leadsAgg.map((r) => [r.assignedBrokerId, r._count.id]));
  const convertedLeadsMap  = new Map(convertedLeadsAgg.map((r) => [r.assignedBrokerId, r._count.id]));
  const tasksMap           = new Map(tasksAgg.map((r) => [r.assignedToId, r._count.id]));

  // Constrói ranking
  const ranking = brokers.map((broker) => {
    const pol            = policiesMap.get(broker.id);
    const totalPolicies  = pol?._count?.id ?? 0;
    const totalPremium   = Number(pol?._sum?.premiumAmount ?? 0);
    const totalLeads     = leadsMap.get(broker.id) ?? 0;
    const convertedLeads = convertedLeadsMap.get(broker.id) ?? 0;
    const tasksCompleted = tasksMap.get(broker.id) ?? 0;

    const conversionRate = totalLeads > 0
      ? Math.round((convertedLeads / totalLeads) * 100 * 10) / 10
      : 0;

    const avgTicket = totalPolicies > 0
      ? Math.round(totalPremium / totalPolicies)
      : 0;

    return {
      broker,
      totalPolicies,
      totalPremium,
      totalLeads,
      convertedLeads,
      conversionRate,
      avgTicket,
      tasksCompleted,
      score: totalPremium, // ordenação principal por prêmio total
    };
  });

  // Ordena por score decrescente e adiciona posição
  ranking.sort((a, b) => b.score - a.score);

  return ranking.slice(0, limit).map((r, i) => ({
    position: i + 1,
    ...r,
  }));
}

/**
 * Série temporal de apólices emitidas por mês (últimos N meses).
 */
export async function getPremiumTimeSeries({ tenantId, months = 6 }) {
  const tenantFilter = tenantId ? { tenantId } : {};
  const from = new Date();
  from.setMonth(from.getMonth() - months);
  from.setDate(1);
  from.setHours(0, 0, 0, 0);

  const records = await prisma.insuranceRecord.findMany({
    where: {
      stage:     'APOLICE_EMITIDA',
      createdAt: { gte: from },
      ...tenantFilter,
    },
    select: { createdAt: true, premiumAmount: true },
  });

  // Agrupa por YYYY-MM
  const byMonth = {};
  for (const r of records) {
    const key = r.createdAt.toISOString().slice(0, 7);
    if (!byMonth[key]) byMonth[key] = { month: key, count: 0, premium: 0 };
    byMonth[key].count++;
    byMonth[key].premium += Number(r.premiumAmount ?? 0);
  }

  return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
}
