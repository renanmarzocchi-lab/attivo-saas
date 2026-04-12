'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { fmt, fmtDate } from '../../../lib/formatting';

interface Payment {
  id: string; totalAmount: number; status: string; paidAt?: string; reference?: string;
  items: { amount: number; commission?: { competenceMonth: string; conversion?: { product?: string } } }[];
}
interface Res { data: Payment[]; meta: { total: number; page: number; pages: number } }

export default function AffiliatePayments() {
  const [res, setRes]     = useState<Res | null>(null);
  const [page, setPage]   = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get<Res>(`/affiliate/payments?page=${page}&limit=20`)
      .then((r) => { if (active) setRes(r); })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [page]);

  if (error) return <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, color: '#dc2626', fontSize: 14 }}>{error}</div>;
  if (!res) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Carregando pagamentos...</div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0B2442', margin: 0 }}>Meus Pagamentos</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Histórico de pagamentos recebidos</p>
      </div>

      {res.data.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Total recebido', value: res.data.reduce((s, p) => s + Number(p.totalAmount), 0), color: '#16a34a' },
            { label: 'Pagamentos na página', value: res.data.length, isCnt: true, color: '#0B2442' },
          ].map(item => (
            <div key={item.label} style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '12px 18px', minWidth: 140 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>{item.label}</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: item.color, margin: 0 }}>
                {item.isCnt ? item.value : fmt(item.value as number)}
              </p>
            </div>
          ))}
        </div>
      )}

      {res.data.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">💳</div>
            <p className="empty-state-title">Nenhum pagamento ainda</p>
            <p className="empty-state-desc">Quando suas comissões forem pagas, elas aparecerão aqui com todos os detalhes.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {res.data.map(p => (
            <div key={p.id} className="card" style={{ borderLeft: '4px solid #D1B46A' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 800, fontSize: 22, color: '#0B2442' }}>{fmt(p.totalAmount)}</span>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Pago em {fmtDate(p.paidAt)}</p>
                  {p.reference && <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Ref: {p.reference}</p>}
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>{p.items.length} comissão(ões) incluída(s)</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {p.items.map((item, i) => (
                  <span key={i} style={{ background: '#f0f4f8', padding: '4px 10px', borderRadius: 6, fontSize: 12, color: '#374151', fontWeight: 500 }}>
                    {item.commission?.conversion?.product ?? 'Comissão'} — {item.commission?.competenceMonth ?? ''} — {fmt(item.amount)}
                  </span>
                ))}
              </div>
            </div>
          ))}
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

const BTN: React.CSSProperties = { padding: '7px 16px', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 13 };
