'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { fmt } from '../../../lib/formatting';

interface Lead { id: string; name: string; source: string; status: string; score: number; lossRisk: string; insuranceType?: string; assignedBroker?: { name: string }; updatedAt: string; }
interface InsuranceOpp { id: string; customerName: string; type: string; stage: string; score: number; premiumAmount?: number; owner?: { name: string }; }
interface Bottleneck { stage: string; stuckCount: number; totalPremium: number; }
interface ConversionStage { stage: string; count: number; conversionToNext: number | null; }
interface BrokerPerf { id: string; name: string; policies: number; totalLeads: number; converted: number; convRate: number; }
interface AlertItem { id: string; severity: string; title: string; message: string; lead?: { name: string }; insurance?: { customerName: string }; broker?: { name: string }; createdAt: string; }
interface ScoreDist { leads: Record<string, number>; insurances: Record<string, number>; }
interface WeekPoint { week: string; from: string; to: string; newLeads: number; converted: number; policies: number; }

interface Insights {
  forgottenLeads: Lead[];
  hotOpportunities: { leads: any[]; insurances: any[] };
  lowPerfBrokers: BrokerPerf[];
  conversionByStage: ConversionStage[];
  pipelineBottlenecks: Bottleneck[];
  criticalAlerts: AlertItem[];
  scoreDistribution: ScoreDist;
  weeklyTrend: WeekPoint[];
}

const STAGE_LABEL: Record<string, string> = {
  CONTATO_INICIAL: 'Contato Inicial', EM_COTACAO: 'Em Cotação', COTADO: 'Cotado',
  PROPOSTA_ENVIADA: 'Proposta Env.', PROPOSTA_ACEITA: 'Aceita', NEGOCIACAO: 'Negociação',
  APOLICE_EMITIDA: 'Apólice Emitida', PERDIDO: 'Perdido',
};
const RISK_COLOR: Record<string, string> = { LOW: '#16a34a', MEDIUM: '#d97706', HIGH: '#dc2626' };
const SEV_COLOR: Record<string, string> = { CRITICAL: '#dc2626', WARNING: '#d97706', INFO: '#6366f1' };

