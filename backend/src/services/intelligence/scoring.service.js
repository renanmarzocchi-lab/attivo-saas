/**
 * Scoring Service — calcula score 0-100 para leads e oportunidades.
 *
 * Score classificação:
 *   80–100 → QUENTE
 *   50–79  → MORNO
 *   <50    → FRIO
 *
 * Persiste score + lossRisk no banco.
 */

import { prisma } from '../../lib/prisma.js';

// ──────────────────────────────────────────────────────
// Pesos por origem do lead
// ──────────────────────────────────────────────────────
const SOURCE_SCORE = {
  RENEWAL:    22,
  AFFILIATE:  18,
  INDICATION: 15,
  WHATSAPP:   12,
  CAMPAIGN:   9,
  SITE:       8,
  ORGANIC:    6,
  MANUAL:     4,
};

// Pesos por stage do InsuranceRecord (avanço no funil)
const STAGE_SCORE = {
  LEAD:             5,
  CONTATO_INICIAL:  15,
  EM_COTACAO:       28,
  COTADO:           42,
  PROPOSTA_ENVIADA: 58,
  PROPOSTA_ACEITA:  78,
  NEGOCIACAO:       65,
  APOLICE_EMITIDA:  100,
  PERDIDO:          0,
  CANCELADO:        0,
};

/**
 * Classificação textual do score.
 */
export function classifyScore(score) {
  if (score >= 80) return 'QUENTE';
  if (score >= 50) return 'MORNO';
  return 'FRIO';
}

/**
 * Calcula score de um Lead.
 * Não persiste — use updateLeadScore() para persistir.
 *
 * @param {Object} lead - objeto Lead com campos básicos
 * @param {Object} [opts]
 * @param {number} [opts.taskCount=0] - número de tarefas
 * @param {number} [opts.automationCount=0] - número de automações disparadas
 */
