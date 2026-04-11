'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { fmt, fmtDate, conversionStatusColor, conversionStatusLabel } from '../../../lib/formatting';

interface Affiliate { id: string; name: string; refCode: string; commissionRate?: number }
interface Conversion {
  id: string; product?: string; grossAmount: number; commissionValue: number;
  status: string; occurredAt: string;
  affiliate: { name: string; refCode: string };
}
interface Res { data: Conversion[]; meta: { total: number; page: number; pages: number } }

const emptyForm = { affiliateId: '', customerName: '', customerEmail: '', customerPhone: '', product: '', insurer: '', grossAmount: '', commissionBase: '', occurredAt: '', competenceMonth: '' };

export default function AdminConversions() {
  const [res, setRes]     = useState<Res | null>(null);
  const [page, setPage]   = useState(1);
  const [error, setError] = useState('');
  const [msg, setMsg]     = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [creating, setCreating] = useState(false);

  function load(p = page) {
    api.get<Res>(`/conversions?page=${p}&limit=20`).then(setRes).catch((e) => setError(e.message));
  }

  useEffect(() => { load(page); }, [page]);

  useEffect(() => {
    if (showForm && affiliates.length === 0) {
      api.get<{ data: Affiliate[] }>('/affiliates?status=ACTIVE&limit=100').then(r => setAffiliates(r.data)).catch(() => {});
    }
  }, [showForm]);

  async function cancel(id: string) {
    setMsg(''); setLoadingId(id);
    try {
      const r = await api.patch<{ message: string }>(`/conversions/${id}/cancel`);
      setMsg(r.message); load(page);
    } catch (e: unknown) { setMsg(e instanceof Error ? e.message : 'Erro'); }
    finally { setLoadingId(null); }
  }

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })); }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setMsg(''); setError('');
    if (!form.affiliateId) { setError('Selecione um afiliado'); return; }
    if (!form.grossAmount || !form.commissionBase) { setError('Preencha valor bruto e base de comissão'); return; }
    if (!form.occurredAt) { setError('Informe a data da conversão'); return; }

    const competenceMonth = form.competenceMonth || form.occurredAt.slice(0, 7);

    setCreating(true);
    try {
      await api.post('/conversions', {
        affiliateId: form.affiliateId,
        customerName: form.customerName || undefined,
        customerEmail: form.customerEmail || undefined,
        customerPhone: form.customerPhone || undefined,
        product: form.product || undefined,
        insurer: form.insurer || undefined,
        grossAmount: parseFloat(form.grossAmount),
        commissionBase: parseFloat(form.commissionBase),
        occurredAt: new Date(form.occurredAt).toISOString(),
        competenceMonth,
      });
      setMsg('Conversão criada com sucesso');
      setForm(emptyForm);
      setShowForm(false);
      load(1); setPage(1);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erro ao criar conversão'); }
    finally { setCreating(false); }
  }

  if (!res && !error) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Carregando conversões...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0B2442', margin: 0 }}>Conversões</h2>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Gerencie as conversões dos afiliados</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: showForm ? '#6b7280' : '#0B2442', color: showForm ? '#fff' : '#D1B46A', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          {showForm ? 'Fechar' : '+ Nova Conversão'}
        </button>
      </div>

      {msg && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', color: '#15803d', fontSize: 14, fontWeight: 500, marginBottom: 16 }}>✓ {msg}</div>}
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 16px', color: '#dc2626', fontSize: 14, fontWeight: 500, marginBottom: 16 }}>{error}</div>}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="card" style={{ marginBottom: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0B2442', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px' }}>Nova Conversão</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LBL}>Afiliado *</label>
              <select value={form.affiliateId} onChange={e => set('affiliateId', e.target.value)} style={INP} required>
                <option value="">Selecione...</option>
                {affiliates.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.refCode}) — {a.commissionRate ? `${(Number(a.commissionRate) * 100).toFixed(1)}%` : '15%'}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={LBL}>Nome do cliente</label>
              <input style={INP} value={form.customerName} onChange={e => set('customerName', e.target.value)} placeholder="Opcional" />
            </div>
            <div>
              <label style={LBL}>E-mail do cliente</label>
              <input style={INP} type="email" value={form.customerEmail} onChange={e => set('customerEmail', e.target.value)} placeholder="Opcional" />
            </div>
            <div>
              <label style={LBL}>Telefone do cliente</label>
              <input style={INP} value={form.customerPhone} onChange={e => set('customerPhone', e.target.value)} placeholder="Opcional" />
            </div>
            <div>
              <label style={LBL}>Produto</label>
              <input style={INP} value={form.product} onChange={e => set('product', e.target.value)} placeholder="Ex: Seguro Auto" />
            </div>
            <div>
              <label style={LBL}>Seguradora</label>
              <input style={INP} value={form.insurer} onChange={e => set('insurer', e.target.value)} placeholder="Ex: Porto Seguro" />
            </div>
            <div>
              <label style={LBL}>Valor bruto (R$) *</label>
              <input style={INP} type="number" step="0.01" min="0" value={form.grossAmount} onChange={e => set('grossAmount', e.target.value)} required placeholder="0,00" />
            </div>
            <div>
              <label style={LBL}>Base de comissão (R$) *</label>
              <input style={INP} type="number" step="0.01" min="0" value={form.commissionBase} onChange={e => set('commissionBase', e.target.value)} required placeholder="0,00" />
            </div>
            <div>
              <label style={LBL}>Data da conversão *</label>
              <input style={INP} type="date" value={form.occurredAt} onChange={e => set('occurredAt', e.target.value)} required />
            </div>
            <div>
              <label style={LBL}>Mês de competência</label>
              <input style={INP} type="month" value={form.competenceMonth} onChange={e => set('competenceMonth', e.target.value)} placeholder="Auto" />
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button type="submit" disabled={creating}
              style={{ padding: '10px 24px', borderRadius: 6, border: 'none', background: creating ? '#4b6a8a' : '#0B2442', color: '#fff', fontWeight: 700, fontSize: 14, cursor: creating ? 'not-allowed' : 'pointer' }}>
              {creating ? 'Criando...' : 'Criar Conversão'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); }}
              style={{ padding: '10px 20px', borderRadius: 6, border: '1.5px solid #e5e7eb', background: '#fff', color: '#6b7280', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {res && res.data.length === 0 && !showForm ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Nenhuma conversão registrada ainda.</div>
      ) : res && res.data.length > 0 && (
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0B2442' }}>
                {['Afiliado', 'Produto', 'Valor Bruto', 'Comissão', 'Status', 'Data', 'Ações'].map(h =>
                  <th key={h} style={TH}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {res.data.map((c, i) => (
                <tr key={c.id} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                  <td style={TD}><span style={{ fontWeight: 500 }}>{c.affiliate.name}</span></td>
                  <td style={TD}>{c.product ?? '—'}</td>
                  <td style={TD}>{fmt(c.grossAmount)}</td>
                  <td style={{ ...TD, fontWeight: 600, color: '#16a34a' }}>{fmt(c.commissionValue)}</td>
                  <td style={TD}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', padding: '3px 10px', borderRadius: 20, background: conversionStatusColor[c.status] ?? '#6b7280' }}>
                      {conversionStatusLabel[c.status] ?? c.status}
                    </span>
                  </td>
                  <td style={TD}>{fmtDate(c.occurredAt)}</td>
                  <td style={TD}>
                    {c.status !== 'CANCELED' && (
                      <button onClick={() => cancel(c.id)} disabled={loadingId !== null}
                        style={{ padding: '5px 12px', borderRadius: 5, border: 'none', background: loadingId === c.id ? '#9ca3af' : '#dc2626', color: '#fff', fontSize: 12, fontWeight: 600, cursor: loadingId !== null ? 'not-allowed' : 'pointer', opacity: loadingId !== null && loadingId !== c.id ? 0.6 : 1 }}>
                        {loadingId === c.id ? '...' : 'Cancelar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {res && <Pagination page={page} pages={res.meta.pages} total={res.meta.total} onPage={setPage} />}
    </div>
  );
}

function Pagination({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
      <button disabled={page === 1} onClick={() => onPage(page - 1)}
        style={{ ...BTN_PAGE, background: page === 1 ? '#e5e7eb' : '#0B2442', color: page === 1 ? '#9ca3af' : '#D1B46A', cursor: page === 1 ? 'default' : 'pointer' }}>← Anterior</button>
      <span style={{ fontSize: 13, color: '#6b7280' }}>Página {page} de {pages} · {total} total</span>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)}
        style={{ ...BTN_PAGE, background: page >= pages ? '#e5e7eb' : '#0B2442', color: page >= pages ? '#9ca3af' : '#D1B46A', cursor: page >= pages ? 'default' : 'pointer' }}>Próxima →</button>
    </div>
  );
}

const TH: React.CSSProperties = { padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' };
const TD: React.CSSProperties = { padding: '12px 14px', fontSize: 13 };
const BTN_PAGE: React.CSSProperties = { padding: '7px 16px', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 13 };
const LBL: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' };
const INP: React.CSSProperties = { padding: '10px 12px', borderRadius: 6, border: '1.5px solid #e5e7eb', fontSize: 13, width: '100%', outline: 'none' };
