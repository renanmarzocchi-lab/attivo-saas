'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../../../lib/api';

// ── Types ──────────────────────────────────────────────────────────

interface Alert {
  id: string; type: string; severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string; message: string; isRead: boolean; createdAt: string;
  lead?: { id: string; name: string };
  insurance?: { id: string; customerName: string; type: string };
}
interface AlertSummary { total: number; critical: number; warning: number; unread: number; }
interface NextAction {
  actionType: string; title: string; description: string;
  priority: string; channel: string; deadline: string | null;
}
interface LeadNBA { leadId: string; name: string; score: number; label: string; action: NextAction | null; }

// ── Constants ──────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: '#dc2626', WARNING: '#d97706', INFO: '#6366f1',
};
const SEVERITY_BG: Record<string, string> = {
  CRITICAL: '#fef2f2', WARNING: '#fffbeb', INFO: '#eef2ff',
};
const PRIORITY_COLOR: Record<string, string> = {
  URGENT: '#dc2626', HIGH: '#d97706', MEDIUM: '#6366f1', LOW: '#9ca3af',
};
const SCORE_COLOR = (s: number) => s >= 80 ? '#16a34a' : s >= 50 ? '#d97706' : '#9ca3af';
const SCORE_LABEL = (s: number) => s >= 80 ? 'QUENTE 🔥' : s >= 50 ? 'MORNO 🌡️' : 'FRIO 🧊';

// ── Component ──────────────────────────────────────────────────────

