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
  const [res, setRes]     = useState<Res | null>(null);
  const [page, setPage]   = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get<Res>(`/affiliate/conversions?page=${page}&limit=20`)
      .then((r) => { if (active) setRes(r); })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [page]);

  if (error) return <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, color: '#dc2626', fontSize: 14 }}>{error}</div>;
  if (!res) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Carregando conversões...</div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0B2442', margin: 0 }}>Minhas Conversões</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Acompanhe suas conversões e comissões geradas</p>
      </div>

      {res.data.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Nenhuma conversão registrada ainda.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0B2442' }}>
                {['Produto', 'Valor Bruto', 'Minha Comissão', 'Competência', 'Conv.', 'Comissão', 'Data'].map(h =>
                  <th key={h} style={TH}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {res.data.map((c, i) => (
                <tr key={c.id} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                  <td style={TD}>{c.product ?? '—'}</td>
                  <td style={TD}>{fmt(c.grossAmount)}</td>
                  <td style={{ ...TD, fontWeight: 700, color: '#16a34a' }}>{fmt(c.commissionValue)}</td>
                  <td style={TD}>{c.commission?.competenceMonth ?? '—'}</td>
                  <td style={TD}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', padding: '3px 10px', borderRadius: 20, background: conversionStatusColor[c.status] ?? '#6b7280' }}>
                      {conversionStatusLabel[c.status] ?? c.status}
                    </span>
                  </td>
                  <td style={TD}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: commissionStatusColor[c.commission?.status ?? ''] ?? '#6b7280' }}>
                      {c.commission?.status ? (commissionStatusLabel[c.commission.status] ?? c.commission.status) : '—'}
                    </span>
                  </td>
                  <td style={TD}>{fmtDate(c.occurredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
          style={{ ...BTN, background: page === 1 ? '#e5e7eb' : '#0B2442', color: page === 1 ? '#9ca3af' : '#D1B46A', cursor: page === 1 ? 'default' : 'pointer' }}>← Anterior</button>
        <span style={{ fontSize: 13, color: '#6b7280' }}>Página {res.meta.page} de {res.meta.pages}</span>
        <button disabled={page >= res.meta.pages} onClick={() => setPage(p => p + 1)}
          style={{ ...BTN, background: page >= res.meta.pages ? '#e5e7eb' : '#0B2442', color: page >= res.meta.pages ? '#9ca3af' : '#D1B46A', cursor: page >= res.meta.pages ? 'default' : 'pointer' }}>Próxima →</button>
      </div>
    </div>
  );
}

const TH: React.CSSProperties = { padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' };
const TD: React.CSSProperties = { padding: '12px 14px', fontSize: 13 };
const BTN: React.CSSProperties = { padding: '7px 16px', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 13 };
