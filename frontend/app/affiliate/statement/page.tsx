'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { fmt, commissionStatusColor, commissionStatusLabel } from '../../../lib/formatting';

interface Commission {
  id: string; amount: number; rate: number; status: string; competenceMonth: string;
  conversion?: { product?: string; grossAmount: number };
}
interface Res { data: Commission[]; meta: { total: number; page: number; pages: number } }

export default function AffiliateStatement() {
  const [res, setRes]       = useState<Res | null>(null);
  const [page, setPage]     = useState(1);
  const [status, setStatus] = useState('');
  const [error, setError]   = useState('');

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (status) params.set('status', status);
    api.get<Res>(`/affiliate/statement?${params}`)
      .then((r) => { if (active) setRes(r); })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [page, status]);

  const filterLabels: Record<string, string> = { '': 'Todas', PENDING: 'Pendente', AVAILABLE: 'Disponível', PAID: 'Pago', CANCELED: 'Cancelado' };

  if (error) return <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, color: '#dc2626', fontSize: 14 }}>{error}</div>;
  if (!res) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Carregando extrato...</div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0B2442', margin: 0 }}>Extrato de Comissões</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Seu histórico completo de comissões</p>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {['', 'PENDING', 'AVAILABLE', 'PAID', 'CANCELED'].map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            style={{ padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: status === s ? 'none' : '1.5px solid #e5e7eb', background: status === s ? '#0B2442' : '#fff', color: status === s ? '#D1B46A' : '#374151' }}>
            {filterLabels[s]}
          </button>
        ))}
      </div>

      {res.data.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Total da página', value: res.data.reduce((s, c) => s + Number(c.amount), 0), color: '#0B2442' },
            { label: 'Disponível', value: res.data.filter(c => c.status === 'AVAILABLE').reduce((s, c) => s + Number(c.amount), 0), color: '#2563eb' },
            { label: 'Já pago', value: res.data.filter(c => c.status === 'PAID').reduce((s, c) => s + Number(c.amount), 0), color: '#16a34a' },
          ].map(item => (
            <div key={item.label} style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '12px 18px', minWidth: 140 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>{item.label}</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: item.color, margin: 0 }}>{fmt(item.value)}</p>
            </div>
          ))}
        </div>
      )}
      {res.data.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Nenhuma comissão encontrada.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0B2442' }}>
                {['Produto', 'Comissão', 'Taxa', 'Competência', 'Status'].map(h =>
                  <th key={h} style={TH}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {res.data.map((c, i) => (
                <tr key={c.id} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                  <td style={TD}>{c.conversion?.product ?? '—'}</td>
                  <td style={{ ...TD, fontWeight: 700, color: '#0B2442' }}>{fmt(c.amount)}</td>
                  <td style={TD}>{(Number(c.rate) * 100).toFixed(1)}%</td>
                  <td style={TD}>{c.competenceMonth}</td>
                  <td style={TD}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', padding: '3px 10px', borderRadius: 20, background: commissionStatusColor[c.status] ?? '#6b7280' }}>
                      {commissionStatusLabel[c.status] ?? c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
          style={{ ...BTN, background: page === 1 ? '#e5e7eb' : '#0B2442', color: page === 1 ? '#9ca3af' : '#D1B46A', cursor: page === 1 ? 'default' : 'pointer' }}>← Anterior</button>
        <span style={{ fontSize: 13, color: '#6b7280' }}>Página {res.meta.page} de {res.meta.pages} · {res.meta.total} total</span>
        <button disabled={page >= res.meta.pages} onClick={() => setPage(p => p + 1)}
          style={{ ...BTN, background: page >= res.meta.pages ? '#e5e7eb' : '#0B2442', color: page >= res.meta.pages ? '#9ca3af' : '#D1B46A', cursor: page >= res.meta.pages ? 'default' : 'pointer' }}>Próxima →</button>
      </div>
    </div>
  );
}

const TH: React.CSSProperties = { padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' };
const TD: React.CSSProperties = { padding: '12px 14px', fontSize: 13 };
const BTN: React.CSSProperties = { padding: '7px 16px', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 13 };
