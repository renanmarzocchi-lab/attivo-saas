'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { fmt } from '../../../lib/formatting';

interface BusinessStats { total: number; policies: number; premiumTotal: number; conversionRate: number; }
interface DashData {
  refCode: string; status: string;
  totalLeads: number; totalClicks: number; totalConversions: number;
  availableCommission: number; paidCommission: number;
  businessStats?: BusinessStats;
}

function Card({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700, color: highlight ? '#16a34a' : '#111827' }}>{value}</p>
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

  if (error) return <p style={{ color: '#dc2626' }}>{error}</p>;
  if (!data)  return <p>Carregando...</p>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h2>Meu Dashboard</h2>
        <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 10px', borderRadius: 12, fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>
          {data.refCode}
        </span>
        <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
          {data.status}
        </span>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <Card label="Cliques"    value={data.totalClicks} />
        <Card label="Leads"      value={data.totalLeads} />
        <Card label="Conversões" value={data.totalConversions} />
      </div>

      <h4 style={{ color: '#6b7280', marginBottom: 12 }}>Financeiro</h4>
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <Card label="Disponível para Saque" value={fmt(data.availableCommission)} highlight />
        <Card label="Total Recebido"        value={fmt(data.paidCommission)} />
      </div>

      {data.businessStats && (
        <>
          <h4 style={{ color: '#6b7280', marginBottom: 12 }}>Negócios Originados</h4>
          <div className="grid grid-4">
            <Card label="Negócios Gerados"  value={data.businessStats.total} />
            <Card label="Apólices Emitidas" value={data.businessStats.policies} />
            <Card label="Taxa de Conversão" value={`${data.businessStats.conversionRate}%`} />
            <Card label="Prêmio Total"      value={fmt(data.businessStats.premiumTotal)} highlight />
          </div>
        </>
      )}
    </div>
  );
}