export function calculateLeadScore(lead, opts = {}) {
  let score = 0;

  // 1. Origem (0-22)
  score += SOURCE_SCORE[lead.source] ?? 4;

  // 2. Completude dos dados (0-15)
  if (lead.phone)         score += 5;
  if (lead.email)         score += 5;
  if (lead.insuranceType) score += 5;

  // 3. Recência — dias desde criação (0-25)
  const daysSince = daysSinceDate(lead.createdAt);
  if      (daysSince < 1)  score += 25;
  else if (daysSince < 3)  score += 20;
  else if (daysSince < 7)  score += 14;
  else if (daysSince < 14) score += 8;
  else if (daysSince < 30) score += 3;
  // > 30 dias sem conversão: 0

  // 4. Status do lead (0-20)
  switch (lead.status) {
    case 'IN_PROGRESS':        score += 20; break;
    case 'CONTACT_ATTEMPTED':  score += 10; break;
    case 'NEW':                score += 5;  break;
    case 'LOST':
    case 'DISQUALIFIED':       score = Math.max(0, score - 20); break;
  }

  // 5. Engajamento — tarefas e automações (0-10)
  const taskCount = opts.taskCount ?? 0;
  if (taskCount > 0) score += Math.min(10, taskCount * 3);

  // 6. Bônus renovação
  if (lead.source === 'RENEWAL') score += 8;

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Calcula score de um InsuranceRecord.
 *
 * @param {Object} record - objeto InsuranceRecord
 * @param {Object} [opts]
 * @param {number} [opts.daysSinceUpdate] - dias desde última atualização
 * @param {number} [opts.taskCount=0]
 */
export function calculateInsuranceScore(record, opts = {}) {
  // Stage é o fator dominante
  let score = STAGE_SCORE[record.stage] ?? 5;

  if (score === 0) return 0; // PERDIDO/CANCELADO

  // Recência — penalidade por inatividade (máx -25)
  const daysSinceUpdate = opts.daysSinceUpdate ?? daysSinceDate(record.updatedAt);
  const penalty = Math.min(25, Math.floor(daysSinceUpdate * 1.2));
  score -= penalty;

  // Completude de dados (0-10)
  if (record.customerEmail) score += 3;
  if (record.customerPhone) score += 3;
  if (record.premiumAmount) score += 4;

  // Proposta/apólice preenchida (0-8)
  if (record.proposalNumber) score += 4;
  if (record.policyNumber)   score += 4;

  // Proximidade de vencimento — renovação urgente (+20)
  if (record.endDate) {
    const daysToEnd = daysUntilDate(record.endDate);
    if (daysToEnd > 0 && daysToEnd <= 30)  score += 20;
    else if (daysToEnd > 0 && daysToEnd <= 60) score += 10;
    else if (daysToEnd < 0)                 score -= 10; // já vencido
  }

  // Status expirado penaliza
  if (record.status === 'EXPIRED')       score -= 15;
  if (record.status === 'EXPIRING_SOON') score += 10;

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Calcula risco de perda para um Lead.
 * @returns {'LOW'|'MEDIUM'|'HIGH'}
 */
export function calculateLeadLossRisk(lead, score) {
  if (lead.status === 'CONVERTED') return 'LOW';
  if (lead.status === 'LOST' || lead.status === 'DISQUALIFIED') return 'HIGH';

  const days = daysSinceDate(lead.updatedAt ?? lead.createdAt);

  if (score < 20)                        return 'HIGH';
  if (score < 40 || days > 21)           return 'MEDIUM';
  if (days > 14 || lead.status === 'CONTACT_ATTEMPTED') return 'MEDIUM';
  return 'LOW';
}

/**
 * Calcula risco de perda para um InsuranceRecord.
 * @returns {'LOW'|'MEDIUM'|'HIGH'}
 */
export function calculateInsuranceLossRisk(record, score) {
  if (record.stage === 'APOLICE_EMITIDA') return 'LOW';
  if (record.stage === 'PERDIDO' || record.stage === 'CANCELADO') return 'HIGH';

  const days = daysSinceDate(record.updatedAt);

  if (score < 20)                              return 'HIGH';
  if (record.stage === 'PROPOSTA_ENVIADA' && days > 5) return 'HIGH';
  if (record.stage === 'NEGOCIACAO'       && days > 7) return 'HIGH';
  if (score < 45 || days > 14)                return 'MEDIUM';
  return 'LOW';
}

/**
 * Recalcula e persiste score + lossRisk de um Lead.
 */
export async function updateLeadScore(leadId) {
  const lead = await prisma.lead.findUnique({
    where:   { id: leadId },
    include: { _count: { select: { tasks: true, automationLogs: true } } },
  });
  if (!lead) return null;

  const score    = calculateLeadScore(lead, { taskCount: lead._count.tasks });
  const lossRisk = calculateLeadLossRisk(lead, score);

  return prisma.lead.update({
    where: { id: leadId },
    data:  { score, lossRisk },
    select: { id: true, score: true, lossRisk: true },
  });
}

/**
 * Recalcula e persiste score + lossRisk de um InsuranceRecord.
 */
export async function updateInsuranceScore(insuranceId) {
  const record = await prisma.insuranceRecord.findUnique({
    where:   { id: insuranceId },
    include: { _count: { select: { tasks: true } } },
  });
  if (!record) return null;

  const daysSinceUpdate = daysSinceDate(record.updatedAt);
  const score    = calculateInsuranceScore(record, { daysSinceUpdate });
  const lossRisk = calculateInsuranceLossRisk(record, score);

  return prisma.insuranceRecord.update({
    where: { id: insuranceId },
    data:  { score, lossRisk },
    select: { id: true, score: true, lossRisk: true },
  });
}

/**
 * Recalcula scores de todos os leads/oportunidades de um tenant (batch).
 * Retorna contagens { leads, insurances }.
 */
export async function recalculateAllScores(tenantId) {
  const tenantFilter = tenantId ? { tenantId } : {};

  const [leads, insurances] = await Promise.all([
    prisma.lead.findMany({
      where: { ...tenantFilter, status: { notIn: ['CONVERTED', 'DISQUALIFIED'] } },
      include: { _count: { select: { tasks: true } } },
    }),
    prisma.insuranceRecord.findMany({
      where: { ...tenantFilter, stage: { notIn: ['APOLICE_EMITIDA', 'PERDIDO', 'CANCELADO'] } },
    }),
  ]);

  // Batch updates em paralelo (chunks de 50 para não sobrecarregar)
  const leadUpdates = leads.map((lead) => {
    const score    = calculateLeadScore(lead, { taskCount: lead._count.tasks });
    const lossRisk = calculateLeadLossRisk(lead, score);
    return prisma.lead.update({ where: { id: lead.id }, data: { score, lossRisk } });
  });

  const insuranceUpdates = insurances.map((record) => {
    const daysSinceUpdate = daysSinceDate(record.updatedAt);
    const score    = calculateInsuranceScore(record, { daysSinceUpdate });
    const lossRisk = calculateInsuranceLossRisk(record, score);
    return prisma.insuranceRecord.update({ where: { id: record.id }, data: { score, lossRisk } });
  });

  await Promise.all([...leadUpdates, ...insuranceUpdates]);

  return { leads: leads.length, insurances: insurances.length };
}

// ──────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────

function daysSinceDate(date) {
  if (!date) return 999;
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
}

function daysUntilDate(date) {
  if (!date) return 999;
  return (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
}
