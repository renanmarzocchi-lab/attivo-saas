/**
 * Automation Service — motor de regras de automação comercial.
 *
 * Fluxo:
 *   Evento (stage change, lead criado, renovação) → triggerAutomations()
 *   → busca regras ativas do tenant → dedup por ruleId+entidade
 *   → cria AutomationLog (PENDING) → enfileira no BullMQ com delay
 *
 * O automation.worker.js processa o job: renderiza template, envia e marca SENT/FAILED.
 */

import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { enqueueAutomation } from '../queues/producers.js';

// Mapa stage → AutomationTrigger
export const STAGE_TRIGGER_MAP = {
  CONTATO_INICIAL:  'STAGE_CHANGED_CONTATO_INICIAL',
  EM_COTACAO:       'STAGE_CHANGED_EM_COTACAO',
  COTADO:           'STAGE_CHANGED_COTADO',
  PROPOSTA_ENVIADA: 'STAGE_CHANGED_PROPOSTA_ENVIADA',
  PROPOSTA_ACEITA:  'STAGE_CHANGED_PROPOSTA_ACEITA',
  NEGOCIACAO:       'STAGE_CHANGED_NEGOCIACAO',
  APOLICE_EMITIDA:  'STAGE_CHANGED_APOLICE_EMITIDA',
  PERDIDO:          'STAGE_CHANGED_PERDIDO',
};

/**
 * Renderiza template substituindo variáveis.
 *
 * Variáveis suportadas:
 *   {{nome}}             — nome do cliente/lead
 *   {{tipo_seguro}}      — tipo do seguro (AUTO, VIDA, etc.)
 *   {{valor}}            — prêmio formatado
 *   {{corretor}}         — nome do corretor
 *   {{data_vencimento}}  — data de vencimento
 */
export function renderAutomationTemplate(template, vars = {}) {
  const fmt = (v) => v ?? '';
  return template
    .replace(/\{\{nome\}\}/g,            fmt(vars.name))
    .replace(/\{\{tipo_seguro\}\}/g,     fmt(vars.insuranceType))
    .replace(/\{\{valor\}\}/g,           vars.premiumAmount
      ? `R$ ${Number(vars.premiumAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : '')
    .replace(/\{\{corretor\}\}/g,        fmt(vars.brokerName))
    .replace(/\{\{data_vencimento\}\}/g, vars.endDate
      ? new Date(vars.endDate).toLocaleDateString('pt-BR')
      : '');
}

/**
 * Dispara automações para um trigger + contexto.
 *
 * @param {string} trigger - AutomationTrigger
 * @param {Object} ctx
 * @param {string|null} ctx.tenantId
 * @param {string|null} [ctx.insuranceId]
 * @param {string|null} [ctx.leadId]
 * @param {Object}      [ctx.vars] - variáveis do template
 */
export async function triggerAutomations(trigger, ctx = {}) {
  const { tenantId, insuranceId, leadId, vars = {} } = ctx;
  const log = logger.child({ service: 'automation', trigger, tenantId, insuranceId, leadId });

  // Busca regras ativas para o trigger + tenant
  const rules = await prisma.automationRule.findMany({
    where: {
      trigger,
      isActive: true,
      ...(tenantId ? { tenantId } : { tenantId: null }),
    },
  });

  if (!rules.length) return;
  log.debug({ count: rules.length }, 'Regras encontradas');

  for (const rule of rules) {
    try {
      // Deduplicação: não enviar se já foi enviado nas últimas 24h para a mesma entidade
      const dedup = await prisma.automationLog.findFirst({
        where: {
          ruleId:      rule.id,
          ...(insuranceId ? { insuranceId } : {}),
          ...(leadId      ? { leadId }      : {}),
          status:      { in: ['PENDING', 'SENT'] },
          createdAt:   { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });
      if (dedup) {
        log.debug({ ruleId: rule.id }, 'Automacao ja disparada recentemente — pulando');
        continue;
      }

      // Resolver phone/email para o log
      const targetPhone = vars.phone ?? vars.customerPhone ?? null;
      const targetEmail = vars.email ?? vars.customerEmail ?? null;

      if (!targetPhone && !targetEmail) {
        log.debug({ ruleId: rule.id }, 'Sem contato disponivel — pulando');
        continue;
      }

      // Cria log PENDING antes de enfileirar (garante rastreabilidade)
      const automationLog = await prisma.automationLog.create({
        data: {
          ruleId:      rule.id,
          leadId:      leadId ?? null,
          insuranceId: insuranceId ?? null,
          targetPhone: rule.channel === 'WHATSAPP' ? targetPhone : null,
          targetEmail: rule.channel === 'EMAIL'    ? targetEmail : null,
          status:      'PENDING',
        },
      });

      const delayMs = rule.delayHours * 60 * 60 * 1000;
      await enqueueAutomation({ ruleId: rule.id, logId: automationLog.id, vars, delayMs });

      log.info({ ruleId: rule.id, logId: automationLog.id, delayHours: rule.delayHours }, 'Automacao enfileirada');
    } catch (err) {
      log.error({ ruleId: rule.id, err }, 'Falha ao enfileirar automacao');
    }
  }
}

/**
 * Atalho: dispara automações após mudança de stage.
 */
export async function triggerStageAutomation(newStage, { tenantId, insuranceId, insurance, brokerName }) {
  const trigger = STAGE_TRIGGER_MAP[newStage];
  if (!trigger) return;

  await triggerAutomations(trigger, {
    tenantId,
    insuranceId,
    vars: {
      name:          insurance?.customerName,
      insuranceType: insurance?.type,
      premiumAmount: insurance?.premiumAmount,
      phone:         insurance?.customerPhone,
      email:         insurance?.customerEmail,
      endDate:       insurance?.endDate,
      brokerName,
    },
  });
}

/**
 * Atalho: dispara automações para lead criado/atribuído.
 */
export async function triggerLeadAutomation(trigger, { tenantId, leadId, lead, brokerName }) {
  await triggerAutomations(trigger, {
    tenantId,
    leadId,
    vars: {
      name:          lead?.name,
      phone:         lead?.phone,
      email:         lead?.email,
      insuranceType: lead?.insuranceType,
      brokerName,
    },
  });
}

/**
 * Atalho: dispara automações de renovação.
 */
export async function triggerRenewalAutomation(trigger, { tenantId, insuranceId, insurance, brokerName }) {
  await triggerAutomations(trigger, {
    tenantId,
    insuranceId,
    vars: {
      name:          insurance?.customerName,
      insuranceType: insurance?.type,
      premiumAmount: insurance?.premiumAmount,
      phone:         insurance?.customerPhone,
      email:         insurance?.customerEmail,
      endDate:       insurance?.endDate,
      brokerName,
    },
  });
}