export default function BrokerIntelligence() {
  const [summary, setSummary]   = useState<AlertSummary | null>(null);
  const [alerts, setAlerts]     = useState<Alert[]>([]);
  const [leads, setLeads]       = useState<LeadNBA[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<'alerts' | 'leads'>('alerts');
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatedMsg, setGeneratedMsg] = useState<{ id: string; text: string } | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<AlertSummary>('/intelligence/alerts/summary'),
      api.get<{ data: Alert[] }>('/intelligence/alerts?limit=20&resolved=false'),
    ]).then(([s, a]) => {
      setSummary(s);
      setAlerts(a.data);
    }).finally(() => setLoading(false));
  }, []);

  const fetchLeadActions = useCallback(async () => {
    // Busca leads ativos e calcula next action para cada um
    try {
      const { data } = await api.get<{ data: Array<{ id: string; name: string; score: number; lossRisk: string }> }>(
        '/leads?limit=20&status=IN_PROGRESS'
      );
      const actions = await Promise.all(
        data.slice(0, 10).map(async (lead) => {
          try {
            const r = await api.get<{ action: NextAction; score: number; label: string }>(
              `/intelligence/next-action/lead/${lead.id}`
            );
            return { leadId: lead.id, name: lead.name, score: r.score, label: r.label, action: r.action };
          } catch {
            return { leadId: lead.id, name: lead.name, score: lead.score, label: '', action: null };
          }
        })
      );
      setLeads(actions);
    } catch {}
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (tab === 'leads') fetchLeadActions();
  }, [tab, fetchLeadActions]);

  async function markRead(alertId: string) {
    await api.patch(`/intelligence/alerts/${alertId}/read`, {});
    setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, isRead: true } : a));
    setSummary((s) => s ? { ...s, unread: Math.max(0, s.unread - 1) } : s);
  }

  async function resolveAlert(alertId: string) {
    await api.patch(`/intelligence/alerts/${alertId}/resolve`, {});
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    setSummary((s) => s ? { ...s, total: Math.max(0, s.total - 1) } : s);
  }

  async function generateMsg(leadId: string, name: string, actionType: string) {
    setGenerating(leadId);
    try {
      const { message } = await api.post<{ message: string }>('/intelligence/message/generate', {
        channel:    'WHATSAPP',
        actionType,
        entityType: 'LEAD',
        entityId:   leadId,
      });
      setGeneratedMsg({ id: leadId, text: message });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Inteligência Comercial</h2>

      {/* KPI Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Alertas Ativos', value: summary.total,    color: '#374151' },
            { label: 'Críticos',       value: summary.critical, color: '#dc2626' },
            { label: 'Avisos',         value: summary.warning,  color: '#d97706' },
            { label: 'Não Lidos',      value: summary.unread,   color: '#6366f1' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 18px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: 28, fontWeight: 800, color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['alerts', 'leads'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #d1d5db', background: tab === t ? '#1d4ed8' : '#fff', color: tab === t ? '#fff' : '#374151', cursor: 'pointer', fontWeight: 600 }}>
            {t === 'alerts' ? '🔔 Alertas' : '🎯 Próximas Ações'}
          </button>
        ))}
      </div>

      {loading ? <p>Carregando...</p> : (
        <>
          {/* ── ALERTAS ── */}
          {tab === 'alerts' && (
            <div style={{ display: 'grid', gap: 10 }}>
              {alerts.map((alert) => (
                <div key={alert.id} style={{
                  background: SEVERITY_BG[alert.severity],
                  border: `1px solid ${SEVERITY_COLOR[alert.severity]}40`,
                  borderLeft: `4px solid ${SEVERITY_COLOR[alert.severity]}`,
                  borderRadius: 10, padding: '14px 16px',
                  opacity: alert.isRead ? 0.7 : 1,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{alert.title}</span>
                        <span style={{ fontSize: 11, color: SEVERITY_COLOR[alert.severity], fontWeight: 600, background: `${SEVERITY_COLOR[alert.severity]}20`, padding: '1px 8px', borderRadius: 10 }}>
                          {alert.severity}
                        </span>
                        {!alert.isRead && (
                          <span style={{ fontSize: 10, background: '#1d4ed8', color: '#fff', padding: '1px 6px', borderRadius: 10 }}>NOVO</span>
                        )}
                      </div>
                      <p style={{ fontSize: 13, color: '#374151', marginBottom: 6 }}>{alert.message}</p>
                      {alert.lead && (
                        <a href={`/broker/leads`} style={{ fontSize: 12, color: '#1d4ed8', textDecoration: 'none' }}>
                          📋 Lead: {alert.lead.name}
                        </a>
                      )}
                      {alert.insurance && (
                        <a href={`/broker/insurance/${alert.insurance.id}`} style={{ fontSize: 12, color: '#1d4ed8', textDecoration: 'none', marginLeft: alert.lead ? 12 : 0 }}>
                          🛡 {alert.insurance.customerName}
                        </a>
                      )}
                      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                        {new Date(alert.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginLeft: 12 }}>
                      {!alert.isRead && (
                        <button onClick={() => markRead(alert.id)}
                          style={{ padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}>
                          Lido
                        </button>
                      )}
                      <button onClick={() => resolveAlert(alert.id)}
                        style={{ padding: '4px 10px', border: 'none', borderRadius: 6, background: '#16a34a', color: '#fff', cursor: 'pointer', fontSize: 12 }}>
                        Resolver
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 32, textAlign: 'center' }}>
                  <p style={{ fontSize: 24, marginBottom: 8 }}>✅</p>
                  <p style={{ color: '#16a34a', fontWeight: 600 }}>Nenhum alerta ativo!</p>
                  <p style={{ color: '#9ca3af', fontSize: 13 }}>Sua carteira está em dia.</p>
                </div>
              )}
            </div>
          )}

          {/* ── PRÓXIMAS AÇÕES ── */}
          {tab === 'leads' && (
            <div style={{ display: 'grid', gap: 10 }}>
              {leads.map((l) => (
                <div key={l.leadId} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{l.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: SCORE_COLOR(l.score) }}>
                          {l.score} — {SCORE_LABEL(l.score)}
                        </span>
                        {/* Score bar */}
                        <div style={{ flex: 1, maxWidth: 100, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${l.score}%`, height: '100%', background: SCORE_COLOR(l.score), borderRadius: 3 }} />
                        </div>
                      </div>

                      {l.action ? (
                        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: PRIORITY_COLOR[l.action.priority], background: `${PRIORITY_COLOR[l.action.priority]}15`, padding: '1px 8px', borderRadius: 10 }}>
                              {l.action.priority}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{l.action.title}</span>
                          </div>
                          <p style={{ fontSize: 13, color: '#374151', marginBottom: 8 }}>{l.action.description}</p>
                          {l.action.deadline && (
                            <p style={{ fontSize: 11, color: '#9ca3af' }}>
                              Prazo: {new Date(l.action.deadline).toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p style={{ fontSize: 13, color: '#9ca3af' }}>Sem ação pendente.</p>
                      )}
                    </div>

                    {/* Gerar mensagem */}
                    {l.action && l.action.channel !== 'NONE' && (
                      <div style={{ marginLeft: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <button
                          disabled={generating === l.leadId}
                          onClick={() => generateMsg(l.leadId, l.name, l.action!.actionType)}
                          style={{ padding: '6px 14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {generating === l.leadId ? '...' : '💬 Gerar Mensagem'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Mensagem gerada */}
                  {generatedMsg?.id === l.leadId && (
                    <div style={{ marginTop: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', marginBottom: 6 }}>MENSAGEM WHATSAPP SUGERIDA:</p>
                      <pre style={{ fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>
                        {generatedMsg.text}
                      </pre>
                      <button
                        onClick={() => { navigator.clipboard.writeText(generatedMsg.text); }}
                        style={{ marginTop: 8, padding: '4px 10px', border: '1px solid #bbf7d0', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 11, color: '#16a34a' }}>
                        📋 Copiar
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {leads.length === 0 && (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 32, textAlign: 'center' }}>
                  <p style={{ color: '#9ca3af' }}>Nenhum lead ativo com ações pendentes.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
