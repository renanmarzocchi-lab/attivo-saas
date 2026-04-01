'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { fmt } from '../../../lib/formatting';

interface BrokerRank {
  position: number;
  broker: { id: string; name: string; email: string };
  totalPolicies: number;
  totalPremium: number;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  avgTicket: number;
  tasksCompleted: number;
}

interface TimePoint { month: string; count: number; premium: number }

export default function AdminRanking() {
  const [ranking, setRanking]   = useState<BrokerRank[]>([]);
  const [series, setSeries]     = useState<TimePoint[]>([]);
  const [from, setFrom]         = useState('');
  const [to, setTo]             = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to)   params.set('to', to);

    Promise.all([
      api.get<{ data: BrokerRank[] }>(`/admin/ranking?${params}`),
      api.get<{ data: TimePoint[] }>('/admin/ranking/timeseries?months=6'),
    ]).then(([r, s]) => {
      setRanking(r.data);
      setSeries(s.data);
    }).catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [from, to]);

  const medals = ['🥇', '🥈', '🥉'];
  const maxPremium = Math.max(...series.map((s) => s.premium), 1);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Ranking de Corretores</h2>
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

      {/* Gráfico de barras simples — prêmio por mês */}
      {series.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h4 style={{ marginBottom: 16 }}>Evolução de Prêmios (últimos 6 meses)</h4>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 100 }}>
            {series.map((s) => (
              <div key={s.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>{s.premium > 0 ? fmt(s.premium) : ''}</span>
                <div style={{
                  width: '100%', background: '#1d4ed8', borderRadius: '4px 4px 0 0',
                  height: `${Math.round((s.premium / maxPremium) * 80)}px`,
                  minHeight: 4,
                }} />
                <span style={{ fontSize: 10, color: '#9ca3af' }}>{s.month.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ranking */}
      {loading ? <p>Carregando...</p> : (
        <div style={{ display: 'grid', gap: 12 }}>
          {ranking.map((r) => (
            <div key={r.broker.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 28, minWidth: 44, textAlign: 'center' }}>
                {medals[r.position - 1] ?? `#${r.position}`}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 15 }}>{r.broker.name}</p>
                <p style={{ fontSize: 12, color: '#6b7280' }}>{r.broker.email}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 80px)', gap: 12, textAlign: 'center' }}>
                <MetricCell label="Apólices"   value={String(r.totalPolicies)}   color="#16a34a" />
                <MetricCell label="Prêmio"      value={fmt(r.totalPremium)}       color="#1d4ed8" />
                <MetricCell label="Leads"       value={String(r.totalLeads)} />
                <MetricCell label="Convertidos" value={String(r.convertedLeads)} color="#16a34a" />
                <MetricCell label="Conversão"   value={`${r.conversionRate}%`}   color="#1d4ed8" />
                <MetricCell label="Ticket Méd." value={fmt(r.avgTicket)} />
              </div>
            </div>
          ))}
          {ranking.length === 0 && (
            <div className="card"><p style={{ color: '#9ca3af' }}>Nenhum dado no período selecionado.</p></div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>{label}</p>
      <p style={{ fontWeight: 700, fontSize: 13, color: color ?? '#111827' }}>{value}</p>
    </div>
  );
}
