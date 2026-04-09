'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../../lib/api';
import { fmt, fmtDate, affiliateStatusColor, affiliateStatusLabel, commissionStatusColor, commissionStatusLabel, conversionStatusColor, conversionStatusLabel } from '../../../../lib/formatting';

interface AffiliateDetail {
  id: string; name: string; email: string; phone?: string; document: string;
  refCode: string; status: string; cityUf?: string; pixKey?: string;
  commissionRate: number; createdAt: string; approvedAt?: string;
  address?: string; addressNumber?: string; neighborhood?: string; zipCode?: string; complement?: string;
  _count: { clicks: number; leads: number; conversions: number };
  user?: { id: string; email: string; status: string };
  documentAcceptances?: { id: string; acceptedAt: string; documentVersion: { version: string } }[];
}

interface Conversion {
  id: string; customerName?: string; product?: string; grossAmount: number;
  commissionValue: number; competenceMonth: string; status: string; createdAt: string;
}

interface Commission {
  id: string; amount: number; status: string; competenceMonth: string; createdAt: string;
  conversion?: { product?: string; customerName?: string };
}

type Tab = 'info' | 'conversions' | 'commissions';

export default function AffiliateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [aff, setAff] = useState<AffiliateDetail | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState('');
  const [tab, setTab] = useState<Tab>('info');

  // Commission rate editing
  const [editRate, setEditRate] = useState(false);
  const [rateValue, setRateValue] = useState('');

  // Tab data
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);

  useEffect(() => {
    api.get<{ affiliate: AffiliateDetail }>(`/affiliates/${id}`)
      .then(r => { setAff(r.affiliate); setRateValue((Number(r.affiliate.commissionRate) * 100).toFixed(1)); })
      .catch(e => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (tab === 'conversions') {
      api.get<{ data: Conversion[] }>(`/conversions?affiliateId=${id}&limit=50`).then(r => setConversions(r.data)).catch(() => {});
    }
    if (tab === 'commissions') {
      api.get<{ data: Commission[] }>(`/admin/commissions?affiliateId=${id}&limit=50`).then(r => setCommissions(r.data)).catch(() => {});
    }
  }, [tab, id]);

  async function act(action: 'approve' | 'reject' | 'block' | 'unblock') {
    setMsg(''); setError(''); setLoading(action);
    try {
      const r = await api.patch<{ message: string }>(`/affiliates/${id}/${action}`);
      setMsg(r.message);
      const res = await api.get<{ affiliate: AffiliateDetail }>(`/affiliates/${id}`);
      setAff(res.affiliate);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erro'); }
    finally { setLoading(''); }
  }

  async function saveRate() {
    const val = parseFloat(rateValue);
    if (isNaN(val) || val < 0 || val > 100) { setError('Comissão deve ser entre 0% e 100%'); return; }
    setMsg(''); setError(''); setLoading('rate');
    try {
      await api.patch(`/affiliates/${id}/commission-rate`, { commissionRate: val / 100 });
      setMsg('Taxa de comissão atualizada');
      setEditRate(false);
      const res = await api.get<{ affiliate: AffiliateDetail }>(`/affiliates/${id}`);
      setAff(res.affiliate);
      setRateValue((Number(res.affiliate.commissionRate) * 100).toFixed(1));
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erro'); }
    finally { setLoading(''); }
  }

  if (!aff && !error) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Carregando...</div>;
  if (error && !aff) return <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, color: '#dc2626' }}>{error}</div>;
  if (!aff) return null;

  const rate = (Number(aff.commissionRate) * 100).toFixed(1);
  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: 'Informações' },
    { key: 'conversions', label: 'Conversões' },
    { key: 'commissions', label: 'Comissões' },
  ];

  return (
    <div>
      {/* Back link */}
      <a href="/admin/affiliates" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none', marginBottom: 16, display: 'inline-block' }}>
        ← Voltar para afiliados
      </a>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0B2442', margin: 0 }}>{aff.name}</h2>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>{aff.email}</p>
        </div>
        <span style={{ fontFamily: 'monospace', background: '#f0f4f8', padding: '4px 12px', borderRadius: 6, fontSize: 13, fontWeight: 700, color: '#0B2442', border: '1px solid #dbe4f0' }}>{aff.refCode}</span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 20, color: '#fff', background: affiliateStatusColor[aff.status] ?? '#6b7280' }}>
          {affiliateStatusLabel[aff.status] ?? aff.status}
        </span>
      </div>

      {/* Messages */}
      {msg && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', color: '#15803d', fontSize: 14, fontWeight: 500, marginBottom: 16 }}>✓ {msg}</div>}
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 16px', color: '#dc2626', fontSize: 14, fontWeight: 500, marginBottom: 16 }}>{error}</div>}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {aff.status === 'PENDING' && (
          <>
            <Btn label="Aprovar" color="#16a34a" loading={loading === 'approve'} disabled={!!loading} onClick={() => act('approve')} />
            <Btn label="Rejeitar" color="#dc2626" loading={loading === 'reject'} disabled={!!loading} onClick={() => act('reject')} />
          </>
        )}
        {aff.status === 'ACTIVE' && (
          <Btn label="Bloquear" color="#6b7280" loading={loading === 'block'} disabled={!!loading} onClick={() => act('block')} />
        )}
        {(aff.status === 'BLOCKED' || aff.status === 'REJECTED') && (
          <Btn label="Reativar" color="#2563eb" loading={loading === 'unblock'} disabled={!!loading} onClick={() => act('unblock')} />
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e5e7eb' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: 'none', color: tab === t.key ? '#0B2442' : '#6b7280',
              borderBottom: tab === t.key ? '2px solid #D1B46A' : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.15s',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'info' && (
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Commission rate card */}
          <div className="card" style={{ borderLeft: '4px solid #D1B46A' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Taxa de Comissão</p>
                {editRate ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                    <input type="number" step="0.1" min="0" max="100" value={rateValue}
                      onChange={e => setRateValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveRate(); if (e.key === 'Escape') setEditRate(false); }}
                      autoFocus
                      style={{ width: 80, padding: '6px 10px', fontSize: 18, borderRadius: 6, border: '1.5px solid #D1B46A', textAlign: 'center', outline: 'none', fontWeight: 700 }}
                    />
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#0B2442' }}>%</span>
                    <Btn label="Salvar" color="#16a34a" loading={loading === 'rate'} disabled={!!loading} onClick={saveRate} />
                    <Btn label="Cancelar" color="#9ca3af" loading={false} disabled={false} onClick={() => { setEditRate(false); setRateValue(rate); }} />
                  </div>
                ) : (
                  <p style={{ fontSize: 32, fontWeight: 800, color: '#0B2442', margin: '4px 0 0' }}>{rate}%</p>
                )}
              </div>
              {!editRate && (
                <button onClick={() => setEditRate(true)}
                  style={{ padding: '6px 16px', borderRadius: 6, border: '1.5px solid #D1B46A', background: 'none', color: '#D1B46A', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Editar
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <StatCard label="Cliques" value={aff._count.clicks} icon="🖱️" />
            <StatCard label="Leads" value={aff._count.leads} icon="📋" />
            <StatCard label="Conversões" value={aff._count.conversions} icon="🎯" />
          </div>

          {/* Info grid */}
          <div className="card">
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0B2442', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px' }}>Dados Cadastrais</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="CPF" value={aff.document} />
              <Field label="Telefone" value={aff.phone} />
              <Field label="Cidade/UF" value={aff.cityUf} />
              <Field label="Chave PIX" value={aff.pixKey} />
              <Field label="Endereço" value={[aff.address, aff.addressNumber, aff.neighborhood, aff.complement].filter(Boolean).join(', ') || undefined} />
              <Field label="CEP" value={aff.zipCode} />
              <Field label="Cadastro" value={fmtDate(aff.createdAt)} />
              <Field label="Aprovação" value={aff.approvedAt ? fmtDate(aff.approvedAt) : undefined} />
            </div>
          </div>

          {/* Document acceptances */}
          {aff.documentAcceptances && aff.documentAcceptances.length > 0 && (
            <div className="card">
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0B2442', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px' }}>Termos Aceitos</h4>
              {aff.documentAcceptances.map(da => (
                <div key={da.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>✓</span>
                  <span style={{ fontSize: 13, color: '#374151' }}>Versão {da.documentVersion.version}</span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{fmtDate(da.acceptedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'conversions' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {conversions.length === 0 ? (
            <p style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Nenhuma conversão encontrada.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0B2442' }}>
                  {['Cliente', 'Produto', 'Valor Bruto', 'Comissão', 'Mês', 'Status', 'Data'].map(h => (
                    <th key={h} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {conversions.map((c, i) => (
                  <tr key={c.id} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                    <td style={TD}>{c.customerName ?? '—'}</td>
                    <td style={TD}>{c.product ?? '—'}</td>
                    <td style={{ ...TD, fontWeight: 600 }}>{fmt(c.grossAmount)}</td>
                    <td style={{ ...TD, fontWeight: 700, color: '#D1B46A' }}>{fmt(c.commissionValue)}</td>
                    <td style={TD}>{c.competenceMonth}</td>
                    <td style={TD}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', padding: '2px 8px', borderRadius: 20, background: conversionStatusColor[c.status] ?? '#6b7280' }}>
                        {conversionStatusLabel[c.status] ?? c.status}
                      </span>
                    </td>
                    <td style={{ ...TD, color: '#9ca3af', fontSize: 12 }}>{fmtDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'commissions' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {commissions.length === 0 ? (
            <p style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Nenhuma comissão encontrada.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0B2442' }}>
                  {['Produto', 'Cliente', 'Valor', 'Mês', 'Status', 'Data'].map(h => (
                    <th key={h} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {commissions.map((c, i) => (
                  <tr key={c.id} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                    <td style={TD}>{c.conversion?.product ?? '—'}</td>
                    <td style={TD}>{c.conversion?.customerName ?? '—'}</td>
                    <td style={{ ...TD, fontWeight: 700, color: '#D1B46A' }}>{fmt(c.amount)}</td>
                    <td style={TD}>{c.competenceMonth}</td>
                    <td style={TD}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', padding: '2px 8px', borderRadius: 20, background: commissionStatusColor[c.status] ?? '#6b7280' }}>
                        {commissionStatusLabel[c.status] ?? c.status}
                      </span>
                    </td>
                    <td style={{ ...TD, color: '#9ca3af', fontSize: 12 }}>{fmtDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>{label}</p>
        <span style={{ fontSize: 18, opacity: 0.5 }}>{icon}</span>
      </div>
      <p style={{ fontSize: 26, fontWeight: 800, color: '#0B2442', margin: 0 }}>{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 14, color: value ? '#111827' : '#d1d5db', margin: 0 }}>{value || '—'}</p>
    </div>
  );
}

function Btn({ label, color, loading, disabled, onClick }: { label: string; color: string; loading: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: '7px 18px', borderRadius: 6, border: 'none', background: loading ? '#9ca3af' : color, color: '#fff', fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled && !loading ? 0.6 : 1, transition: 'background 0.15s' }}>
      {loading ? '...' : label}
    </button>
  );
}

const TH: React.CSSProperties = { padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' };
const TD: React.CSSProperties = { padding: '12px 14px', fontSize: 13, color: '#374151' };
