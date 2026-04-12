'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { getMe, AuthUser } from '../../../lib/auth';
import { fmt } from '../../../lib/formatting';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Summary   { totalAffiliates: number; pendingAffiliates: number; activeAffiliates: number; totalLeads: number; totalClicks: number; totalConversions: number; }
interface Financial { pendingCommissions: number; availableCommissions: number; paidCommissions: number; totalPayments: number; }
interface TopAffiliate { affiliate: { id: string; name: string; refCode: string }; totalCommission: number; }

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function KpiCard({ label, value, accent, icon, sub }: { label: string; value: string | number; accent?: boolean; icon: string; sub?: string }) {
  return (
    <div style={{
      background: accent
        ? 'linear-gradient(135deg, #0B2442 0%, #0d2d52 100%)'
        : '#fff',
      borderRadius: 12, padding: '18px 20px',
      boxShadow: accent ? '0 8px 24px rgba(11,36,66,0.22)' : '0 2px 10px rgba(11,36,66,0.07)',
      border: accent ? 'none' : '1px solid #e5e7eb',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ color: accent ? 'rgba(255,255,255,0.55)' : '#9ca3af', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', margin: 0 }}>{label}</p>
        <span style={{ fontSize: 18, opacity: 0.7 }}>{icon}</span>
      </div>
      <p className="kpi-val" style={{ color: accent ? '#D1B46A' : '#111827' }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: accent ? 'rgba(255,255,255,0.4)' : '#9ca3af', margin: 0 }}>{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 4, height: 18, background: '#D1B46A', borderRadius: 2 }} />
        <h4 style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#0B2442', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{title}</h4>
      </div>
      {action}
    </div>
  );
}

const COLORS = ['#0B2442', '#D1B46A', '#16a34a', '#2563eb', '#dc2626'];

