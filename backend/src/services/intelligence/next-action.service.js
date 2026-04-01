/**
 * Next Best Action (NBA) Service — sugere a próxima ação ideal para o corretor.
 *
 * Retorna:
 *   actionType   — código da ação
 *   title        — título curto
 *   description  — descrição detalhada
 *   priority     — URGENT | HIGH | MEDIUM | LOW
 *   deadline     — Date sugerida para execução
 *   channel      — WHATSAPP | EMAIL | PHONE | NONE
 */

const DAYS = 24 * 60 * 60 * 1000;

// ── Lead NBA ──────────────────────────────────────────

/**
 * Retorna a próxima melhor ação para um Lead.
 *
 * @param {Object} lead
 * @param {Object} [ctx]
 * @param {number} [ctx.score=0]
 * @param {number} [ctx.overdueTasks=0]
 */
export function getLeadNextAction(lead, ctx = {}) {
  const { score = 0, overdueTasks = 0 } = ctx;
  const daysSinceCreated = daysSince(lead.createdAt);
  const daysSinceUpdated = daysSince(lead.updatedAt ?? lead.createdAt);

  // Lead desqualificado/perdido — nenhuma ação
  if (lead.status === 'LOST' || lead.status === 'DISQUALIFIED') {
    return null;
  }

  // Lead já convertido
  if (lead.status === 'CONVERTED') {
    return {
      actionType:  'CONVERTED',
      title:       'Lead convertido',
      description: 'Este lead foi convertido em seguro.',
      priority:    'LOW',
      deadline:    null,
      channel:     'NONE',
    };
  }

  // Tarefas vencidas — primeiro resolver isso
  if (overdueTasks > 0) {
    return {
      actionType:  'COMPLETE_OVERDUE_TASK',
      title:       `${overdueTasks} tarefa(s) vencida(s)`,
      description: `Você tem ${overdueTasks} tarefa(s) vencida(s) para este lead. Resolva antes de avançar.`,
      priority:    'URGENT',
      deadline:    new Date(),
      channel:     'NONE',
    };
  }

  // Novo lead (< 4h) — contato imediato
  if (lead.status === 'NEW' && daysSinceCreated < 0.17) {
    return {
      actionType:  'IMMEDIATE_CONTACT',
      title:       'Contato imediato',
      description: `Lead recente de ${lead.name}. Entre em contato nos próximos 30 minutos para maximizar chances de conversão.`,
      priority:    'URGENT',
      deadline:    new Date(Date.now() + 30 * 60 * 1000),
      channel:     lead.phone ? 'WHATSAPP' : 'EMAIL',
    };
  }

  // Lead novo sem contato há > 1 dia
  if (lead.status === 'NEW' && daysSinceCreated > 1) {
    return {
      actionType:  'FIRST_CONTACT',
      title:       'Primeiro contato',
      description: `Lead ${lead.name} aguardando contato há ${Math.floor(daysSinceCreated)} dia(s). Entre em contato hoje.`,
      priority:    daysSinceCreated > 3 ? 'URGENT' : 'HIGH',
      deadline:    new Date(),
      channel:     lead.phone ? 'WHATSAPP' : 'EMAIL',
    };
  }

  // Em andamento há muito tempo sem atualização
  if (lead.status === 'IN_PROGRESS' && daysSinceUpdated > 7) {
    return {
      actionType:  'REACTIVATE',
      title:       'Reativar lead parado',
      description: `Sem atividade com ${lead.name} há ${Math.floor(daysSinceUpdated)} dias. Envie uma mensagem de reengajamento.`,
      priority:    daysSinceUpdated > 14 ? 'HIGH' : 'MEDIUM',
      deadline:    new Date(Date.now() + DAYS),
      channel:     lead.phone ? 'WHATSAPP' : 'EMAIL',
    };
  }

  // Tentativa de contato sem resposta
  if (lead.status === 'CONTACT_ATTEMPTED' && daysSinceUpdated > 2) {
    return {
      actionType:  'FOLLOW_UP',
      title:       'Follow-up de contato',
      description: `${lead.name} não respondeu em ${Math.floor(daysSinceUpdated)} dias. Tente novamente por ${lead.phone ? 'WhatsApp' : 'email'}.`,
      priority:    'HIGH',
      deadline:    new Date(),
      channel:     lead.phone ? 'WHATSAPP' : 'EMAIL',
    };
  }

  // Score muito baixo — lead esfriando
  if (score < 30 && daysSinceCreated > 14) {
    return {
      actionType:  'LAST_ATTEMPT',
      title:       'Última tentativa',
      description: `Lead frio há ${Math.floor(daysSinceCreated)} dias. Faça uma última tentativa de contato ou descarte.`,
      priority:    'MEDIUM',
      deadline:    new Date(Date.now() + DAYS),
      channel:     lead.phone ? 'WHATSAPP' : 'EMAIL',
    };
  }

  // Lead de renovação — urgência maior
  if (lead.source === 'RENEWAL') {
    return {
      actionType:  'RENEWAL_CONTACT',
      title:       'Iniciar renovação',
      description: `Contate ${lead.name} para iniciar o processo de renovação do seguro.`,
      priority:    'HIGH',
      deadline:    new Date(Date.now() + DAYS),
      channel:     lead.phone ? 'WHATSAPP' : 'EMAIL',
    };
  }

  // Padrão — continuar follow-up normal
  return {
    actionType:  'FOLLOW_UP',
    title:       'Follow-up',
    description: `Mantenha contato com ${lead.name} para avançar no processo de cotação.`,
    priority:    'MEDIUM',
    deadline:    new Date(Date.now() + 2 * DAYS),
    channel:     lead.phone ? 'WHATSAPP' : 'EMAIL',
  };
}