export default function AdminIntelligence() {
  const [data, setData]     = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState<'overview' | 'alerts' | 'leads' | 'pipeline'>('overview');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    api.get<{ data: Insights }>('/intelligence/insights?limit=10')
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  async function triggerScan() {
    setScanning(true);
    try {
      await api.post('/intelligence/alerts/scan', {});
      await api.post('/intelligence/score/recalculate', {});
      alert('Varredura e recálculo de scores agendados!');
    } catch (e: any) { alert(e.message); }
    finally { setScanning(false); }
  }

  const scoreColor = (s: number) => s >= 80 ? '#16a34a' : s >= 50 ? '#d97706' : '#9ca3af';

  if (loading) return <p>Carregando insights...</p>;
  if (!data) return <p style={{ color: '#dc2626' }}>Erro ao carregar insights.</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Inteligência Comercial</h2>
        <button onClick={triggerScan} disabled={scanning}
          style={{ padding: '8px 18px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          {scanning ? 'Agendando...' : '⚡ Varredura Agora'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['overview', 'alerts', 'leads', 'pipeline'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid #d1d5db', background: tab === t ? '#1d4ed8' : '#fff', color: tab === t ? '#fff' : '#374151', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            {t === 'overview' ? '📊 Visão Geral' : t === 'alerts' ? '🔔 Alertas' : t === 'leads' ? '🔥 Leads Quentes' : '🔧 Pipeline'}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Score distribution */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { title: 'Leads por Risco', data: data.scoreDistribution.leads },
              { title: 'Oportunidades por Risco', data: data.scoreDistribution.insurances },
            ].map(({ title, data: d }) => (
              <div key={title} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
                <h4 style={{ marginBottom: 14 }}>{title}</h4>
                {['HIGH', 'MEDIUM', 'LOW'].map((risk) => (
                  <div key={risk} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: RISK_COLOR[risk] }}>{risk}</span>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{d[risk] ?? 0}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Weekly trend */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
            <h4 style={{ marginBottom: 16 }}>Tendência Semanal</h4>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.weeklyTrend.length}, 1fr)`, gap: 12 }}>
              {data.weeklyTrend.map((w) => (
                <div key={w.week} style={{ textAlign: 'center', background: '#f9fafb', borderRadius: 8, padding: '12px 8px' }}>
                  <p style={{ fontSize: 10, color: '#9ca3af', marginBottom: 8 }}>{w.from}</p>
                  <p style={{ fontSize: 11, color: '#6b7280' }}>Leads</p>
                  <p style={{ fontWeight: 700, fontSize: 18, color: '#6366f1' }}>{w.newLeads}</p>
                  <p style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>Convertidos</p>
                  <p style={{ fontWeight: 700, fontSize: 18, color: '#16a34a' }}>{w.converted}</p>
                  <p style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>Apólices</p>
                  <p style={{ fontWeight: 700, fontSize: 18, color: '#1d4ed8' }}>{w.policies}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Low perf brokers */}
          {data.lowPerfBrokers.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
              <h4 style={{ marginBottom: 14, color: '#dc2626' }}>⚠️ Corretores sem emissão (30 dias)</h4>
              {data.lowPerfBrokers.map((b) => (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{b.name}</span>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                    <span>{b.totalLeads} leads</span>
                    <span>{b.converted} convertidos</span>
                    <span style={{ color: b.convRate < 20 ? '#dc2626' : '#374151', fontWeight: 700 }}>{b.convRate}% conv.</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ALERTAS CRÍTICOS ── */}
      {tab === 'alerts' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {data.criticalAlerts.map((a) => (
            <div key={a.id} style={{ background: '#fff', border: `1px solid ${SEV_COLOR[a.severity]}40`, borderLeft: `4px solid ${SEV_COLOR[a.severity]}`, borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{a.title}</span>
                <span style={{ fontSize: 11, color: SEV_COLOR[a.severity], fontWeight: 600, background: `${SEV_COLOR[a.severity]}15`, padding: '1px 8px', borderRadius: 10 }}>{a.severity}</span>
              </div>
              <p style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>{a.message}</p>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#9ca3af' }}>
                {a.broker && <span>👤 {a.broker.name}</span>}
                {a.lead && <span>📋 {a.lead.name}</span>}
                {a.insurance && <span>🛡 {a.insurance.customerName}</span>}
                <span>{new Date(a.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          ))}
          {data.criticalAlerts.length === 0 && (
            <p style={{ color: '#9ca3af', textAlign: 'center', padding: 32 }}>Nenhum alerta crítico.</p>
          )}
        </div>
      )}

      {/* ── LEADS QUENTES ── */}
      {tab === 'leads' && (
        <div style={{ display: 'grid', gap: 10 }}>
          <h3 style={{ marginBottom: 4 }}>Oportunidades com Score Alto</h3>
          {[...data.hotOpportunities.leads, ...data.hotOpportunities.insurances]
            .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
            .map((item: any) => (
              <div key={item.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14 }}>{item.name ?? item.customerName}</p>
                    <p style={{ fontSize: 12, color: '#6b7280' }}>
                      {item.entityType === 'LEAD' ? `Lead — ${item.source}` : `${item.type} — ${STAGE_LABEL[item.stage] ?? item.stage}`}
                    </p>
                    {item.premiumAmount && <p style={{ fontSize: 13, color: '#16a34a', fontWeight: 700 }}>{fmt(item.premiumAmount)}</p>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 24, fontWeight: 800, color: scoreColor(item.score ?? 0) }}>{item.score ?? '—'}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af' }}>{item.owner?.name ?? item.assignedBroker?.name ?? '—'}</p>
                  </div>
                </div>
              </div>
            ))}
          {data.hotOpportunities.leads.length === 0 && data.hotOpportunities.insurances.length === 0 && (
            <p style={{ color: '#9ca3af', textAlign: 'center', padding: 32 }}>Nenhuma oportunidade quente.</p>
          )}

          {/* Leads esquecidos */}
          {data.forgottenLeads.length > 0 && (
            <>
              <h3 style={{ marginTop: 20, marginBottom: 4, color: '#dc2626' }}>⚠️ Leads Esquecidos</h3>
              {data.forgottenLeads.map((l) => (
                <div key={l.id} style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14 }}>{l.name}</p>
                      <p style={{ fontSize: 12, color: '#6b7280' }}>{l.status} · {l.source}</p>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 12, color: '#9ca3af' }}>
                      <span style={{ color: RISK_COLOR[l.lossRisk], fontWeight: 700 }}>{l.lossRisk}</span>
                      <p>{l.assignedBroker?.name ?? '—'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── PIPELINE ── */}
      {tab === 'pipeline' && (
        <div style={{ display: 'grid', gap: 20 }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
            <h4 style={{ marginBottom: 16 }}>Funil de Conversão</h4>
            {data.conversionByStage.map((s) => (
              <div key={s.stage} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 12, minWidth: 140, color: '#374151', fontWeight: 500 }}>{STAGE_LABEL[s.stage] ?? s.stage}</span>
                <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, s.count * 3)}px`, height: '100%', background: '#1d4ed8', borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, minWidth: 30 }}>{s.count}</span>
                {s.conversionToNext !== null && (
                  <span style={{ fontSize: 11, color: s.conversionToNext < 30 ? '#dc2626' : s.conversionToNext < 60 ? '#d97706' : '#16a34a', minWidth: 45 }}>
                    → {s.conversionToNext}%
                  </span>
                )}
              </div>
            ))}
          </div>

          {data.pipelineBottlenecks.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
              <h4 style={{ marginBottom: 14, color: '#d97706' }}>⚠️ Gargalos do Pipeline</h4>
              {data.pipelineBottlenecks.map((b) => (
                <div key={b.stage} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{STAGE_LABEL[b.stage] ?? b.stage}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af' }}>Parados há 10+ dias</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 700, color: '#dc2626' }}>{b.stuckCount} oport.</p>
                    <p style={{ fontSize: 12, color: '#16a34a' }}>{fmt(b.totalPremium)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
