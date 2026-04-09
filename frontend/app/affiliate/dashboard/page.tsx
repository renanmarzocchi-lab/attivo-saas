'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { fmt, affiliateStatusColor, affiliateStatusLabel } from '../../../lib/formatting';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface BusinessStats { total: number; policies: number; premiumTotal: number; conversionRate: number; }
interface DashData {
  refCode: string; status: string;
  totalLeads: number; totalClicks: number; totalConversions: number;
  availableCommission: number; paidCommission: number;
  businessStats?: BusinessStats;
}

function StatCard({ label, value, highlight, icon }: { label: string; value: string | number; highlight?: boolean; icon?: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '18px 20px',
      boxShadow: '0 2px 10px rgba(11,36,66,0.07)',
      borderLeft: `4px solid ${highlight ? '#D1B46A' : '#e5e7eb'}`,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0 }}>{label}</p>
        {icon && <span style={{ fontSize: 18, opacity: 0.5 }}>{icon}</span>}
      </div>
      <p style={{ fontSize: 26, fontWeight: 800, color: highlight ? '#0B2442' : '#111827', margin: 0, lineHeight: 1 }}>{value}</p>
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

export default function AffiliateDashboard() {
  const [data, setData]   = useState<DashData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get<DashData>('/affiliate/dashboard')
      .then((d) => { if (active) setData(d); })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);

  if (error) return <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, color: '#dc2626', fontSize: 14 }}>{error}</div>;
  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Carregando dashboard...</div>;

  const funnelData = [
    { name: 'Cliques', value: data.totalClicks },
    { name: 'Leads', value: data.totalLeads },
    { name: 'Conversões', value: data.totalConversions },
  ];
  const funnelColors = ['#0B2442', '#D1B46A', '#16a34a'];

  const financialData = [
    { name: 'Disponível', value: Number(data.availableCommission) },
    { name: 'Recebido', value: Number(data.paidCommission) },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0B2442', margin: 0 }}>Meu Dashboard</h2>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Acompanhe sua performance como afiliado</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ background: '#f0f4f8', color: '#0B2442', padding: '4px 12px', borderRadius: 6, fontSize: 13, fontWeight: 700, fontFamily: 'monospace', border: '1px solid #dbe4f0' }}>
            {data.refCode}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, color: '#fff', background: affiliateStatusColor[data.status] ?? '#6b7280' }}>
            {affiliateStatusLabel[data.status] ?? data.status}
          </span>
        </div>
      </div>

      {/* KPIs Atividade */}
      <div style={{ marginBottom: 32 }}>
        <SectionHeader title="Atividade" />
        <div className="grid grid-4">
          <StatCard label="Cliques" value={data.totalClicks} icon="🖱️" />
          <StatCard label="Leads" value={data.totalLeads} icon="📋" />
          <StatCard label="Conversões" value={data.totalConversions} icon="🎯" highlight />
        </div>
      </div>

      {/* Gráficos lado a lado */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
        {/* Funil */}
        <div className="card">
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0B2442', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Funil de Indicações</p>
          {funnelData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={funnelData} barSize={48}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [String(v), 'Total']} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {funnelData.map((_, i) => <Cell key={i} fill={funnelColors[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14 }}>Compartilhe seu link para começar a gerar dados</div>
          )}
        </div>

        {/* Financeiro visual */}
        <div className="card">
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0B2442', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resumo Financeiro</p>
          {financialData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={financialData} barSize={56} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip formatter={(v) => [fmt(Number(v)), 'Valor']} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  <Cell fill="#D1B46A" />
                  <Cell fill="#16a34a" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14 }}>Sem dados financeiros ainda</div>
          )}
        </div>
      </div>

      {/* KPIs Financeiro */}
      <div style={{ marginBottom: 32 }}>
        <SectionHeader title="Financeiro" />
        <div className="grid grid-4">
          <StatCard label="Disponível para Saque" value={fmt(data.availableCommission)} icon="💰" highlight />
          <StatCard label="Total Recebido" value={fmt(data.paidCommission)} icon="✅" />
        </div>
      </div>

      {/* Negócios Originados */}
      {data.businessStats && (
        <div>
          <SectionHeader title="Negócios Originados" />
          <div className="grid grid-4">
            <StatCard label="Negócios Gerados" value={data.businessStats.total} icon="🤝" />
            <StatCard label="Apólices Emitidas" value={data.businessStats.policies} icon="📄" />
            <StatCard label="Taxa de Conversão" value={`${data.businessStats.conversionRate}%`} icon="📈" highlight />
            <StatCard label="Prêmio Total" value={fmt(data.businessStats.premiumTotal)} icon="🏆" highlight />
          </div>
        </div>
      )}
    </div>
  );
}
