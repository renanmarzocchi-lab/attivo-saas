'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../../../lib/api';
import { fmt, commissionStatusColor } from '../../../lib/formatting';

interface Commission {
  id: string; amount: number; rate: number; status: string; competenceMonth: string;
  affiliate: { name: string; refCode: string };
  conversion: { product?: string; grossAmount: number; occurredAt: string };
}
interface BrokerCommission {
  id: string; amount: number; rate: number; status: string; competenceMonth: string;
  user: { name: string; email: string };
  insurance: { customerName: string; type: string; policyNumber?: string };
  withdrawalRequest?: { id: string; status: string } | null;
}
interface Res<T> { data: T[]; meta: { total: number; page: number; pages: number } }

type Tab = 'affiliate' | 'broker';

export default function AdminCommissions() {
  const [tab,    setTab]    = useState<Tab>('affiliate');
  const [res,    setRes]    = useState<Res<Commission> | null>(null);
  const [bRes,   setBRes]   = useState<Res<BrokerCommission> | null>(null);
  const [page,   setPage]   = useState(1);
  const [status, setStatus] = useState('');
  const [error,  setError]  = useState('');
  const [msg,    setMsg]    = useState('');

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (status) params.set('status', status);
    if (tab === 'affiliate') {
      api.get<Res<Commission>>(`/admin/commissions?${params}`)
        .then(setRes).catch(e => setError(e.message));
    } else {
      api.get<Res<BrokerCommission>>(`/admin/commissions/brokers?${params}`)
        .then(setBRes).catch(e => setError(e.message));
    }
  }, [tab, page, status]);

  useEffect(() => { load(); }, [load]);

  async function release(id: string, type: Tab) {
    setMsg('');
    try {
      const r = await api.patch<{ message: string }>(`/admin/commissions/${type}/${id}/release`, {});
      setMsg(r.message);
      load();
    } catch (e: unknown) { setMsg(e instanceof Error ? e.message : 'Erro'); }
  }

  const statusList = ['', 'PENDING', 'AVAILABLE', 'PAID', 'CANCELED'];

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Comissões</h2>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid #e5e7eb' }}>
        {(['affiliate', 'broker'] as Tab[]).map(t => (
          <button key={t} onClick={() => { setTab(t); setPage(1); setStatus(''); setRes(null); setBRes(null); }}
            style={{ padding: '8px 20px', border: 'none', borderBottom: tab === t ? '2px solid #1d4ed8' : '2px solid transparent',
              background: 'none', cursor: 'pointer', fontWeight: tab === t ? 700 : 400,
              color: tab === t ? '#1d4ed8' : '#6b7280', marginBottom: -2 }}>
            {t === 'affiliate' ? 'Afiliados' : 'Corretores'}
          </button>
        ))}
      </div>

      {msg   && <p style={{ background: '#f0fdf4', color: '#16a34a', padding: 10, borderRadius: 6, marginBottom: 12 }}>{msg}</p>}
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {statusList.map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db',
              background: status === s ? '#1d4ed8' : '#fff', color: status === s ? '#fff' : '#374151', cursor: 'pointer' }}>
            {s || 'Todas'}
          </button>
        ))}
      </div>

      {tab === 'affiliate' && res && (
        <>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  {['Afiliado', 'Produto', 'Comissão', 'Taxa', 'Competência', 'Status', 'Ação'].map(h =>
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {res.data.map(c => (
                  <tr key={c.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{c.affiliate.name}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{c.conversion?.product ?? '-'}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{fmt(c.amount)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{(Number(c.rate) * 100).toFixed(1)}%</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{c.competenceMonth}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: commissionStatusColor[c.status] ?? '#374151' }}>{c.status}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {c.status === 'PENDING' && (
                        <button onClick={() => release(c.id, 'affiliate')}
                          style={{ padding: '4px 10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          Disponibilizar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={res.meta} page={page} setPage={setPage} />
        </>
      )}

      {tab === 'broker' && bRes && (
        <>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  {['Corretor', 'Cliente', 'Tipo', 'Apólice', 'Comissão', 'Taxa', 'Competência', 'Status', 'Ação'].map(h =>
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {bRes.data.map(c => (
                  <tr key={c.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{c.user.name}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{c.insurance.customerName}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{c.insurance.type}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{c.insurance.policyNumber ?? '-'}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{fmt(c.amount)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{(Number(c.rate) * 100).toFixed(1)}%</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{c.competenceMonth}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: commissionStatusColor[c.status] ?? '#374151' }}>{c.status}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {c.status === 'PENDING' && (
                        <button onClick={() => release(c.id, 'broker')}
                          style={{ padding: '4px 10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          Disponibilizar
                        </button>
                      )}
                      {c.withdrawalRequest && c.status !== 'PENDING' && (
                        <span style={{ fontSize: 11, color: '#d97706', fontWeight: 600 }}>
                          Retirada: {c.withdrawalRequest.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={bRes.meta} page={page} setPage={setPage} />
        </>
      )}

      {!res && !bRes && !error && <p>Carregando...</p>}
    </div>
  );
}

function Pagination({ meta, page, setPage }: { meta: { page: number; pages: number; total: number }; page: number; setPage: (p: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
      <button disabled={page === 1} onClick={() => setPage(page - 1)}
        style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer' }}>Anterior</button>
      <span style={{ fontSize: 13 }}>Página {meta.page} de {meta.pages} ({meta.total} total)</span>
      <button disabled={page >= meta.pages} onClick={() => setPage(page + 1)}
        style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer' }}>Próxima</button>
    </div>
  );
}
