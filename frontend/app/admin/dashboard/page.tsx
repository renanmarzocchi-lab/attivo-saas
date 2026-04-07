'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { fmt } from '../../../lib/formatting';

interface Summary  { totalAffiliates: number; pendingAffiliates: number; activeAffiliates: number; totalLeads: number; totalClicks: number; totalConversions: number; }
interface Financial{ pendingCommissions: number; availableCommissions: number; paidCommissions: number; totalPayments: number; }

function StatCard({ label, value, accent, icon }: { label: string; value: string | number; accent?: boolean; icon?: string }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 10,
      padding: '18px 20px',
      boxShadow: '0 2px 10px rgba(11,36,66,0.07)',
      borderLeft: `4px solid ${accent ? '#D1B46A' : '#e5e7eb'}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
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

export default function AdminDashboard() {
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [financial, setFinancial] = useState<Financial | null>(null);
  const [error, setError]         = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([api.get<Summary>('/admin/dashboard/summary'), api.get<Financial>('/admin/dashboard/financial')])
      .then(([s, f]) => { if (active) { setSummary(s); setFinancial(f); } })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);

  if (error) return (
    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, color: '#dc2626', fontSize: 14 }}>{error}</div>
  );
  if (!summary || !financial) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Carregando dashboard...</div>
  );

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0B2442', margin: 0 }}>Dashboard</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Visão geral da plataforma ATTIVO</p>
      </div>

      <div style={{ marginBottom: 32 }}>
        <SectionHeader title="Afiliados & Atividade" />
        <div className="grid grid-4">
          <StatCard label="Total Afiliados"  value={summary.totalAffiliates}  icon="👥" />
          <StatCard label="Pendentes"        value={summary.pendingAffiliates} icon="⏳" accent />
          <StatCard label="Ativos"           value={summary.activeAffiliates}  icon="✅" />
          <StatCard label="Leads"            value={summary.totalLeads}        icon="📋" />
          <StatCard label="Cliques"          value={summary.totalClicks}       icon="🖱️" />
          <StatCard label="Conversões"       value={summary.totalConversions}  icon="🎯" accent />
        </div>
      </div>

      <div>
        <SectionHeader title="Financeiro" />
        <div className="grid grid-4">
          <StatCard label="Comissões Pendentes"  value={fmt(financial.pendingCommissions)}   icon="⏳" />
          <StatCard label="Disponíveis"          value={fmt(financial.availableCommissions)} icon="💰" accent />
          <StatCard label="Comissões Pagas"      value={fmt(financial.paidCommissions)}      icon="✅" />
          <StatCard label="Total Pago"           value={fmt(financial.totalPayments)}        icon="📊" accent />
        </div>
      </div>
    </div>
  );
}
