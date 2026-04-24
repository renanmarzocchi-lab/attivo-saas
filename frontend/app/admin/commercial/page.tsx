'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { fmt } from '../../../lib/formatting';

interface KPIs {
  policiesEmitted: number;
  totalPremium: number;
  leadsCreated: number;
  leadsConverted: number;
  conversionRate: number;
  expiringSoon: number;
  overdueTasks: number;
  activeBrokers: number;
}

interface PipelineStage { stage: string; count: number; premium: number }
interface ByType { type: string; count: number; premium: number }

interface DashboardData {
  period: { from: string; to: string };
  kpis: KPIs;
  pipeline: Record<string, { count: number; premium: number }>;
}

interface PipelineResp {
  byStage: PipelineStage[];
  byType:  ByType[];
}

const STAGE_LABEL: Record<string, string> = {
  CONTATO_INICIAL: 'Contato Inicial', EM_COTACAO: 'Em Cotação', COTADO: 'Cotado',
  PROPOSTA_ENVIADA: 'Proposta Env.', PROPOSTA_ACEITA: 'Proposta Aceita',
  NEGOCIACAO: 'Negociação', APOLICE_EMITIDA: 'Apólice Emitida',
};

function KpiCard({ label, value, color, sub }: { label: string; value: string | number; color?: string; sub?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
      <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 800, color: color ?? '#111827', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

export default function AdminCommercialDashboard() {
  const [dash, setDash]       = useState<DashboardData | null>(null);
  const [pipeline, setPipeline] = useState<PipelineResp | null>(null);
  const [from, setFrom]       = useState('');
  const [to, setTo]           = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to)   params.set('to', to);

    Promise.all([
      api.get<DashboardData>(`/admin/commercial/dashboard?${params}`),
      api.get<PipelineResp>('/admin/commercial/pipeline'),
    ]).then(([d, p]) => {
      setDash(d);
      setPipeline(p);
    }).catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [from, to]);

  const kpis = dash?.kpis;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Dashboard Comercial</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: '#6b7280' }}>De:</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
          <label style={{ fontSize: 13, color: '#6b7280' }}>Até:</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
        </div>
      </div>

      {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}

      {loading ? <p>Carregando...</p> : (
        <>
          {/* KPIs */}
          {kpis && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
              <KpiCard label="Apólices Emitidas" value={kpis.policiesEmitted} color="#16a34a" />
              <KpiCard label="Prêmio Total"       value={fmt(kpis.totalPremium)} color="#1d4ed8" />
              <KpiCard label="Leads Criados"      value={kpis.leadsCreated} color="#6366f1" />
              <KpiCard label="Leads Convertidos"  value={kpis.leadsConverted} color="#16a34a"
                sub={`${kpis.conversionRate}% de conversão`} />
              <KpiCard label="A Vencer em breve"  value={kpis.expiringSoon} color="#d97706" />
              <KpiCard label="Tarefas Vencidas"   value={kpis.overdueTasks} color="#dc2626" />
              <KpiCard label="Corretores Ativos"  value={kpis.activeBrokers} />
              <KpiCard label="Taxa de Conversão"  value={`${kpis.conversionRate}%`} color="#1d4ed8" />
            </div>
          )}

          {/* Pipeline atual */}
          {pipeline && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
                <h4 style={{ marginBottom: 14 }}>Pipeline Atual — Por Stage</h4>
                {pipeline.byStage.map((s) => (
                  <div key={s.stage} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: 13 }}>{STAGE_LABEL[s.stage] ?? s.stage}</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{s.count}</span>
                      {s.premium > 0 && (
                        <span style={{ fontSize: 11, color: '#16a34a', marginLeft: 8 }}>{fmt(s.premium)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
                <h4 style={{ marginBottom: 14 }}>Por Tipo de Seguro</h4>
                {pipeline.byType.sort((a, b) => b.premium - a.premium).map((t) => (
                  <div key={t.type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: 13 }}>{t.type}</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{t.count}</span>
                      {t.premium > 0 && (
                        <span style={{ fontSize: 11, color: '#16a34a', marginLeft: 8 }}>{fmt(t.premium)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
