'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { fmt, fmtDate, paymentStatusColor, paymentStatusLabel } from '../../../lib/formatting';

interface Payment {
  id: string; totalAmount: number; status: string; paidAt?: string; reference?: string;
  affiliate: { name: string; pixKey?: string };
  items: { id: string; amount: number }[];
}
interface Res { data: Payment[]; meta: { total: number; page: number; pages: number } }

export default function AdminPayments() {
  const [res, setRes]     = useState<Res | null>(null);
  const [page, setPage]   = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get<Res>(`/payments?page=${page}&limit=20`)
      .then((r) => { if (active) setRes(r); })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [page]);

  if (error) return <p style={{ color: '#dc2626' }}>{error}</p>;
  if (!res)  return <p>Carregando...</p>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Pagamentos</h2>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>
              {['Afiliado', 'Pix', 'Total', 'Qtd.', 'Status', 'Pago em', 'Referência'].map(h =>
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {res.data.map(p => (
              <tr key={p.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 12px', fontSize: 14 }}>{p.affiliate.name}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{p.affiliate.pixKey ?? '-'}</td>
                <td style={{ padding: '10px 12px', fontWeight: 700, color: '#16a34a' }}>{fmt(p.totalAmount)}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'center' }}>{p.items.length}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: paymentStatusColor[p.status] ?? '#374151' }}>{paymentStatusLabel[p.status] ?? p.status}</td>
                <td style={{ padding: '10px 12px', fontSize: 13 }}>{fmtDate(p.paidAt)}</td>
                <td style={{ padding: '10px 12px', fontSize: 13 }}>{p.reference ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer' }}>Anterior</button>
        <span style={{ fontSize: 13 }}>Página {res.meta.page} de {res.meta.pages}</span>
        <button disabled={page >= res.meta.pages} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer' }}>Próxima</button>
      </div>
    </div>
  );
}
