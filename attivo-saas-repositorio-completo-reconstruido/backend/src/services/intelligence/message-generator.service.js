/**
 * Message Generator Service — gera mensagens personalizadas para cada contexto.
 *
 * Funciona com um sistema de templates por cenário.
 * Cada template é selecionado com base em:
 *   - actionType (next best action)
 *   - channel (WHATSAPP | EMAIL)
 *   - contexto da entidade
 *
 * Não depende de OpenAI — usa templates + regras.
 * Fácil de trocar por IA no futuro (basta substituir esta função).
 */

const TYPE_LABEL = {
  AUTO: 'seguro auto', RESIDENCIAL: 'seguro residencial',
  EMPRESARIAL: 'seguro empresarial', VIDA: 'seguro de vida',
  PREVIDENCIA: 'previdência privada', SAUDE: 'plano de saúde',
  ODONTO: 'plano odontológico', VIAGEM: 'seguro viagem',
  RC: 'seguro RC', EQUIPAMENTOS: 'seguro de equipamentos',
  OUTROS: 'seguro',
};

// Templates por actionType e canal
const TEMPLATES = {
  IMMEDIATE_CONTACT: {
    WHATSAPP: (ctx) =>
      `Olá ${ctx.name}! 😊 Aqui é o ${ctx.brokerName} da ${ctx.company}.\n\n` +
      `Vi que você solicitou uma cotação de ${ctx.typeLabel} e adoraria te ajudar.\n\n` +
      `Você tem um minutinho agora para eu explicar as opções que tenho para você? 🙏`,

    EMAIL: (ctx) =>
      `Olá ${ctx.name},\n\n` +
      `Meu nome é ${ctx.brokerName} e sou corretor parceiro da ${ctx.company}.\n\n` +
      `Recebi sua solicitação de ${ctx.typeLabel} e estou preparando as melhores opções do mercado para você.\n\n` +
      `Posso entrar em contato amanhã para apresentar a proposta?\n\n` +
      `Aguardo seu retorno,\n${ctx.brokerName}`,
  },

  FIRST_CONTACT: {
    WHATSAPP: (ctx) =>
      `Olá ${ctx.name}! Tudo bem? 👋\n\n` +
      `Sou o ${ctx.brokerName}, seu corretor de seguros.\n\n` +
      `Você solicitou informações sobre ${ctx.typeLabel}. Gostaria de entender melhor o que você precisa para apresentar as melhores opções.\n\n` +
      `Podemos conversar hoje? 📲`,

    EMAIL: (ctx) =>
      `Prezado(a) ${ctx.name},\n\n` +
      `Espero que esteja bem! Sou ${ctx.brokerName} e entro em contato a respeito da sua solicitação de ${ctx.typeLabel}.\n\n` +
      `Tenho ótimas opções preparadas e gostaria de apresentá-las. Qual seria o melhor horário para conversarmos?\n\n` +
      `Atenciosamente,\n${ctx.brokerName}`,
  },

  FOLLOW_UP: {
    WHATSAPP: (ctx) =>
      `Olá ${ctx.name}! 😊\n\n` +
      `Passando para verificar se você conseguiu analisar as informações sobre o ${ctx.typeLabel}.\n\n` +
      `Ficou alguma dúvida? Estou aqui para ajudar! 🤝`,

    EMAIL: (ctx) =>
      `Olá ${ctx.name},\n\n` +
      `Gostaria de verificar se você teve a oportunidade de analisar a cotação de ${ctx.typeLabel} que preparei.\n\n` +
      `Estou à disposição para esclarecer qualquer dúvida ou ajustar a proposta conforme sua necessidade.\n\n` +
      `Aguardo seu retorno,\n${ctx.brokerName}`,
  },

  PROPOSAL_FOLLOWUP: {
    WHATSAPP: (ctx) =>
      `Olá ${ctx.name}! 👋\n\n` +
      `Enviei a proposta de ${ctx.typeLabel} há alguns dias e gostaria de saber o que achou.\n\n` +
      `Posso esclarecer alguma dúvida ou ajustar algo para ficar melhor para você? 😊`,

    EMAIL: (ctx) =>
      `Prezado(a) ${ctx.name},\n\n` +
      `Gostaria de verificar se recebeu e teve oportunidade de analisar a proposta de ${ctx.typeLabel} que encaminhei.\n\n` +
      `Caso haja algum ponto a ajustar ou dúvida a esclarecer, estou totalmente à disposição.\n\n` +
      `${ctx.premiumText ? `Lembrando que o valor mensal é ${ctx.premiumText}.\n\n` : ''}` +
      `Aguardo seu retorno,\n${ctx.brokerName}`,
  },

  REACTIVATE: {
    WHATSAPP: (ctx) =>
      `Olá ${ctx.name}! Tudo bem? 🙂\n\n` +
      `Faz um tempo que não nos falamos. Estava pensando em você e queria saber se ainda tem interesse no ${ctx.typeLabel}.\n\n` +
      `Tenho uma condição especial disponível por tempo limitado. Posso te apresentar? 🎯`,

    EMAIL: (ctx) =>
      `Olá ${ctx.name},\n\n` +
      `Tudo bem com você? Estou entrando em contato pois faz algum tempo desde nossa última conversa sobre ${ctx.typeLabel}.\n\n` +
      `Gostaria de compartilhar uma oportunidade especial que pode ser de seu interesse.\n\n` +
      `Quando podemos conversar?\n\n` +
      `${ctx.brokerName}`,
  },

  RENEWAL_CONTACT: {
    WHATSAPP: (ctx) =>
      `Olá ${ctx.name}! 😊\n\n` +
      `Sou o ${ctx.brokerName}, seu corretor de seguros.\n\n` +
      `Notei que ${ctx.endDateText ? `seu ${ctx.typeLabel} vence em ${ctx.endDateText}` : `está na hora de renovar seu ${ctx.typeLabel}`}.\n\n` +
      `Já preparei uma cotação atualizada com as melhores condições do mercado. Posso te apresentar? 🛡️`,

    EMAIL: (ctx) =>
      `Prezado(a) ${ctx.name},\n\n` +
      `${ctx.endDateText ? `Seu ${ctx.typeLabel} vence em ${ctx.endDateText}` : `É hora de renovar seu ${ctx.typeLabel}`}.\n\n` +
      `Preparei cotações atualizadas com as melhores opções disponíveis. ` +
      `Garanta a continuidade da sua cobertura sem interrupções.\n\n` +
      `Entre em contato para finalizarmos a renovação,\n${ctx.brokerName}`,
  },

  START_RENEWAL: {
    WHATSAPP: (ctx) =>
      `Olá ${ctx.name}! 👋\n\n` +
      `Seu ${ctx.typeLabel}${ctx.insurer ? ` (${ctx.insurer})` : ''} ${ctx.endDateText ? `vence em ${ctx.endDateText}` : 'está próximo do vencimento'}.\n\n` +
      `Já estou preparando a renovação para garantir que sua proteção não seja interrompida. Podemos conversar esta semana? 📋`,

    EMAIL: (ctx) =>
      `Prezado(a) ${ctx.name},\n\n` +
      `Informamos que sua apólice de ${ctx.typeLabel}${ctx.insurer ? ` da ${ctx.insurer}` : ''} ${ctx.endDateText ? `vence em ${ctx.endDateText}` : 'está próxima do vencimento'}.\n\n` +
      `Para garantir a continuidade da sua cobertura, solicito que entre em contato para iniciarmos o processo de renovação.\n\n` +
      `${ctx.premiumText ? `Sua apólice atual tem valor de ${ctx.premiumText}.\n\n` : ''}` +
      `Atenciosamente,\n${ctx.brokerName}`,
  },

  LAST_ATTEMPT: {
    WHATSAPP: (ctx) =>
      `Olá ${ctx.name}! 😊\n\n` +
      `Tentei entrar em contato algumas vezes sobre ${ctx.typeLabel} e não quero que você perca esta oportunidade.\n\n` +
      `Este será meu último contato sobre este assunto. Se ainda tiver interesse, me responda esta mensagem! 🙏`,

    EMAIL: (ctx) =>
      `Prezado(a) ${ctx.name},\n\n` +
      `Tentei entrar em contato algumas vezes sobre sua cotação de ${ctx.typeLabel} sem sucesso.\n\n` +
      `Por respeito ao seu tempo, esta será minha última tentativa de contato sobre este assunto.\n\n` +
      `Caso queira retomar nossa conversa, é só me responder este email.\n\n` +
      `${ctx.brokerName}`,
  },

  EMIT_POLICY: {
    WHATSAPP: (ctx) =>
      `Olá ${ctx.name}! 🎉\n\n` +
      `Ótima notícia — sua proposta de ${ctx.typeLabel} foi aprovada!\n\n` +
      `Estou finalizando a emissão da apólice e em breve você receberá todos os documentos. Alguma dúvida?`,

    EMAIL: (ctx) =>
      `Prezado(a) ${ctx.name},\n\n` +
      `Temos uma ótima notícia! Sua proposta de ${ctx.typeLabel} foi aprovada.\n\n` +
      `Estamos finalizando a emissão da apólice e você receberá todos os documentos em breve.\n\n` +
      `Caso tenha alguma dúvida, estou à disposição.\n\n` +
      `${ctx.brokerName}`,
  },
};

