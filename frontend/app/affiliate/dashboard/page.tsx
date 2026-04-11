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
  totalEarnings: number; monthlyEarnings: number; ranking: number;
  businessStats?: BusinessStats;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{ width: 4, height: 20, background: '#D1B46A', borderRadius: 2 }} />
      <h4 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0B2442', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{title}</h4>
    </div>
  );
}

function MiniCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '16px 18px', boxShadow: '0 2px 8px rgba(11,36,66,0.07)' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 8px' }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 800, color: '#0B2442', margin: 0, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>{sub}</p>}
    </div>
  );
}

export default function AffiliateDashboard() {
  const [data, setData]     = useState<DashData | null>(null);
  const [error, setError]   = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    api.get<DashData>('/affiliate/dashboard')
      .then((d) => { if (active) setData(d); })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);

  function copyLink() {
    if (!data) return;
    const url = `https://attivocorretora.com.br/afiliados/?ref=${data.refCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (error) return (
    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, color: '#dc2626', fontSize: 14 }}>{error}</div>
  );
  if (!data) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Carregando dashboard...</div>
  );

  const refUrl   = `https://attivocorretora.com.br/afiliados/?ref=${data.refCode}`;
  const convRate = data.totalClicks > 0
    ? ((data.totalConversions / data.totalClicks) * 100).toFixed(1)
    : '0.0';

  const funnelData   = [
    { name: 'Cliques', value: data.totalClicks },
    { name: 'Leads', value: data.totalLeads },
    { name: 'Conversões', value: data.totalConversions },
  ];
  const funnelColors = ['#0B2442', '#D1B46A', '#16a34a'];
  const finData      = [
    { name: 'Disponível', value: data.availableCommission },
    { name: 'Recebido', value: data.paidCommission },
  ];

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0B2442', margin: 0 }}>Meu Dashboard</h2>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Acompanhe seus ganhos e indicações em tempo real</p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '5px 14px', borderRadius: 20, color: '#fff', background: affiliateStatusColor[data.status] ?? '#6b7280' }}>
          {affiliateStatusLabel[data.status] ?? data.status}
        </span>
      </div>

      {/* ── HERO FINANCEIRO ────────────────────────────────────── */}
      <div className="hero-fin" style={{
        background: 'linear-gradient(135deg, #0B2442 0%, #0d2d52 100%)',
        borderRadius: 14, padding: '28px 32px', marginBottom: 16,
        boxShadow: '0 8px 32px rgba(11,36,66,0.18)',
      }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px' }}>
            💰 Disponível para saque
          </p>
          <p style={{ color: '#D1B46A', fontSize: 44, fontWeight: 900, margin: '0 0 6px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {fmt(data.availableCommission)}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: 0 }}>
            Acumulado total:&nbsp;
            <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{fmt(data.totalEarnings)}</strong>
            &nbsp;&nbsp;·&nbsp;&nbsp;
            Já recebido:&nbsp;
            <strong style={{ color: '#86efac' }}>{fmt(data.paidCommission)}</strong>
          </p>
        </div>
        <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 22px', minWidth: 130 }}>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 6px' }}>
            🏆 Ranking
          </p>
          <p style={{ color: '#D1B46A', fontSize: 36, fontWeight: 900, margin: 0, lineHeight: 1 }}>
            #{data.ranking}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, margin: '5px 0 0' }}>entre afiliados</p>
        </div>
      </div>

      {/* ── MINI CARDS ─────────────────────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        <MiniCard
          label="Ganhos do mês"
          value={fmt(data.monthlyEarnings)}
          sub={new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
        />
        <MiniCard label="Cliques" value={String(data.totalClicks)} sub="no seu link" />
        <MiniCard label="Leads gerados" value={String(data.totalLeads)} sub="contatos capturados" />
        <MiniCard label="Taxa de conversão" value={`${convRate}%`} sub={`${data.totalConversions} conversões aprovadas`} />
      </div>

      {/* ── LINK DE INDICAÇÃO ──────────────────────────────────── */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 28,
        boxShadow: '0 2px 10px rgba(11,36,66,0.07)', border: '1.5px solid #e5e7eb',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 18 }}>🔗</span>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0B2442', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Seu link de indicação
          </p>
          <span style={{ background: '#f0f4f8', color: '#0B2442', padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, fontFamily: 'monospace', border: '1px solid #dbe4f0', marginLeft: 'auto' }}>
            #{data.refCode}
          </span>
        </div>
        <div className="ref-link-row">
          <div style={{ flex: 1, background: '#f8fafc', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: '#374151', fontFamily: 'monospace', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>
            {refUrl}
          </div>
          <button onClick={copyLink}
            style={{ padding: '0 22px', borderRadius: 8, border: 'none', background: copied ? '#16a34a' : '#0B2442', color: copied ? '#fff' : '#D1B46A', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', minWidth: 130 }}>
            {copied ? '✓ Copiado!' : '📋 Copiar link'}
          </button>
          <a href={`https://wa.me/?text=${encodeURIComponent(`Olá! Conheça os seguros da ATTIVO: ${refUrl}`)}`}
            target="_blank" rel="noreferrer"
            style={{ padding: '0 18px', borderRadius: 8, background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            📲 WhatsApp
          </a>
        </div>
        <p style={{ fontSize: 12, color: '#9ca3af', margin: '10px 0 0' }}>
          Compartilhe seu link — cada indicação convertida em seguro gera comissão para você automaticamente.
        </p>
      </div>

      {/* ── GRÁFICOS ───────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <SectionHeader title="Desempenho" />
        <div className="charts-grid">
          <div className="card">
            <p style={{ fontSize: 12, fontWeight: 700, color: '#0B2442', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Funil de Indicações
            </p>
            {funnelData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={funnelData} barSize={44}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [String(v), 'Total']} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {funnelData.map((_, i) => <Cell key={i} fill={funnelColors[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#9ca3af', fontSize: 13 }}>
                <span style={{ fontSize: 32 }}>🔗</span>
                Compartilhe seu link para começar
              </div>
            )}
          </div>

          <div className="card">
            <p style={{ fontSize: 12, fontWeight: 700, color: '#0B2442', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Resumo Financeiro
            </p>
            {finData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={finData} barSize={52} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip formatter={(v) => [fmt(Number(v)), 'Valor']} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    <Cell fill="#D1B46A" />
                    <Cell fill="#16a34a" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#9ca3af', fontSize: 13 }}>
                <span style={{ fontSize: 32 }}>💰</span>
                Sem dados financeiros ainda
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── NEGÓCIOS ORIGINADOS ────────────────────────────────── */}
      {data.businessStats && (
        <div>
          <SectionHeader title="Negócios Originados" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            <MiniCard label="Negócios Gerados" value={String(data.businessStats.total)} />
            <MiniCard label="Apólices Emitidas" value={String(data.businessStats.policies)} />
            <MiniCard label="Taxa de Conversão" value={`${data.businessStats.conversionRate}%`} />
            <MiniCard label="Prêmio Total" value={fmt(data.businessStats.premiumTotal)} />
          </div>
        </div>
      )}
    </div>
  );
}
