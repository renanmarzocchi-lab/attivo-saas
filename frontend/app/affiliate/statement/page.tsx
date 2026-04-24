'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../../../lib/api';
import { fmt, commissionStatusColor } from '../../../lib/formatting';

interface Commission {
  id: string; amount: number; rate: number; status: string; competenceMonth: string;
  conversion?: { product?: string; grossAmount: number };
  withdrawalRequest?: { id: string; status: string } | null;
}
interface Res { data: Commission[]; meta: { total: number; page: number; pages: number } }
interface Summary { pending: number; available: number; paid: number; pixKey?: string }

export default function AffiliateStatement() {
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
    api.get<Res>(`/affiliate/statement?${params}`).then(setRes).catch(e => setError(e.message));
  }, [page, status]);

  useEffect(() => {
    load();
    api.get<Summary>('/affiliate/statement/summary').then(s => {
      setSummary(s);
      setPixInput(s.pixKey ?? '');
    }).catch(() => {});
  }, [load]);

  async function requestWithdrawal(id: string) {
    setMsg('');
    try {
      await api.post(`/affiliate/commissions/${id}/request-withdrawal`, pixInput ? { pixKey: pixInput } : {});
      setMsg('Solicitação de retirada enviada! Aguarde a confirmação do pagamento.');
      load();
    } catch (e: unknown) { setMsg(e instanceof Error ? e.message : 'Erro'); }
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Extrato de Comissões</h2>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div className="card" style={{ background: '#fef3c7', border: '1px solid #fcd34d' }}>
            <p style={{ fontSize: 12, color: '#92400e', marginBottom: 4 }}>A Receber (Pendente)</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#92400e' }}>{fmt(summary.pending)}</p>
          </div>
          <div className="card" style={{ background: '#dcfce7', border: '1px solid #86efac' }}>
            <p style={{ fontSize: 12, color: '#166534', marginBottom: 4 }}>Disponível para Retirada</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#166534' }}>{fmt(summary.available)}</p>
          </div>
          <div className="card" style={{ background: '#f3f4f6', border: '1px solid #d1d5db' }}>
            <p style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>Total Recebido</p>
            <p style={{ fontSize: 22, fontWeight: 700 }}>{fmt(summary.paid)}</p>
          </div>
        </div>
      )}

      {summary && summary.available > 0 && (
        <div className="card" style={{ marginBottom: 16, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <p style={{ fontSize: 13, marginBottom: 8, fontWeight: 600, color: '#1d4ed8' }}>
            Você tem {fmt(summary.available)} disponível para retirada!
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>Chave PIX:</label>
            <input value={pixInput} onChange={e => setPixInput(e.target.value)} placeholder="Informe sua chave PIX"
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #93c5fd', fontSize: 13, flex: 1 }} />
          </div>
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
            Clique em &ldquo;Solicitar Retirada&rdquo; ao lado de cada comissão disponível.
          </p>
        </div>
      )}

      {msg   && <p style={{ background: '#f0fdf4', color: '#16a34a', padding: 10, borderRadius: 6, marginBottom: 12 }}>{msg}</p>}
      {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['', 'PENDING', 'AVAILABLE', 'PAID', 'CANCELED'].map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db',
              background: status === s ? '#1d4ed8' : '#fff', color: status === s ? '#fff' : '#374151', cursor: 'pointer' }}>
            {s || 'Todas'}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>
              {['Produto', 'Comissão', 'Taxa', 'Competência', 'Status', 'Retirada'].map(h =>
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {res?.data.map(c => (
              <tr key={c.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 12px', fontSize: 13 }}>{c.conversion?.product ?? '-'}</td>
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
                      Solicitada — {c.withdrawalRequest.status}
                    </span>
                  )}
                  {c.status === 'PENDING' && !c.withdrawalRequest && (
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>Aguard. liberação</span>
                  )}
                </td>
              </tr>
            ))}
            {res && res.data.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>Nenhuma comissão encontrada.</td></tr>
            )}
          </tbody>
        </table>
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