// Fallback para ações sem template específico
const DEFAULT_TEMPLATE = {
  WHATSAPP: (ctx) =>
    `Olá ${ctx.name}! 😊\n\n` +
    `Sou o ${ctx.brokerName}, seu corretor de seguros.\n\n` +
    `Gostaria de conversar sobre seu ${ctx.typeLabel}. Tem um momento? 📲`,

  EMAIL: (ctx) =>
    `Olá ${ctx.name},\n\n` +
    `${ctx.brokerName} aqui, seu corretor de seguros.\n\n` +
    `Gostaria de entrar em contato sobre seu ${ctx.typeLabel}.\n\n` +
    `Quando podemos conversar?\n\n` +
    `${ctx.brokerName}`,
};

/**
 * Gera uma mensagem personalizada.
 *
 * @param {Object} params
 * @param {string} params.actionType - código da ação (getNextBestAction)
 * @param {'WHATSAPP'|'EMAIL'} params.channel
 * @param {Object} params.entity - Lead ou InsuranceRecord
 * @param {Object} [params.broker] - { name: string }
 * @param {string} [params.company] - nome da corretora
 */
export function generateMessage({ actionType, channel, entity, broker, company = 'ATTIVO Seguros' }) {
  const ch = channel === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL';

  const name        = entity.name ?? entity.customerName ?? 'Cliente';
  const typeLabel   = TYPE_LABEL[entity.insuranceType ?? entity.type] ?? 'seguro';
  const brokerName  = broker?.name ?? 'seu corretor';
  const insurer     = entity.insurer ?? null;

  // Formatar prêmio
  let premiumText = null;
  if (entity.premiumAmount) {
    premiumText = `R$ ${Number(entity.premiumAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  }

  // Formatar data de vencimento
  let endDateText = null;
  if (entity.endDate) {
    endDateText = new Date(entity.endDate).toLocaleDateString('pt-BR');
  }

  const ctx = { name, typeLabel, brokerName, company, insurer, premiumText, endDateText };

  const templateGroup = TEMPLATES[actionType] ?? DEFAULT_TEMPLATE;
  const templateFn    = templateGroup[ch] ?? DEFAULT_TEMPLATE[ch];

  return templateFn(ctx);
}

/**
 * Gera mensagem diretamente para um Lead + próxima ação.
 */
export function generateLeadMessage({ lead, action, broker, channel, company }) {
  const ch = channel ?? (lead.phone ? 'WHATSAPP' : 'EMAIL');
  return generateMessage({
    actionType: action?.actionType ?? 'FOLLOW_UP',
    channel:    ch,
    entity:     lead,
    broker,
    company,
  });
}

/**
 * Gera mensagem para um InsuranceRecord + próxima ação.
 */
export function generateInsuranceMessage({ record, action, broker, channel, company }) {
  const ch = channel ?? (record.customerPhone ? 'WHATSAPP' : 'EMAIL');
  return generateMessage({
    actionType: action?.actionType ?? 'FOLLOW_UP',
    channel:    ch,
    entity:     { ...record, name: record.customerName },
    broker,
    company,
  });
}
