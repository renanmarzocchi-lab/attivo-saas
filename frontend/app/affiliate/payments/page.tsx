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

  if (error) return <p style={{ color: '#dc2626' }}>{error}</p>;
  if (!res)  return <p>Carregando...</p>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Meus Pagamentos</h2>
      {res.data.length === 0 && (
        <div className="card"><p style={{ color: '#6b7280' }}>Nenhum pagamento registrado ainda.</p></div>
      )}
      <div style={{ display: 'grid', gap: 16 }}>
        {res.data.map(p => (
          <div key={p.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 20, color: '#16a34a' }}>{fmt(p.totalAmount)}</span>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 13, color: '#6b7280' }}>Pago em {fmtDate(p.paidAt)}</p>
                {p.reference && <p style={{ fontSize: 12, color: '#9ca3af' }}>Ref: {p.reference}</p>}
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>{p.items.length} comissão(ões) incluída(s)</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {p.items.map((item, i) => (
                <span key={i} style={{ background: '#f3f4f6', padding: '3px 8px', borderRadius: 4, fontSize: 12 }}>
                  {item.commission?.conversion?.product ?? 'Comissão'} — {item.commission?.competenceMonth ?? ''} — {fmt(item.amount)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer' }}>Anterior</button>
        <span style={{ fontSize: 13 }}>Página {res.meta.page} de {res.meta.pages}</span>
        <button disabled={page >= res.meta.pages} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer' }}>Próxima</button>
      </div>
    </div>
  );
}
