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
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.get<Res>(`/conversions?page=${page}&limit=20`)
      .then((r) => { if (active) setRes(r); })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [page]);

  async function cancel(id: string) {
    setMsg(''); setLoadingId(id);
    try {
      const r = await api.patch<{ message: string }>(`/conversions/${id}/cancel`);
      setMsg(r.message);
      api.get<Res>(`/conversions?page=${page}&limit=20`).then(setRes).catch(() => null);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoadingId(null);
    }
  }

  if (error) return <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, color: '#dc2626', fontSize: 14 }}>{error}</div>;
  if (!res) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Carregando conversões...</div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0B2442', margin: 0 }}>Conversões</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Gerencie as conversões dos afiliados</p>
      </div>

      {msg && <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 16px', color: '#92400e', fontSize: 14, marginBottom: 16 }}>{msg}</div>}

      {res.data.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Nenhuma conversão registrada ainda.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0B2442' }}>
                {['Afiliado', 'Produto', 'Valor Bruto', 'Comissão', 'Status', 'Data', 'Ações'].map(h =>
                  <th key={h} style={TH}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {res.data.map((c, i) => (
                <tr key={c.id} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                  <td style={TD}><span style={{ fontWeight: 500 }}>{c.affiliate.name}</span></td>
                  <td style={TD}>{c.product ?? '—'}</td>
                  <td style={TD}>{fmt(c.grossAmount)}</td>
                  <td style={{ ...TD, fontWeight: 600, color: '#16a34a' }}>{fmt(c.commissionValue)}</td>
                  <td style={TD}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', padding: '3px 10px', borderRadius: 20, background: conversionStatusColor[c.status] ?? '#6b7280' }}>
                      {conversionStatusLabel[c.status] ?? c.status}
                    </span>
                  </td>
                  <td style={TD}>{fmtDate(c.occurredAt)}</td>
                  <td style={TD}>
                    {c.status !== 'CANCELED' && (
                      <button onClick={() => cancel(c.id)} disabled={loadingId !== null}
                        style={{ padding: '5px 12px', borderRadius: 5, border: 'none', background: loadingId === c.id ? '#9ca3af' : '#dc2626', color: '#fff', fontSize: 12, fontWeight: 600, cursor: loadingId !== null ? 'not-allowed' : 'pointer', opacity: loadingId !== null && loadingId !== c.id ? 0.6 : 1 }}>
                        {loadingId === c.id ? '...' : 'Cancelar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {res && <Pagination page={page} pages={res.meta.pages} total={res.meta.total} onPage={setPage} />}
    </div>
  );
}

function Pagination({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
      <button disabled={page === 1} onClick={() => onPage(page - 1)}
        style={{ ...BTN_PAGE, background: page === 1 ? '#e5e7eb' : '#0B2442', color: page === 1 ? '#9ca3af' : '#D1B46A', cursor: page === 1 ? 'default' : 'pointer' }}>← Anterior</button>
      <span style={{ fontSize: 13, color: '#6b7280' }}>Página {page} de {pages} · {total} total</span>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)}
        style={{ ...BTN_PAGE, background: page >= pages ? '#e5e7eb' : '#0B2442', color: page >= pages ? '#9ca3af' : '#D1B46A', cursor: page >= pages ? 'default' : 'pointer' }}>Próxima →</button>
    </div>
  );
}

const TH: React.CSSProperties = { padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' };
const TD: React.CSSProperties = { padding: '12px 14px', fontSize: 13 };
const BTN_PAGE: React.CSSProperties = { padding: '7px 16px', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 13 };
