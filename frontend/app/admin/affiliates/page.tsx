'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { affiliateStatusColor, affiliateStatusLabel } from '../../../lib/formatting';

interface Affiliate {
  id: string; name: string; email: string; refCode: string; status: string;
  cityUf?: string; createdAt: string;
  _count: { clicks: number; leads: number; conversions: number };
}
interface Res { data: Affiliate[]; meta: { total: number; page: number; pages: number } }

export default function AdminAffiliates() {
  const [res, setRes]                   = useState<Res | null>(null);
  const [page, setPage]                 = useState(1);
  const [status, setStatus]             = useState('');
  const [error, setError]               = useState('');
  const [msg, setMsg]                   = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

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

  const actionLabel: Record<string, string> = {
    approve: 'Aprovar', reject: 'Rejeitar', block: 'Bloquear', unblock: 'Desbloquear',
  };

  async function act(id: string, action: 'approve' | 'reject' | 'block' | 'unblock') {
    setMsg(''); setError('');
    const key = `${id}-${action}`;
    setLoadingAction(key);
    try {
      const r = await api.patch<{ message: string }>(`/affiliates/${id}/${action}`);
      setMsg(r.message ?? `${actionLabel[action]} realizado com sucesso`);
      load(page, status);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : `Erro ao ${actionLabel[action]?.toLowerCase() ?? 'executar ação'}`);
    } finally {
      setLoadingAction(null);
    }
  }

  const filterLabels: Record<string, string> = {
    '': 'Todos', PENDING: 'Pendente', ACTIVE: 'Ativo', REJECTED: 'Rejeitado', BLOCKED: 'Bloqueado',
  };

  if (!res && !error) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Carregando afiliados...</div>
  );

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0B2442', margin: 0 }}>Afiliados</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Gerencie e aprove os afiliados da plataforma</p>
      </div>

      {msg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', color: '#15803d', fontSize: 14, fontWeight: 500, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          ✓ {msg}
        </div>
      )}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 16px', color: '#dc2626', fontSize: 14, fontWeight: 500, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['', 'PENDING', 'ACTIVE', 'REJECTED', 'BLOCKED'].map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            style={{
              padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: status === s ? 'none' : '1.5px solid #e5e7eb',
              background: status === s ? '#0B2442' : '#fff',
              color: status === s ? '#D1B46A' : '#374151',
              transition: 'all 0.15s',
            }}>
            {filterLabels[s]}
          </button>
        ))}
      </div>

      {res && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0B2442' }}>
                {['Nome', 'E-mail', 'Ref', 'Cidade', 'Cliques', 'Leads', 'Conv.', 'Status', 'Ações'].map((h) => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {res.data.map((a, i) => (
                <tr key={a.id} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                  <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 500, color: '#111827' }}>{a.name}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#6b7280' }}>{a.email}</td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: '#0B2442', fontWeight: 600, background: '#f0f4f8', borderRadius: 4 }}>{a.refCode}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>{a.cityUf ?? '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, textAlign: 'center', fontWeight: 600 }}>{a._count.clicks}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, textAlign: 'center', fontWeight: 600 }}>{a._count.leads}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, textAlign: 'center', fontWeight: 600 }}>{a._count.conversions}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: '#fff', padding: '3px 10px', borderRadius: 20,
                      background: affiliateStatusColor[a.status] ?? '#6b7280',
                    }}>
                      {affiliateStatusLabel[a.status] ?? a.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {a.status === 'PENDING' && (
                        <>
                          <ActionBtn
                            label="Aprovar" loadingLabel="..."
                            isLoading={loadingAction === `${a.id}-approve`}
                            disabled={loadingAction !== null}
                            color="#16a34a"
                            onClick={() => act(a.id, 'approve')}
                          />
                          <ActionBtn
                            label="Rejeitar" loadingLabel="..."
                            isLoading={loadingAction === `${a.id}-reject`}
                            disabled={loadingAction !== null}
                            color="#dc2626"
                            onClick={() => act(a.id, 'reject')}
                          />
                        </>
                      )}
                      {a.status === 'ACTIVE' && (
                        <ActionBtn
                          label="Bloquear" loadingLabel="..."
                          isLoading={loadingAction === `${a.id}-block`}
                          disabled={loadingAction !== null}
                          color="#6b7280"
                          onClick={() => act(a.id, 'block')}
                        />
                      )}
                      {(a.status === 'BLOCKED' || a.status === 'REJECTED') && (
                        <ActionBtn
                          label="Reativar" loadingLabel="..."
                          isLoading={loadingAction === `${a.id}-unblock`}
                          disabled={loadingAction !== null}
                          color="#2563eb"
                          onClick={() => act(a.id, 'unblock')}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {res && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
          <button disabled={page === 1 || loadingAction !== null} onClick={() => setPage(p => p - 1)}
            style={{ padding: '7px 16px', borderRadius: 6, border: 'none', background: page === 1 ? '#e5e7eb' : '#0B2442', color: page === 1 ? '#9ca3af' : '#D1B46A', fontWeight: 600, fontSize: 13, cursor: page === 1 ? 'default' : 'pointer' }}>
            ← Anterior
          </button>
          <span style={{ fontSize: 13, color: '#6b7280' }}>
            Página {res.meta.page} de {res.meta.pages} &nbsp;·&nbsp; {res.meta.total} afiliados
          </span>
          <button disabled={page >= res.meta.pages || loadingAction !== null} onClick={() => setPage(p => p + 1)}
            style={{ padding: '7px 16px', borderRadius: 6, border: 'none', background: page >= res.meta.pages ? '#e5e7eb' : '#0B2442', color: page >= res.meta.pages ? '#9ca3af' : '#D1B46A', fontWeight: 600, fontSize: 13, cursor: page >= res.meta.pages ? 'default' : 'pointer' }}>
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}

function ActionBtn({ label, loadingLabel, isLoading, disabled, color, onClick }: {
  label: string; loadingLabel: string; isLoading: boolean; disabled: boolean; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '5px 12px', borderRadius: 5, border: 'none',
        background: isLoading ? '#9ca3af' : color,
        color: '#fff', fontSize: 12, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled && !isLoading ? 0.6 : 1,
        minWidth: 62,
        transition: 'background 0.15s',
      }}
    >
      {isLoading ? loadingLabel : label}
    </button>
  );
}
