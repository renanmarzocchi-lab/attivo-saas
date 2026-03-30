'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { fmt } from '../../../lib/formatting';

interface Summary  { totalAffiliates: number; pendingAffiliates: number; activeAffiliates: number; totalLeads: number; totalClicks: number; totalConversions: number; }
interface Financial{ pendingCommissions: number; availableCommissions: number; paidCommissions: number; totalPayments: number; }

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 700 }}>{value}</p>
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

  if (error) return <p style={{ color: '#dc2626' }}>{error}</p>;
  if (!summary || !financial) return <p>Carregando...</p>;

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Dashboard</h2>
      <h4 style={{ color: '#6b7280', marginBottom: 12 }}>Afiliados & Atividade</h4>
      <div className="grid grid-4" style={{ marginBottom: 28 }}>
        <Card label="Total Afiliados"  value={summary.totalAffiliates} />
        <Card label="Pendentes"        value={summary.pendingAffiliates} />
        <Card label="Ativos"           value={summary.activeAffiliates} />
        <Card label="Leads"            value={summary.totalLeads} />
        <Card label="Cliques"          value={summary.totalClicks} />
        <Card label="Conversões"       value={summary.totalConversions} />
      </div>
      <h4 style={{ color: '#6b7280', marginBottom: 12 }}>Financeiro</h4>
      <div className="grid grid-4">
        <Card label="Comissões Pendentes"   value={fmt(financial.pendingCommissions)} />
        <Card label="Disponíveis"           value={fmt(financial.availableCommissions)} />
        <Card label="Comissões Pagas"       value={fmt(financial.paidCommissions)} />
        <Card label="Total Pago"            value={fmt(financial.totalPayments)} />
      </div>
    </div>
  );
}
