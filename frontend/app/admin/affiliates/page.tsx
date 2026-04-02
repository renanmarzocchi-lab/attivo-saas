'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { affiliateStatusColor, affiliateStatusLabel, btnStyle } from '../../../lib/formatting';

interface Affiliate {
  id: string; name: string; email: string; refCode: string; status: string;
  cityUf?: string; createdAt: string;
  _count: { clicks: number; leads: number; conversions: number };
}
interface Res { data: Affiliate[]; meta: { total: number; page: number; pages: number } }

export default function AdminAffiliates() {
  const [res, setRes]       = useState<Res | null>(null);
  const [page, setPage]     = useState(1);
  const [status, setStatus] = useState('');
  const [error, setError]   = useState('');
  const [msg, setMsg]       = useState('');

  function load(p = page, s = status) {
    const params = new URLSearchParams({ page: String(p), limit: '20' });
    if (s) params.set('status', s);
    api.get<Res>(`/affiliates?${params}`)
      .then(setRes)
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (status) params.set('status', status);
    api.get<Res>(`/affiliates?${params}`)
      .then((r) => { if (active) setRes(r); })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [page, status]);

  async function act(id: string, action: 'approve' | 'reject' | 'block') {
    setMsg('');
    try {
      const r = await api.patch<{ message: string }>(`/affiliates/${id}/${action}`);
      setMsg(r.message);
      load(page, status); // preserva contexto de filtro
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Erro');
    }
  }

  if (error) return <p style={{ color: '#dc2626' }}>{error}</p>;
  if (!res)  return <p>Carregando...</p>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Afiliados</h2>
      {msg && <p style={{ background: '#f0fdf4', color: '#16a34a', padding: 10, borderRadius: 6, marginBottom: 12 }}>{msg}</p>}

      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        {['', 'PENDING', 'ACTIVE', 'REJECTED', 'BLOCKED'].map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', background: status === s ? '#1d4ed8' : '#fff', color: status === s ? '#fff' : '#374151', cursor: 'pointer' }}>
            {s ? (affiliateStatusLabel[s] ?? s) : 'Todos'}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>
              {['Nome', 'E-mail', 'Ref', 'Cidade', 'Cliques', 'Leads', 'Conversões', 'Status', 'Ações'].map((h) => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {res.data.map((a) => (
              <tr key={a.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 12px', fontSize: 14 }}>{a.name}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>{a.email}</td>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 13 }}>{a.refCode}</td>
                <td style={{ padding: '10px 12px', fontSize: 13 }}>{a.cityUf ?? '-'}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'center' }}>{a._count.clicks}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'center' }}>{a._count.leads}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'center' }}>{a._count.conversions}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: affiliateStatusColor[a.status] ?? '#374151' }}>{affiliateStatusLabel[a.status] ?? a.status}</span>
                </td>
                <td style={{ padding: '10px 12px', display: 'flex', gap: 4 }}>
                  {a.status === 'PENDING' && <>
                    <button onClick={() => act(a.id, 'approve')} style={btnStyle('#16a34a')}>Aprovar</button>
                    <button onClick={() => act(a.id, 'reject')}  style={btnStyle('#dc2626')}>Rejeitar</button>
                  </>}
                  {a.status === 'ACTIVE' &&
                    <button onClick={() => act(a.id, 'block')} style={btnStyle('#6b7280')}>Bloquear</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={btnStyle('#1d4ed8')}>Anterior</button>
        <span style={{ fontSize: 13 }}>Página {res.meta.page} de {res.meta.pages} ({res.meta.total} total)</span>
        <button disabled={page >= res.meta.pages} onClick={() => setPage(p => p + 1)} style={btnStyle('#1d4ed8')}>Próxima</button>
      </div>
    </div>
  );
}
