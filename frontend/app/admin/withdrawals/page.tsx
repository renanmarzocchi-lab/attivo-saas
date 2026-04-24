'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../../../lib/api';
import { fmt, fmtDate } from '../../../lib/formatting';

interface Withdrawal {
  id: string; ownerType: string; amount: number; pixKey?: string;
  status: string; notes?: string; requestedAt: string; resolvedAt?: string;
  requestedBy: { name: string; email: string; role: string };
  affiliateCommission?: {
    id: string; amount: number; rate: number; competenceMonth: string;
    affiliate: { name: string; refCode: string; pixKey?: string };
  } | null;
  brokerCommission?: {
    id: string; amount: number; rate: number; competenceMonth: string;
    insurance: { customerName: string; type: string; policyNumber?: string };
  } | null;
}
interface Res { data: Withdrawal[]; meta: { total: number; page: number; pages: number } }

const statusColor: Record<string, string> = {
  PENDING: '#d97706', APPROVED: '#2563eb', PAID: '#16a34a', REJECTED: '#dc2626',
};

export default function AdminWithdrawals() {
  const [res,    setRes]    = useState<Res | null>(null);
  const [page,   setPage]   = useState(1);
  const [status, setStatus] = useState('');
  const [error,  setError]  = useState('');
  const [msg,    setMsg]    = useState('');

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (status) params.set('status', status);
    api.get<Res>(`/admin/withdrawals?${params}`).then(setRes).catch(e => setError(e.message));
  }, [page, status]);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: 'pay' | 'reject') {
    setMsg('');
    try {
      const r = await api.patch<{ message: string }>(`/admin/withdrawals/${id}/${action}`, {});
      setMsg(r.message);
      load();
    } catch (e: unknown) { setMsg(e instanceof Error ? e.message : 'Erro'); }
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Solicitações de Retirada</h2>

      {msg   && <p style={{ background: '#f0fdf4', color: '#16a34a', padding: 10, borderRadius: 6, marginBottom: 12 }}>{msg}</p>}
      {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['', 'PENDING', 'APPROVED', 'PAID', 'REJECTED'].map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db',
              background: status === s ? '#1d4ed8' : '#fff', color: status === s ? '#fff' : '#374151', cursor: 'pointer' }}>
            {s || 'Todas'}
          </button>
        ))}
      </div>

      {!res && <p>Carregando...</p>}
      {res && res.data.length === 0 && (
        <div className="card"><p style={{ color: '#6b7280' }}>Nenhuma solicitação encontrada.</p></div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {res?.data.map(w => (
          <div key={w.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 20, color: '#1d4ed8' }}>{fmt(w.amount)}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700,
                    background: statusColor[w.status] + '20', color: statusColor[w.status] }}>
                    {w.status}
                  </span>
                  <span style={{ fontSize: 12, color: '#6b7280', padding: '2px 8px', background: '#f3f4f6', borderRadius: 4 }}>
                    {w.ownerType === 'AFFILIATE' ? 'Afiliado' : 'Corretor'}
                  </span>
                </div>

                <p style={{ fontSize: 13, marginBottom: 4 }}>
                  <strong>Solicitante:</strong> {w.requestedBy.name} ({w.requestedBy.email})
                </p>

                {w.affiliateCommission && (
                  <p style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>
                    Afiliado: {w.affiliateCommission.affiliate.name} ({w.affiliateCommission.affiliate.refCode})
                    {' — '}Competência: {w.affiliateCommission.competenceMonth}
                    {' — '}Taxa: {(Number(w.affiliateCommission.rate) * 100).toFixed(1)}%
                  </p>
                )}
                {w.brokerCommission && (
                  <p style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>
                    Apólice: {w.brokerCommission.insurance.policyNumber ?? '-'}
                    {' — '}Cliente: {w.brokerCommission.insurance.customerName}
                    {' — '}Competência: {w.brokerCommission.competenceMonth}
                  </p>
                )}

                {w.pixKey && (
                  <p style={{ fontSize: 13, marginBottom: 4 }}>
                    <strong>PIX:</strong> {w.pixKey}
                  </p>
                )}
                <p style={{ fontSize: 12, color: '#9ca3af' }}>
                  Solicitado em {fmtDate(w.requestedAt)}
                  {w.resolvedAt && ` — Resolvido em ${fmtDate(w.resolvedAt)}`}
                </p>
              </div>

              {w.status === 'PENDING' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button onClick={() => act(w.id, 'pay')}
                    style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                    Marcar como Pago
                  </button>
                  <button onClick={() => act(w.id, 'reject')}
                    style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                    Rejeitar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
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