export default function AdminDashboard() {
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [financial, setFinancial] = useState<Financial | null>(null);
  const [top, setTop]             = useState<TopAffiliate[]>([]);
  const [user, setUser]           = useState<AuthUser | null>(null);
  const [error, setError]         = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get<Summary>('/admin/dashboard/summary'),
      api.get<Financial>('/admin/dashboard/financial'),
      api.get<TopAffiliate[]>('/admin/dashboard/top-affiliates').catch(() => []),
      getMe().catch(() => null),
    ])
      .then(([s, f, t, u]) => {
        if (!active) return;
        setSummary(s); setFinancial(f); setTop(t); setUser(u);
      })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);

  if (error) return <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, color: '#dc2626', fontSize: 14 }}>{error}</div>;
  if (!summary || !financial) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      Carregando dashboard...
    </div>
  );

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

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
      {/* ── Welcome bar ──────────────────────────────────────────── */}
      <div className="admin-welcome">
        <div>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
            {greeting()}
          </p>
          <h2 className="welcome-h2">{user?.name ?? 'Administrador'} 👋</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0, textTransform: 'capitalize' }}>{today}</p>
        </div>
        {summary.pendingAffiliates > 0 && (
          <a href="/admin/affiliates?status=PENDING"
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(209,180,106,0.15)', border: '1px solid rgba(209,180,106,0.3)', borderRadius: 10, padding: '10px 16px', textDecoration: 'none' }}>
            <span style={{ fontSize: 18 }}>⚠</span>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#D1B46A' }}>{summary.pendingAffiliates} pendente{summary.pendingAffiliates > 1 ? 's' : ''}</p>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>aguardando aprovação</p>
            </div>
          </a>
        )}
      </div>

      {/* ── KPIs Afiliados ───────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <SectionHeader title="Afiliados & Atividade" action={<a href="/admin/affiliates" style={{ fontSize: 12, color: '#D1B46A', textDecoration: 'none', fontWeight: 600 }}>Ver todos →</a>} />
        <div className="grid grid-4">
          <KpiCard label="Total Afiliados"  value={summary.totalAffiliates}  icon="👥" sub="cadastrados" />
          <KpiCard label="Pendentes"        value={summary.pendingAffiliates} icon="⏳" accent sub="aguardando" />
          <KpiCard label="Ativos"           value={summary.activeAffiliates}  icon="✅" sub="aprovados" />
          <KpiCard label="Conversões"       value={summary.totalConversions}  icon="🎯" accent sub="aprovadas" />
        </div>
      </div>

      {/* ── Gráficos ─────────────────────────────────────────────── */}
      <div className="charts-2col">
        <div className="card">
          <p style={{ fontSize: 11, fontWeight: 700, color: '#0B2442', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Funil de Atividade</p>
          {activityData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={activityData} barSize={36}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip formatter={(v) => [String(v), 'Total']} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {activityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#9ca3af', fontSize: 13 }}>
              <span style={{ fontSize: 32 }}>📊</span> Sem dados de atividade ainda
            </div>
          )}
        </div>

        <div className="card">
          <p style={{ fontSize: 11, fontWeight: 700, color: '#0B2442', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Distribuição de Afiliados</p>
          {affiliateChartData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <ResponsiveContainer width="55%" height={180} minWidth={130}>
                <PieChart>
                  <Pie data={affiliateChartData} dataKey="value" innerRadius={44} outerRadius={72} paddingAngle={3}>
                    {affiliateChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [String(v), 'Afiliados']} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'grid', gap: 8 }}>
                {affiliateChartData.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                    <span style={{ color: '#374151' }}>{d.name}: <strong style={{ color: '#0B2442' }}>{d.value}</strong></span>
                  </div>
                ))}
                <p style={{ fontSize: 22, fontWeight: 800, color: '#0B2442', margin: '4px 0 0' }}>
                  {summary.totalAffiliates}
                  <span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af', marginLeft: 4 }}>total</span>
                </p>
              </div>
            </div>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>Sem afiliados cadastrados</div>
          )}
        </div>
      </div>

      {/* ── Financeiro ───────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <SectionHeader title="Financeiro" action={<a href="/admin/payments" style={{ fontSize: 12, color: '#D1B46A', textDecoration: 'none', fontWeight: 600 }}>Ver pagamentos →</a>} />
        <div className="grid grid-4">
          <KpiCard label="Comissões Pendentes"  value={fmt(financial.pendingCommissions)}   icon="⏳" sub="aguardando" />
          <KpiCard label="Disponíveis p/ Pagar" value={fmt(financial.availableCommissions)} icon="💰" accent sub="prontas para pagar" />
          <KpiCard label="Comissões Pagas"      value={fmt(financial.paidCommissions)}      icon="✅" sub="total pago" />
          <KpiCard label="Total Desembolsado"   value={fmt(financial.totalPayments)}        icon="📊" accent sub="valor pago" />
        </div>
      </div>

      {/* ── Gráfico financeiro + Top Afiliados ───────────────────── */}
      <div className="charts-2col">
        <div className="card">
          <p style={{ fontSize: 11, fontWeight: 700, color: '#0B2442', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Comissões por Status</p>
          {financialChartData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={financialChartData} barSize={40}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} width={52} />
                <Tooltip formatter={(v) => [fmt(Number(v)), 'Valor']} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  <Cell fill="#D1B46A" />
                  <Cell fill="#0B2442" />
                  <Cell fill="#16a34a" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#9ca3af', fontSize: 13 }}>
              <span style={{ fontSize: 32 }}>💰</span> Sem dados financeiros ainda
            </div>
          )}
        </div>

        <div className="card">
          <p style={{ fontSize: 11, fontWeight: 700, color: '#0B2442', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>🏆 Top Afiliados</p>
          {top.length > 0 ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {top.slice(0, 5).map((t, i) => (
                <a key={t.affiliate.id} href={`/admin/affiliates/${t.affiliate.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: i === 0 ? 'linear-gradient(90deg, #f8f6f0, #fff)' : '#fafbfc', borderRadius: 8, border: i === 0 ? '1px solid #D1B46A' : '1px solid #f3f4f6', textDecoration: 'none' }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: i === 0 ? '#D1B46A' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: i === 0 ? '#0B2442' : '#9ca3af', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.affiliate.name}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, fontFamily: 'monospace' }}>{t.affiliate.refCode}</p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0B2442', flexShrink: 0 }}>{fmt(t.totalCommission)}</span>
                </a>
              ))}
            </div>
          ) : (
            <div style={{ height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#9ca3af', fontSize: 13 }}>
              <span style={{ fontSize: 32 }}>🏆</span> Sem ranking disponível ainda
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
