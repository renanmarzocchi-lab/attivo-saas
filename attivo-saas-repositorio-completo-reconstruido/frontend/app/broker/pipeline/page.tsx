'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { fmt, fmtDate } from '../../../lib/formatting';

const STAGE_LABELS: Record<string, string> = {
  LEAD: 'Lead', EM_COTACAO: 'Em Cotação', COTADO: 'Cotado',
  PROPOSTA_ENVIADA: 'Proposta Enviada', PROPOSTA_ACEITA: 'Proposta Aceita',
  APOLICE_EMITIDA: 'Apólice Emitida',
};
const STAGE_COLORS: Record<string, string> = {
  LEAD: '#6366f1', EM_COTACAO: '#0ea5e9', COTADO: '#f59e0b',
  PROPOSTA_ENVIADA: '#8b5cf6', PROPOSTA_ACEITA: '#10b981', APOLICE_EMITIDA: '#16a34a',
};
const TYPE_ICON: Record<string, string> = {
  AUTO: '🚗', RESIDENCIAL: '🏠', EMPRESARIAL: '🏢', VIDA: '❤️', PREVIDENCIA: '📊',
  SAUDE: '🏥', ODONTO: '🦷', VIAGEM: '✈️', RC: '⚖️', EQUIPAMENTOS: '🔧', OUTROS: '📋',
};

interface CardRecord { id: string; type: string; stage: string; insurer?: string; customerName: string; customerPhone?: string; premiumAmount?: number; endDate?: string; owner: { name: string }; }
interface PipelineData { pipeline: Record<string, CardRecord[]>; totals: Record<string, { count: number; premium: number }> }

export default function BrokerPipeline() {
  const [data, setData]   = useState<PipelineData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get<PipelineData>('/broker/pipeline')
      .then((r) => { if (active) setData(r); })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);

  if (error) return <p style={{ color: '#dc2626' }}>{error}</p>;
  if (!data)  return <p>Carregando pipeline...</p>;

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Pipeline Comercial</h2>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
        {Object.keys(STAGE_LABELS).map((stage) => {
          const cards  = data.pipeline[stage] ?? [];
          const totals = data.totals[stage];
          const color  = STAGE_COLORS[stage];
          return (
            <div key={stage} style={{ minWidth: 220, maxWidth: 240, flexShrink: 0 }}>
              {/* Cabeçalho da coluna */}
              <div style={{ background: color, color: '#fff', padding: '10px 12px', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{STAGE_LABELS[stage]}</span>
                <span style={{ background: 'rgba(255,255,255,0.3)', borderRadius: 12, padding: '1px 8px', fontSize: 12, fontWeight: 700 }}>{totals.count}</span>
              </div>
              {/* Prêmio total da coluna */}
              {totals.premium > 0 && (
                <div style={{ background: `${color}15`, padding: '4px 12px', fontSize: 12, color, fontWeight: 600, borderLeft: `3px solid ${color}` }}>
                  {fmt(totals.premium)}
                </div>
              )}
              {/* Cards */}
              <div style={{ background: '#f8fafc', borderRadius: '0 0 8px 8px', padding: 8, minHeight: 100, display: 'grid', gap: 8 }}>
                {cards.map((r) => (
                  <a key={r.id} href={`/broker/insurance/${r.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: '#fff', borderRadius: 8, padding: 10, boxShadow: '0 1px 4px rgba(0,0,0,.08)', borderLeft: `3px solid ${color}`, cursor: 'pointer' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>
                        {TYPE_ICON[r.type] ?? '📋'} {r.customerName}
                      </p>
                      {r.insurer && <p style={{ fontSize: 11, color: '#6b7280' }}>{r.insurer}</p>}
                      {r.premiumAmount && (
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>{fmt(r.premiumAmount)}</p>
                      )}
                      {r.endDate && (
                        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                          Vcto: {fmtDate(r.endDate)}
                        </p>
                      )}
                      <p style={{ fontSize: 10, color: '#d1d5db', marginTop: 4 }}>{r.owner?.name}</p>
                    </div>
                  </a>
                ))}
                {cards.length === 0 && (
                  <p style={{ fontSize: 12, color: '#d1d5db', textAlign: 'center', padding: 8 }}>Nenhum registro</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
