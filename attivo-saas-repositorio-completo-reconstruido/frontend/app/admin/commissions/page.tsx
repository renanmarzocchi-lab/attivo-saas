'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { fmt, commissionStatusColor } from '../../../lib/formatting';

interface Commission {
  id: string; amount: number; rate: number; status: string; competenceMonth: string;
  affiliate: { name: string; refCode: string };
  conversion: { product?: string; grossAmount: number; occurredAt: string };
}
interface Res { data: Commission[]; meta: { total: number; page: number; pages: number } }

export default function AdminCommissions() {
  const [res, setRes]       = useState<Res | null>(null);
  const [page, setPage]     = useState(1);
  const [status, setStatus] = useState('');
  const [error, setError]   = useState('');

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (status) params.set('status', status);
    api.get<Res>(`/admin/commissions?${params}`)
      .then((r) => { if (active) setRes(r); })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [page, status]);

  if (error) return <p style={{ color: '#dc2626' }}>{error}</p>;
  if (!res)  return <p>Carregando...</p>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Comissões</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['', 'PENDING', 'AVAILABLE', 'PAID', 'CANCELED'].map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', background: status === s ? '#1d4ed8' : '#fff', color: status === s ? '#fff' : '#374151', cursor: 'pointer' }}>
            {s || 'Todas'}
          </button>
        ))}
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>
              {['Afiliado', 'Produto', 'Comissão', 'Taxa', 'Competência', 'Status'].map(h =>
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {res.data.map(c => (
              <tr key={c.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 12px', fontSize: 13 }}>{c.affiliate.name}</td>
                <td style={{ padding: '10px 12px', fontSize: 13 }}>{c.conversion?.product ?? '-'}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600 }}>{fmt(c.amount)}</td>
                <td style={{ padding: '10px 12px', fontSize: 13 }}>{(Number(c.rate) * 100).toFixed(1)}%</td>
                <td style={{ padding: '10px 12px', fontSize: 13 }}>{c.competenceMonth}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: commissionStatusColor[c.status] ?? '#374151' }}>{c.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer' }}>Anterior</button>
        <span style={{ fontSize: 13 }}>Página {res.meta.page} de {res.meta.pages} ({res.meta.total} total)</span>
        <button disabled={page >= res.meta.pages} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer' }}>Próxima</button>
      </div>
    </div>
  );
}
