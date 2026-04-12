'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { fmt, fmtDate, conversionStatusColor, conversionStatusLabel, commissionStatusColor, commissionStatusLabel } from '../../../lib/formatting';

interface Conversion {
  id: string; product?: string; grossAmount: number; commissionValue: number;
  status: string; occurredAt: string;
  commission?: { status: string; competenceMonth: string };
}
interface Res { data: Conversion[]; meta: { total: number; page: number; pages: number } }

export default function AffiliateConversions() {
  const [res, setRes]       = useState<Res | null>(null);
  const [page, setPage]     = useState(1);
  const [status, setStatus] = useState('');
  const [error, setError]   = useState('');

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (status) params.set('status', status);
    api.get<Res>(`/affiliate/conversions?${params}`)
      .then((r) => { if (active) setRes(r); })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [page, status]);

  const filterLabels: Record<string, string> = {
    '': 'Todas', APPROVED: 'Aprovadas', PENDING: 'Pendentes', CANCELED: 'Canceladas', REJECTED: 'Rejeitadas',
  };

  if (error) return <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, color: '#dc2626', fontSize: 14 }}>{error}</div>;
  if (!res) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Carregando conversões...</div>;

  const totalComissao = res.data.reduce((s, c) => s + Number(c.commissionValue), 0);
  const totalBruto    = res.data.reduce((s, c) => s + Number(c.grossAmount), 0);
  const aprovadas     = res.data.filter(c => c.status === 'APPROVED').length;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0B2442', margin: 0 }}>Minhas Conversões</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Acompanhe suas conversões e comissões geradas</p>
      </div>

      {/* Filtros de status */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {['', 'APPROVED', 'PENDING', 'CANCELED', 'REJECTED'].map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            style={{
              padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: status === s ? 'none' : '1.5px solid #e5e7eb',
              background: status === s ? '#0B2442' : '#fff',
              color: status === s ? '#D1B46A' : '#374151',
              transition: 'all 0.15s',
            }}>
            {filterLabels[s]}
          </button>
        ))}
      </div>

      {/* Totalizadores */}
      {res.data.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Total de comissões', value: fmt(totalComissao), color: '#16a34a' },
            { label: 'Volume bruto', value: fmt(totalBruto), color: '#0B2442' },
            { label: 'Aprovadas nesta página', value: String(aprovadas), color: '#2563eb', isCount: true },
          ].map(item => (
            <div key={item.label} style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '12px 18px', minWidth: 140 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>{item.label}</p>
              <p style={{ fontSize: item.isCount ? 24 : 18, fontWeight: 800, color: item.color, margin: 0 }}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {res.data.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🎯</div>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#0B2442', margin: '0 0 8px' }}>Nenhuma conversão ainda</p>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 20px', maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
            Quando alguém contratar um seguro pelo seu link de indicação, a conversão aparecerá aqui.
          </p>
          <a href="/affiliate/dashboard" style={{ display: 'inline-block', padding: '10px 24px', background: '#0B2442', color: '#D1B46A', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            Ver meu link →
          </a>
        </div>
      ) : (
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0B2442' }}>
                {['Produto', 'Valor Bruto', 'Minha Comissão', 'Competência', 'Status Conv.', 'Status Comissão', 'Data'].map(h =>
                  <th key={h} style={TH}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {res.data.map((c, i) => (
                <tr key={c.id} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                  <td style={{ ...TD, fontWeight: 500 }}>{c.product ?? '—'}</td>
                  <td style={TD}>{fmt(c.grossAmount)}</td>
                  <td style={{ ...TD, fontWeight: 700, color: '#16a34a' }}>{fmt(c.commissionValue)}</td>
                  <td style={{ ...TD, fontSize: 12, color: '#6b7280' }}>{c.commission?.competenceMonth ?? '—'}</td>
                  <td style={TD}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', padding: '3px 10px', borderRadius: 20, background: conversionStatusColor[c.status] ?? '#6b7280', whiteSpace: 'nowrap' }}>
                      {conversionStatusLabel[c.status] ?? c.status}
                    </span>
                  </td>
                  <td style={TD}>
                    {c.commission?.status ? (
                      <span style={{ fontSize: 11, fontWeight: 600, color: commissionStatusColor[c.commission.status] ?? '#6b7280' }}>
                        {commissionStatusLabel[c.commission.status] ?? c.commission.status}
                      </span>
                    ) : <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ ...TD, fontSize: 12, color: '#6b7280' }}>{fmtDate(c.occurredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {res.meta.pages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            style={{ ...BTN, background: page === 1 ? '#e5e7eb' : '#0B2442', color: page === 1 ? '#9ca3af' : '#D1B46A', cursor: page === 1 ? 'default' : 'pointer' }}>
            ← Anterior
          </button>
          <span style={{ fontSize: 13, color: '#6b7280' }}>
            Página {res.meta.page} de {res.meta.pages} · {res.meta.total} conversões
          </span>
          <button disabled={page >= res.meta.pages} onClick={() => setPage(p => p + 1)}
            style={{ ...BTN, background: page >= res.meta.pages ? '#e5e7eb' : '#0B2442', color: page >= res.meta.pages ? '#9ca3af' : '#D1B46A', cursor: page >= res.meta.pages ? 'default' : 'pointer' }}>
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}

const TH: React.CSSProperties = { padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' };
const TD: React.CSSProperties = { padding: '12px 14px', fontSize: 13 };
const BTN: React.CSSProperties = { padding: '7px 16px', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 13 };