// ── InsuranceRecord NBA ───────────────────────────────

/**
 * Retorna a próxima melhor ação para um InsuranceRecord.
 *
 * @param {Object} record
 * @param {Object} [ctx]
 * @param {number} [ctx.score=0]
 * @param {number} [ctx.overdueTasks=0]
 */
export function getInsuranceNextAction(record, ctx = {}) {
  const { score = 0, overdueTasks = 0 } = ctx;
  const daysSinceUpdate = daysSince(record.updatedAt);
  const daysToEnd = record.endDate ? daysUntil(record.endDate) : null;

  if (record.stage === 'APOLICE_EMITIDA') {
    if (daysToEnd !== null && daysToEnd <= 60 && daysToEnd > 0) {
      return {
        actionType:  'START_RENEWAL',
        title:       'Iniciar renovação',
        description: `Apólice de ${record.customerName} vence em ${Math.ceil(daysToEnd)} dias. Inicie o processo de renovação.`,
        priority:    daysToEnd <= 30 ? 'URGENT' : 'HIGH',
        deadline:    new Date(Date.now() + DAYS),
        channel:     record.customerPhone ? 'WHATSAPP' : 'EMAIL',
      };
    }
    return null;
  }

  if (record.stage === 'PERDIDO' || record.stage === 'CANCELADO') return null;

  // Tarefas vencidas primeiro
  if (overdueTasks > 0) {
    return {
      actionType:  'COMPLETE_OVERDUE_TASK',
      title:       `${overdueTasks} tarefa(s) vencida(s)`,
      description: `Resolva as tarefas vencidas antes de avançar com ${record.customerName}.`,
      priority:    'URGENT',
      deadline:    new Date(),
      channel:     'NONE',
    };
  }

  // Proposta enviada sem resposta
  if (record.stage === 'PROPOSTA_ENVIADA') {
    if (daysSinceUpdate > 5) {
      return {
        actionType:  'PROPOSAL_FOLLOWUP',
        title:       'Follow-up de proposta urgente',
        description: `Proposta para ${record.customerName} sem resposta há ${Math.floor(daysSinceUpdate)} dias. Entre em contato hoje.`,
        priority:    'URGENT',
        deadline:    new Date(),
        channel:     record.customerPhone ? 'WHATSAPP' : 'EMAIL',
      };
    }
    if (daysSinceUpdate > 2) {
      return {
        actionType:  'PROPOSAL_FOLLOWUP',
        title:       'Follow-up de proposta',
        description: `${record.customerName} recebeu a proposta há ${Math.floor(daysSinceUpdate)} dias. Faça um follow-up.`,
        priority:    'HIGH',
        deadline:    new Date(),
        channel:     record.customerPhone ? 'WHATSAPP' : 'EMAIL',
      };
    }
  }

  // Proposta aceita — emitir apólice
  if (record.stage === 'PROPOSTA_ACEITA') {
    return {
      actionType:  'EMIT_POLICY',
      title:       'Emitir apólice',
      description: `Proposta de ${record.customerName} foi aceita. Emita a apólice o quanto antes.`,
      priority:    'URGENT',
      deadline:    new Date(Date.now() + DAYS),
      channel:     'NONE',
    };
  }

  // Negociação parada
  if (record.stage === 'NEGOCIACAO' && daysSinceUpdate > 5) {
    return {
      actionType:  'REACTIVATE',
      title:       'Reativar negociação',
      description: `Negociação com ${record.customerName} parada há ${Math.floor(daysSinceUpdate)} dias. Ofereça condição especial para fechar.`,
      priority:    'HIGH',
      deadline:    new Date(Date.now() + DAYS),
      channel:     record.customerPhone ? 'WHATSAPP' : 'EMAIL',
    };
  }

  // Em cotação — enviar proposta
  if (record.stage === 'COTADO') {
    return {
      actionType:  'SEND_PROPOSAL',
      title:       'Enviar proposta',
      description: `Cotação de ${record.customerName} está pronta. Envie a proposta formal.`,
      priority:    daysSinceUpdate > 3 ? 'HIGH' : 'MEDIUM',
      deadline:    new Date(Date.now() + DAYS),
      channel:     record.customerEmail ? 'EMAIL' : 'WHATSAPP',
    };
  }

  // Qualquer estágio parado há muito tempo
  if (daysSinceUpdate > 10) {
    return {
      actionType:  'PIPELINE_STUCK',
      title:       'Pipeline travado',
      description: `Oportunidade com ${record.customerName} sem movimentação há ${Math.floor(daysSinceUpdate)} dias. Decida: avançar ou encerrar.`,
      priority:    'MEDIUM',
      deadline:    new Date(Date.now() + DAYS),
      channel:     record.customerPhone ? 'WHATSAPP' : 'EMAIL',
    };
  }

  // Padrão
  return {
    actionType:  'ADVANCE_STAGE',
    title:       'Avançar no pipeline',
    description: `Continue o processo com ${record.customerName} para chegar à emissão da apólice.`,
    priority:    'LOW',
    deadline:    new Date(Date.now() + 3 * DAYS),
    channel:     record.customerPhone ? 'WHATSAPP' : 'EMAIL',
  };
}

// ──────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────

function daysSince(date) {
  if (!date) return 999;
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
}

function daysUntil(date) {
  if (!date) return 999;
  return (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
}
