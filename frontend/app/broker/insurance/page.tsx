'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { fmt, fmtDate, conversionStatusColor } from '../../../lib/formatting';

const STAGE_LABEL: Record<string, string> = {
  LEAD: 'Lead', EM_COTACAO: 'Em Cotação', COTADO: 'Cotado',
  PROPOSTA_ENVIADA: 'Proposta Enviada', PROPOSTA_ACEITA: 'Proposta Aceita',
  APOLICE_EMITIDA: 'Apólice Emitida', PERDIDO: 'Perdido', CANCELADO: 'Cancelado',
};
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#16a34a', EXPIRING_SOON: '#d97706', EXPIRED: '#dc2626', CANCELED: '#9ca3af',
};
const STAGE_COLOR: Record<string, string> = {
  LEAD: '#6366f1', EM_COTACAO: '#0ea5e9', COTADO: '#f59e0b',
  PROPOSTA_ENVIADA: '#8b5cf6', PROPOSTA_ACEITA: '#10b981',
  APOLICE_EMITIDA: '#16a34a', PERDIDO: '#ef4444', CANCELADO: '#9ca3af',
};

interface Record { id: string; type: string; stage: string; insurer?: string; status: string; customerName: string; premiumAmount?: number; endDate?: string; owner: { name: string }; createdAt: string; }
interface Res { data: Record[]; meta: { total: number; page: number; pages: number } }

export default function BrokerInsurance() {
  const [res, setRes]       = useState<Res | null>(null);
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [stage, setStage]   = useState('');
  const [error, setError]   = useState('');

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    if (stage)  params.set('stage', stage);
    api.get<Res>(`/broker/insurance?${params}`)
      .then((r) => { if (active) setRes(r); })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [page, search, stage]);

  if (error) return <p style={{ color: '#dc2626' }}>{error}</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Carteira de Seguros</h2>
        <a href="/broker/insurance/new" style={{ background: '#1d4ed8', color: '#fff', padding: '8px 16px', borderRadius: 6, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
          + Novo
        </a>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input placeholder="Buscar por cliente..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, minWidth: 200 }} />
        <select value={stage} onChange={(e) => { setStage(e.target.value); setPage(1); }}
          style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}>
          <option value="">Todos os stages</option>
          {Object.entries(STAGE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {!res ? <p>Carregando...</p> : (
        <>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  {['Cliente', 'Tipo', 'Stage', 'Seguradora', 'Prêmio', 'Vencimento', 'Status', ''].map(h =>
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {res.data.map(r => (
                  <tr key={r.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', fontSize: 14, fontWeight: 500 }}>{r.customerName}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{r.type}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: STAGE_COLOR[r.stage] ?? '#374151', background: `${STAGE_COLOR[r.stage]}18`, padding: '2px 8px', borderRadius: 10 }}>
                        {STAGE_LABEL[r.stage] ?? r.stage}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{r.insurer ?? '-'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600 }}>{r.premiumAmount ? fmt(r.premiumAmount) : '-'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{fmtDate(r.endDate)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLOR[r.status] ?? '#374151' }}>{r.status}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <a href={`/broker/insurance/${r.id}`} style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600 }}>Ver</a>
                    </td>
                  </tr>
                ))}
                {res.data.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Nenhum registro encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer' }}>Anterior</button>
            <span style={{ fontSize: 13 }}>Página {res.meta.page} de {res.meta.pages} ({res.meta.total} total)</span>
            <button disabled={page >= res.meta.pages} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer' }}>Próxima</button>
          </div>
        </>
      )}
    </div>
  );
}
