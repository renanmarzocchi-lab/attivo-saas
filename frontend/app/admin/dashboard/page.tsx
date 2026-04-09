'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { fmt } from '../../../lib/formatting';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Summary  { totalAffiliates: number; pendingAffiliates: number; activeAffiliates: number; totalLeads: number; totalClicks: number; totalConversions: number; }
interface Financial{ pendingCommissions: number; availableCommissions: number; paidCommissions: number; totalPayments: number; }
interface TopAffiliate { affiliate: { id: string; name: string; refCode: string }; totalCommission: number; }

function StatCard({ label, value, accent, icon }: { label: string; value: string | number; accent?: boolean; icon?: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '18px 20px',
      boxShadow: '0 2px 10px rgba(11,36,66,0.07)',
      borderLeft: `4px solid ${accent ? '#D1B46A' : '#e5e7eb'}`,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0 }}>{label}</p>
        {icon && <span style={{ fontSize: 18, opacity: 0.5 }}>{icon}</span>}
      </div>
      <p style={{ fontSize: 28, fontWeight: 800, color: accent ? '#0B2442' : '#111827', margin: 0, lineHeight: 1 }}>{value}</p>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <div style={{ width: 4, height: 20, background: '#D1B46A', borderRadius: 2 }} />
      <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0B2442', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{title}</h4>
    </div>
  );
}

const COLORS = ['#0B2442', '#D1B46A', '#16a34a', '#2563eb', '#dc2626', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16'];

export default function AdminDashboard() {
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [financial, setFinancial] = useState<Financial | null>(null);
  const [top, setTop]             = useState<TopAffiliate[]>([]);
  const [error, setError]         = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get<Summary>('/admin/dashboard/summary'),
      api.get<Financial>('/admin/dashboard/financial'),
      api.get<TopAffiliate[]>('/admin/dashboard/top-affiliates').catch(() => []),
    ])
      .then(([s, f, t]) => { if (active) { setSummary(s); setFinancial(f); setTop(t); } })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);

  if (error) return <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, color: '#dc2626', fontSize: 14 }}>{error}</div>;
  if (!summary || !financial) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Carregando dashboard...</div>;

  const affiliateChartData = [
    { name: 'Ativos', value: summary.activeAffiliates, color: '#16a34a' },
    { name: 'Pendentes', value: summary.pendingAffiliates, color: '#D1B46A' },
    { name: 'Outros', value: Math.max(0, summary.totalAffiliates - summary.activeAffiliates - summary.pendingAffiliates), color: '#e5e7eb' },
  ].filter(d => d.value > 0);

  const financialChartData = [
    { name: 'Pendentes', value: Number(financial.pendingCommissions) },
    { name: 'Disponíveis', value: Number(financial.availableCommissions) },
    { name: 'Pagas', value: Number(financial.paidCommissions) },
  ];

  const activityData = [
    { name: 'Cliques', value: summary.totalClicks },
    { name: 'Leads', value: summary.totalLeads },
    { name: 'Conversões', value: summary.totalConversions },
  ];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0B2442', margin: 0 }}>Dashboard</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Visão geral da plataforma ATTIVO</p>
      </div>

      {/* KPIs */}
      <div style={{ marginBottom: 32 }}>
        <SectionHeader title="Afiliados & Atividade" />
        <div className="grid grid-4">
          <StatCard label="Total Afiliados" value={summary.totalAffiliates} icon="👥" />
          <StatCard label="Pendentes" value={summary.pendingAffiliates} icon="⏳" accent />
          <StatCard label="Ativos" value={summary.activeAffiliates} icon="✅" />
          <StatCard label="Conversões" value={summary.totalConversions} icon="🎯" accent />
        </div>
      </div>

      {/* Gráficos lado a lado */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
        {/* Gráfico de Atividade */}
        <div className="card">
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0B2442', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Funil de Atividade</p>
          {activityData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={activityData} barSize={40}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [String(v), 'Total']} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {activityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14 }}>Sem dados de atividade ainda</div>
          )}
        </div>

        {/* Gráfico de Afiliados */}
        <div className="card">
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0B2442', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Distribuição de Afiliados</p>
          {affiliateChartData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={affiliateChartData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {affiliateChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [String(v), 'Afiliados']} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'grid', gap: 8 }}>
                {affiliateChartData.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                    <span style={{ color: '#374151' }}>{d.name}: <strong>{d.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14 }}>Sem afiliados cadastrados</div>
          )}
        </div>
      </div>

      {/* Financeiro */}
      <div style={{ marginBottom: 32 }}>
        <SectionHeader title="Financeiro" />
        <div className="grid grid-4">
          <StatCard label="Comissões Pendentes" value={fmt(financial.pendingCommissions)} icon="⏳" />
          <StatCard label="Disponíveis" value={fmt(financial.availableCommissions)} icon="💰" accent />
          <StatCard label="Comissões Pagas" value={fmt(financial.paidCommissions)} icon="✅" />
          <StatCard label="Total Pago" value={fmt(financial.totalPayments)} icon="📊" accent />
        </div>
      </div>

      {/* Gráfico Financeiro + Ranking */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0B2442', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Comissões por Status</p>
          {financialChartData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={financialChartData} barSize={48}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} />
                <Tooltip formatter={(v) => [fmt(Number(v)), 'Valor']} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  <Cell fill="#D1B46A" />
                  <Cell fill="#0B2442" />
                  <Cell fill="#16a34a" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14 }}>Sem dados financeiros ainda</div>
          )}
        </div>

        {/* Top Afiliados */}
        <div className="card">
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0B2442', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>🏆 Top Afiliados</p>
          {top.length > 0 ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {top.slice(0, 5).map((t, i) => (
                <div key={t.affiliate.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', background: i === 0 ? '#f8f6f0' : '#fafbfc', borderRadius: 8, border: i === 0 ? '1px solid #D1B46A' : '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: i === 0 ? '#D1B46A' : '#9ca3af', minWidth: 28 }}>#{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{t.affiliate.name}</p>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{t.affiliate.refCode}</p>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0B2442' }}>{fmt(t.totalCommission)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14 }}>Sem ranking disponível ainda</div>
          )}
        </div>
      </div>
    </div>
  );
}
