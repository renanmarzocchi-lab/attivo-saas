'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { fmt, fmtDate, conversionStatusColor, conversionStatusLabel } from '../../../lib/formatting';

interface Conversion {
  id: string; product?: string; grossAmount: number; commissionValue: number;
  status: string; occurredAt: string;
  affiliate: { name: string; refCode: string };
}
interface Res { data: Conversion[]; meta: { total: number; page: number; pages: number } }

export default function AdminConversions() {
  const [res, setRes]     = useState<Res | null>(null);
  const [page, setPage]   = useState(1);
  const [error, setError] = useState('');
  const [msg, setMsg]     = useState('');

  useEffect(() => {
    let active = true;
    api.get<Res>(`/conversions?page=${page}&limit=20`)
      .then((r) => { if (active) setRes(r); })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [page]);

  async function cancel(id: string) {
    setMsg('');
    try {
      const r = await api.patch<{ message: string }>(`/conversions/${id}/cancel`);
      setMsg(r.message);
      api.get<Res>(`/conversions?page=${page}&limit=20`).then(setRes).catch(() => null);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Erro');
    }
  }

  if (error) return <p style={{ color: '#dc2626' }}>{error}</p>;
  if (!res)  return <p>Carregando...</p>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Conversões</h2>
      {msg && <p style={{ background: '#fef9c3', color: '#92400e', padding: 10, borderRadius: 6, marginBottom: 12 }}>{msg}</p>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>
              {['Afiliado', 'Produto', 'Valor Bruto', 'Comissão', 'Status', 'Data', 'Ações'].map(h =>
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {res.data.map((c) => (
              <tr key={c.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 12px', fontSize: 13 }}>{c.affiliate.name}</td>
                <td style={{ padding: '10px 12px', fontSize: 13 }}>{c.product ?? '-'}</td>
                <td style={{ padding: '10px 12px', fontSize: 13 }}>{fmt(c.grossAmount)}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#16a34a' }}>{fmt(c.commissionValue)}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: conversionStatusColor[c.status] ?? '#374151' }}>{conversionStatusLabel[c.status] ?? c.status}</span>
                </td>
                <td style={{ padding: '10px 12px', fontSize: 13 }}>{fmtDate(c.occurredAt)}</td>
                <td style={{ padding: '10px 12px' }}>
                  {c.status !== 'CANCELED' &&
                    <button onClick={() => cancel(c.id)} style={{ padding: '4px 10px', borderRadius: 5, border: 'none', background: '#dc2626', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
                      Cancelar
                    </button>}
                </td>
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
