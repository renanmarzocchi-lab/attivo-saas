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

/** Mapeamento de cor por status de comissão */
export const commissionStatusColor: Record<string, string> = {
  PENDING:   '#d97706',
  AVAILABLE: '#2563eb',
  PAID:      '#16a34a',
  CANCELED:  '#9ca3af',
};

/** Mapeamento de cor por status de conversão */
export const conversionStatusColor: Record<string, string> = {
  APPROVED: '#16a34a',
  PENDING:  '#d97706',
  CANCELED: '#9ca3af',
  REJECTED: '#dc2626',
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
