'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { fmt, fmtDate, paymentStatusColor, paymentStatusLabel, commissionStatusLabel } from '../../../lib/formatting';

interface Affiliate { id: string; name: string; refCode: string; pixKey?: string }
interface Commission { id: string; amount: number; status: string; competenceMonth: string; conversion?: { product?: string; customerName?: string } }
interface Payment {
  id: string; totalAmount: number; status: string; paidAt?: string; reference?: string;
  affiliate: { name: string; pixKey?: string };
  items: { id: string; amount: number }[];
}
interface Res { data: Payment[]; meta: { total: number; page: number; pages: number } }

export default function AdminPayments() {
  const [res, setRes]     = useState<Res | null>(null);
  const [page, setPage]   = useState(1);
  const [error, setError] = useState('');
  const [msg, setMsg]     = useState('');

  // Create payment workflow
  const [showCreate, setShowCreate] = useState(false);
  const [step, setStep] = useState(1);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [selectedAff, setSelectedAff] = useState('');
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reference, setReference] = useState('');
  const [paidAt, setPaidAt] = useState('');
  const [creating, setCreating] = useState(false);

  function load(p = page) {
    api.get<Res>(`/payments?page=${p}&limit=20`).then(setRes).catch((e) => setError(e.message));
  }

  useEffect(() => { load(page); }, [page]);

  useEffect(() => {
    if (showCreate && affiliates.length === 0) {
      api.get<{ data: Affiliate[] }>('/affiliates?status=ACTIVE&limit=100').then(r => setAffiliates(r.data)).catch(() => {});
    }
  }, [showCreate]);

  function selectAffiliate(affId: string) {
    setSelectedAff(affId);
    setSelected(new Set());
    setCommissions([]);
    if (!affId) { setStep(1); return; }
    setStep(2);
    api.get<{ data: Commission[] }>(`/admin/commissions?affiliateId=${affId}&status=AVAILABLE&limit=100`)
      .then(r => setCommissions(r.data))
      .catch(() => {});
  }

  function toggleCommission(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === commissions.length) setSelected(new Set());
    else setSelected(new Set(commissions.map(c => c.id)));
  }

  const total = commissions.filter(c => selected.has(c.id)).reduce((sum, c) => sum + Number(c.amount), 0);

  async function handleCreate() {
    if (selected.size === 0) { setError('Selecione ao menos uma comissão'); return; }
    setMsg(''); setError(''); setCreating(true);
    try {
      await api.post('/payments', {
        affiliateId: selectedAff,
        commissionIds: Array.from(selected),
        reference: reference || undefined,
        paidAt: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
      });
      setMsg('Pagamento criado com sucesso');
      resetCreate();
      load(1); setPage(1);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erro ao criar pagamento'); }
    finally { setCreating(false); }
  }

  function resetCreate() {
    setShowCreate(false); setStep(1); setSelectedAff(''); setCommissions([]); setSelected(new Set()); setReference(''); setPaidAt('');
  }

  if (!res && !error) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Carregando pagamentos...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0B2442', margin: 0 }}>Pagamentos</h2>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Histórico de pagamentos aos afiliados</p>
        </div>
        <button onClick={() => showCreate ? resetCreate() : setShowCreate(true)}
          style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: showCreate ? '#6b7280' : '#0B2442', color: showCreate ? '#fff' : '#D1B46A', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          {showCreate ? 'Fechar' : '+ Criar Pagamento'}
        </button>
      </div>

      {msg && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', color: '#15803d', fontSize: 14, fontWeight: 500, marginBottom: 16 }}>✓ {msg}</div>}
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 16px', color: '#dc2626', fontSize: 14, fontWeight: 500, marginBottom: 16 }}>{error}</div>}

      {/* Create payment workflow */}
      {showCreate && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0B2442', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px' }}>
            Criar Pagamento — Passo {step}/3
          </h4>

          {/* Step 1: Select affiliate */}
          <div style={{ marginBottom: 16 }}>
            <label style={LBL}>Afiliado *</label>
            <select value={selectedAff} onChange={e => selectAffiliate(e.target.value)} style={INP}>
              <option value="">Selecione...</option>
              {affiliates.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.refCode}){a.pixKey ? ` — PIX: ${a.pixKey}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Step 2: Select commissions */}
          {step >= 2 && (
            <div style={{ marginBottom: 16 }}>
              {commissions.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: 14 }}>Nenhuma comissão disponível para pagamento.</p>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#0B2442' }}>
                      <input type="checkbox" checked={selected.size === commissions.length && commissions.length > 0} onChange={toggleAll}
                        style={{ width: 16, height: 16, accentColor: '#0B2442' }} />
                      Selecionar todas ({commissions.length})
                    </label>
                  </div>
                  <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ ...TH, color: '#374151', width: 40 }}></th>
                          <th style={{ ...TH, color: '#374151' }}>Produto</th>
                          <th style={{ ...TH, color: '#374151' }}>Cliente</th>
                          <th style={{ ...TH, color: '#374151' }}>Valor</th>
                          <th style={{ ...TH, color: '#374151' }}>Mês</th>
                          <th style={{ ...TH, color: '#374151' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commissions.map((c, i) => (
                          <tr key={c.id} onClick={() => toggleCommission(c.id)}
                            style={{ borderTop: '1px solid #f3f4f6', background: selected.has(c.id) ? '#f0fdf4' : (i % 2 === 0 ? '#fff' : '#fafbfc'), cursor: 'pointer' }}>
                            <td style={{ ...TD, textAlign: 'center' }}>
                              <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleCommission(c.id)}
                                style={{ width: 16, height: 16, accentColor: '#0B2442' }} />
                            </td>
                            <td style={TD}>{c.conversion?.product ?? '—'}</td>
                            <td style={TD}>{c.conversion?.customerName ?? '—'}</td>
                            <td style={{ ...TD, fontWeight: 700, color: '#D1B46A' }}>{fmt(c.amount)}</td>
                            <td style={TD}>{c.competenceMonth}</td>
                            <td style={TD}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 20 }}>
                                {commissionStatusLabel[c.status] ?? c.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Confirm */}
          {step >= 2 && selected.size > 0 && (
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={LBL}>Total do pagamento</label>
                  <p style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', margin: '4px 0 0' }}>{fmt(total)}</p>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{selected.size} comissão(ões)</p>
                </div>
                <div>
                  <label style={LBL}>Referência</label>
                  <input style={INP} value={reference} onChange={e => setReference(e.target.value)} placeholder="Ex: PIX-001" />
                </div>
                <div>
                  <label style={LBL}>Data de pagamento</label>
                  <input style={INP} type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleCreate} disabled={creating}
                  style={{ padding: '10px 24px', borderRadius: 6, border: 'none', background: creating ? '#4b6a8a' : '#16a34a', color: '#fff', fontWeight: 700, fontSize: 14, cursor: creating ? 'not-allowed' : 'pointer' }}>
                  {creating ? 'Processando...' : 'Confirmar Pagamento'}
                </button>
                <button onClick={resetCreate}
                  style={{ padding: '10px 20px', borderRadius: 6, border: '1.5px solid #e5e7eb', background: '#fff', color: '#6b7280', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {res && res.data.length === 0 && !showCreate ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Nenhum pagamento registrado ainda.</div>
      ) : res && res.data.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0B2442' }}>
                {['Afiliado', 'Pix', 'Total', 'Qtd.', 'Status', 'Pago em', 'Referência'].map(h =>
                  <th key={h} style={TH}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {res.data.map((p, i) => (
                <tr key={p.id} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                  <td style={{ ...TD, fontWeight: 500 }}>{p.affiliate.name}</td>
                  <td style={{ ...TD, fontSize: 12, color: '#6b7280' }}>{p.affiliate.pixKey ?? '—'}</td>
                  <td style={{ ...TD, fontWeight: 700, color: '#16a34a' }}>{fmt(p.totalAmount)}</td>
                  <td style={{ ...TD, textAlign: 'center', fontWeight: 600 }}>{p.items.length}</td>
                  <td style={TD}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', padding: '3px 10px', borderRadius: 20, background: paymentStatusColor[p.status] ?? '#6b7280' }}>
                      {paymentStatusLabel[p.status] ?? p.status}
                    </span>
                  </td>
                  <td style={TD}>{fmtDate(p.paidAt)}</td>
                  <td style={{ ...TD, fontSize: 12, color: '#6b7280' }}>{p.reference ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {res && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            style={{ ...BTN, background: page === 1 ? '#e5e7eb' : '#0B2442', color: page === 1 ? '#9ca3af' : '#D1B46A', cursor: page === 1 ? 'default' : 'pointer' }}>← Anterior</button>
          <span style={{ fontSize: 13, color: '#6b7280' }}>Página {res.meta.page} de {res.meta.pages}</span>
          <button disabled={page >= res.meta.pages} onClick={() => setPage(p => p + 1)}
            style={{ ...BTN, background: page >= res.meta.pages ? '#e5e7eb' : '#0B2442', color: page >= res.meta.pages ? '#9ca3af' : '#D1B46A', cursor: page >= res.meta.pages ? 'default' : 'pointer' }}>Próxima →</button>
        </div>
      )}
    </div>
  );
}

const TH: React.CSSProperties = { padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' };
const TD: React.CSSProperties = { padding: '12px 14px', fontSize: 13 };
const BTN: React.CSSProperties = { padding: '7px 16px', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 13 };
const LBL: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' };
const INP: React.CSSProperties = { padding: '10px 12px', borderRadius: 6, border: '1.5px solid #e5e7eb', fontSize: 13, width: '100%', outline: 'none' };
