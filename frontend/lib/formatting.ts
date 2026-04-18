/** Formata valor numérico para BRL */
export const fmt = (n: number | string) =>
  Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata ISO date string para pt-BR */
export const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('pt-BR') : '-';

/** Mapeamento de cor por status de afiliado */
export const affiliateStatusColor: Record<string, string> = {
  ACTIVE:   '#16a34a',
  PENDING:  '#d97706',
  REJECTED: '#dc2626',
  BLOCKED:  '#6b7280',
};

/** Labels pt-BR para status de afiliado */
export const affiliateStatusLabel: Record<string, string> = {
  ACTIVE:   'Ativo',
  PENDING:  'Pendente',
  REJECTED: 'Rejeitado',
  BLOCKED:  'Bloqueado',
};

/** Mapeamento de cor por status de comissão */
export const commissionStatusColor: Record<string, string> = {
  PENDING:   '#d97706',
  AVAILABLE: '#2563eb',
  PAID:      '#16a34a',
  CANCELED:  '#9ca3af',
};

/** Labels pt-BR para status de comissão */
export const commissionStatusLabel: Record<string, string> = {
  PENDING:   'Pendente',
  AVAILABLE: 'Disponível',
  PAID:      'Pago',
  CANCELED:  'Cancelado',
};

/** Mapeamento de cor por status de conversão */
export const conversionStatusColor: Record<string, string> = {
  APPROVED: '#16a34a',
  PENDING:  '#d97706',
  CANCELED: '#9ca3af',
  REJECTED: '#dc2626',
};

/** Labels pt-BR para status de conversão */
export const conversionStatusLabel: Record<string, string> = {
  APPROVED: 'Aprovada',
  PENDING:  'Pendente',
  CANCELED: 'Cancelada',
  REJECTED: 'Rejeitada',
};

/** Mapeamento de cor por status de pagamento */
export const paymentStatusColor: Record<string, string> = {
  PENDING: '#d97706',
  PAID:    '#16a34a',
  FAILED:  '#dc2626',
};

/** Labels pt-BR para status de pagamento */
export const paymentStatusLabel: Record<string, string> = {
  PENDING: 'Pendente',
  PAID:    'Pago',
  FAILED:  'Falhou',
};

/** Mapeamento de cor por status de usuário */
export const userStatusColor: Record<string, string> = {
  ACTIVE: '#16a34a',
  INACTIVE: '#d97706',
  BLOCKED: '#6b7280',
};

/** Labels pt-BR para status de usuário */
export const userStatusLabel: Record<string, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  BLOCKED: 'Bloqueado',
};

/** Labels pt-BR para role de usuário */
export const userRoleLabel: Record<string, string> = {
  MASTER_ADMIN: 'Admin',
  BROKER: 'Corretor',
  AFFILIATE: 'Afiliado',
};

/** Mapeamento de cor por role */
export const userRoleColor: Record<string, string> = {
  MASTER_ADMIN: '#0B2442',
  BROKER: '#2563eb',
  AFFILIATE: '#D1B46A',
};

/** Labels pt-BR para tipo de seguro */
export const insuranceTypeLabel: Record<string, string> = {
  AUTO:        'Automóvel',
  RESIDENCIAL: 'Residencial',
  EMPRESARIAL: 'Empresarial',
  VIDA:        'Vida',
  PREVIDENCIA: 'Previdência',
  SAUDE:       'Saúde',
  ODONTO:      'Odonto',
  VIAGEM:      'Viagem',
  RC:          'RC',
  EQUIPAMENTOS:'Equipamentos',
  OUTROS:      'Outros',
};

/** Cor por tipo de seguro */
export const insuranceTypeColor: Record<string, string> = {
  AUTO:        '#2563eb',
  RESIDENCIAL: '#16a34a',
  EMPRESARIAL: '#0B2442',
  VIDA:        '#9333ea',
  PREVIDENCIA: '#7c3aed',
  SAUDE:       '#dc2626',
  ODONTO:      '#0891b2',
  VIAGEM:      '#ea580c',
  RC:          '#65a30d',
  EQUIPAMENTOS:'#ca8a04',
  OUTROS:      '#6b7280',
};

/** Labels pt-BR para status de vigência da apólice */
export const policyVigenciaLabel: Record<string, string> = {
  ACTIVE:        'Ativa',
  EXPIRING_SOON: 'A Vencer',
  EXPIRED:       'Vencida',
  CANCELED:      'Cancelada',
  RENEWED:       'Renovada',
};

/** Cor por status de vigência */
export const policyVigenciaColor: Record<string, string> = {
  ACTIVE:        '#16a34a',
  EXPIRING_SOON: '#d97706',
  EXPIRED:       '#dc2626',
  CANCELED:      '#6b7280',
  RENEWED:       '#2563eb',
};

/** Labels pt-BR para status de comissão da apólice (recebimento da seguradora) */
export const comissaoPagaLabel: Record<string, string> = {
  PAGA:     'Paga',
  PENDENTE: 'Pendente',
};

/** Cor por status de comissão da apólice */
export const comissaoPagaColor: Record<string, string> = {
  PAGA:     '#16a34a',
  PENDENTE: '#d97706',
};

/** Labels pt-BR para tipo de emissão */
export const tipoEmissaoLabel: Record<string, string> = {
  NOVO:      'Novo',
  RENOVACAO: 'Renovação',
};

/** Estilo padrão para botões de ação em tabelas */
export function btnStyle(bg: string): React.CSSProperties {
  return {
    padding:     '4px 10px',
    borderRadius: 5,
    border:      'none',
    background:  bg,
    color:       '#fff',
    fontSize:    12,
    cursor:      'pointer',
    fontWeight:  600,
  };
}
