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
