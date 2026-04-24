'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../../../lib/api';
import { fmt, commissionStatusColor } from '../../../lib/formatting';

interface Commission {
  id: string; amount: number; rate: number; status: string; competenceMonth: string;
  insurance: { customerName: string; type: string; insurer?: string; policyNumber?: string };
  withdrawalRequest?: { id: string; status: string; requestedAt: string } | null;
}
interface Res { data: Commission[]; meta: { total: number; page: number; pages: number } }
interface Summary { commissionRate: number; pixKey?: string }

export default function BrokerCommissions() {
  const [res,      setRes]      = useState<Res | null>(null);
  const [summary,  setSummary]  = useState<Summary | null>(null);
  const [page,     setPage]     = useState(1);
  const [status,   setStatus]   = useState('');
  const [error,    setError]    = useState('');
  const [msg,      setMsg]      = useState('');
  const [pixInput, setPixInput] = useState('');

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (status) params.set('status', status);
    api.get<Res>(`/broker/commissions?${params}`).then(setRes).catch(e => setError(e.message));
  }, [page, status]);

  useEffect(() => {
    load();
    api.get<Summary>('/broker/commission-rate').then(s => {
      setSummary(s);
      setPixInput(s.pixKey ?? '');
    }).catch(() => {});
  }, [load]);

  async function requestWithdrawal(id: string) {
    setMsg('');
    try {
      await api.post(`/broker/commissions/${id}/request-withdrawal`, pixInput ? { pixKey: pixInput } : {});
      setMsg('Solicitação de retirada enviada! O admin será notificado.');
      load();
    } catch (e: unknown) { setMsg(e instanceof Error ? e.message : 'Erro'); }
  }

  const statusList = ['', 'PENDING', 'AVAILABLE', 'PAID', 'CANCELED'];

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Minhas Comissões</h2>

      {summary && (
        <div className="card" style={{ marginBottom: 16, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <p style={{ fontSize: 14, marginBottom: 8 }}>
            Sua taxa de comissão: <strong style={{ color: '#1d4ed8' }}>{(summary.commissionRate * 100).toFixed(1)}%</strong>
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>Chave PIX:</label>
            <input value={pixInput} onChange={e => setPixInput(e.target.value)} placeholder="Informe sua chave PIX para retiradas"
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #93c5fd', fontSize: 13, flex: 1 }} />
          </div>
        </div>
      )}

      {msg   && <p style={{ background: '#f0fdf4', color: '#16a34a', padding: 10, borderRadius: 6, marginBottom: 12 }}>{msg}</p>}
      {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {statusList.map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db',
              background: status === s ? '#1d4ed8' : '#fff', color: status === s ? '#fff' : '#374151', cursor: 'pointer' }}>
            {s || 'Todas'}
          </button>
        ))}
      </div>

      {!res && <p>Carregando...</p>}
      {res && res.data.length === 0 && (
        <div className="card"><p style={{ color: '#6b7280' }}>Nenhuma comissão encontrada. Comissões são geradas automaticamente ao emitir uma apólice.</p></div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {res && res.data.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                {['Cliente', 'Tipo', 'Apólice', 'Comissão', 'Taxa', 'Competência', 'Status', 'Retirada'].map(h =>
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {res.data.map(c => (
                <tr key={c.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>{c.insurance.customerName}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>{c.insurance.type}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{c.insurance.policyNumber ?? '-'}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#16a34a' }}>{fmt(c.amount)}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>{(Number(c.rate) * 100).toFixed(1)}%</td>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>{c.competenceMonth}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: commissionStatusColor[c.status] ?? '#374151' }}>{c.status}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {c.status === 'AVAILABLE' && !c.withdrawalRequest && (
                      <button onClick={() => requestWithdrawal(c.id)}
                        style={{ padding: '4px 10px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        Solicitar Retirada
                      </button>
                    )}
                    {c.withdrawalRequest && (
                      <span style={{ fontSize: 12, color: '#d97706', fontWeight: 600 }}>
                        {c.withdrawalRequest.status}
                      </span>
                    )}
                    {c.status === 'PENDING' && (
                      <span style={{ fontSize: 12, color: '#6b7280' }}>Aguard. liberação</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {res && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer' }}>Anterior</button>
          <span style={{ fontSize: 13 }}>Página {res.meta.page} de {res.meta.pages} ({res.meta.total} total)</span>
          <button disabled={page >= res.meta.pages} onClick={() => setPage(p => p + 1)}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer' }}>Próxima</button>
        </div>
      )}
    </div>
  );
}
