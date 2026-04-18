'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../../../lib/api';
import {
  fmt, fmtDate,
  insuranceTypeLabel, insuranceTypeColor,
  policyVigenciaLabel, policyVigenciaColor,
  comissaoPagaLabel, comissaoPagaColor,
  tipoEmissaoLabel,
  btnStyle,
} from '../../../lib/formatting';

// ── Tipos ────────────────────────────────────────────────────────────────────
interface Policy {
  id: string;
  type: string;
  insurer: string;
  policyNumber: string;
  numeroCi?: string;
  tipoEmissao: string;
  customerName: string;
  customerDocument?: string;
  customerPhone?: string;
  startDate?: string;
  endDate?: string;
  premiumAmount?: number;
  percComissao?: number;
  comissaoGerada?: number;
  comissaoPaga: string;
  dataPagamentoComissao?: string;
  diasRestantes?: number;
  vigenciaStatus: string;
  notes?: string;
  createdAt: string;
}
interface DashKpis {
  totalAtivas: number; aVencer: number; vencidas: number;
  premioTotal: number; comissaoTotal: number; comissaoPendente: number;
}
interface DashTipo { tipo: string; qtd: number; premio: number; comissao: number }
interface DashSeg  { seguradora: string; qtd: number; comissaoGerada: number; comissaoPaga: number; pendente: number }
interface DashRes  { kpis: DashKpis; porTipo: DashTipo[]; porSeguradora: DashSeg[] }
interface ListRes  { data: Policy[]; meta: { total: number; page: number; pages: number } }

// ── Formulário vazio ──────────────────────────────────────────────────────────
const emptyForm = {
  type: 'AUTO', insurer: '', policyNumber: '', numeroCi: '', tipoEmissao: 'NOVO',
  customerName: '', customerDocument: '', customerPhone: '',
  startDate: '', endDate: '', premiumAmount: '', percComissao: '',
  comissaoPaga: 'PENDENTE', dataPagamentoComissao: '', notes: '',
};

const TIPOS = ['AUTO','RESIDENCIAL','EMPRESARIAL','VIDA','PREVIDENCIA','SAUDE','ODONTO','VIAGEM','RC','EQUIPAMENTOS','OUTROS'];

// ── Estilos compartilhados ─────────────────────────────────────────────────
const INP: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid #d1d5db',
  borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: '#fff',
};
const LBL: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: '#374151',
  marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px',
};
const CARD: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: '18px 20px',
  boxShadow: '0 2px 10px rgba(11,36,66,0.07)', border: '1px solid #e5e7eb',
};

// ── Componente KPI card ────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent, icon }: {
  label: string; value: string | number; sub?: string; accent?: boolean; icon: string;
}) {
  return (
    <div style={{
      ...CARD,
      background: accent ? 'linear-gradient(135deg, #0B2442 0%, #0d2d52 100%)' : '#fff',
      border: accent ? 'none' : '1px solid #e5e7eb',
      boxShadow: accent ? '0 8px 24px rgba(11,36,66,0.22)' : '0 2px 10px rgba(11,36,66,0.07)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p style={{ color: accent ? 'rgba(255,255,255,0.55)' : '#9ca3af', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', margin: 0 }}>{label}</p>
        <span style={{ fontSize: 18, opacity: 0.7 }}>{icon}</span>
      </div>
      <p style={{ fontSize: 26, fontWeight: 800, color: accent ? '#D1B46A' : '#111827', margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: accent ? 'rgba(255,255,255,0.4)' : '#9ca3af', margin: '4px 0 0' }}>{sub}</p>}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ background: `${color}18`, color, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function AdminPolicies() {
  const [tab, setTab]     = useState<'todas'|'aVencer'|'vencidas'|'pendente'>('todas');
  const [dash, setDash]   = useState<DashRes | null>(null);
  const [res, setRes]     = useState<ListRes | null>(null);
  const [page, setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg]     = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Form criação
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  // Form edição
  const [editId, setEditId]   = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<typeof emptyForm>>({});

  // ── Carga do dashboard ────────────────────────────────────────────────────
  function loadDash() {
    api.get<DashRes>('/admin/policies/dashboard').then(setDash).catch(() => {});
  }

  // ── Carga da lista ────────────────────────────────────────────────────────
  const loadList = useCallback((p = 1) => {
    const params = new URLSearchParams({ page: String(p), limit: '20' });
    if (typeFilter)      params.set('type', typeFilter);
    if (search)          params.set('search', search);
    if (tab === 'aVencer')   params.set('status', 'EXPIRING_SOON');
    if (tab === 'vencidas')  params.set('status', 'EXPIRED');
    if (tab === 'pendente')  params.set('comissaoPaga', 'PENDENTE');

    api.get<ListRes>(`/admin/policies?${params}`)
      .then(r => { setRes(r); setPage(p); })
      .catch(e => setError(e.message));
  }, [tab, typeFilter, search]);

  useEffect(() => { loadDash(); }, []);
  useEffect(() => { loadList(1); }, [loadList]);

  // ── Helpers de form ───────────────────────────────────────────────────────
  function setF(field: string, value: string) { setForm(f => ({ ...f, [field]: value })); }
  function setE(field: string, value: string) { setEditForm(f => ({ ...f, [field]: value })); }

  // ── Criar apólice ─────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setMsg(''); setError('');
    const missing = [];
    if (!form.insurer)       missing.push('Seguradora');
    if (!form.policyNumber)  missing.push('Nº Apólice');
    if (!form.customerName)  missing.push('Nome do Segurado');
    if (!form.premiumAmount) missing.push('Prêmio Líquido');
    if (!form.percComissao)  missing.push('% Comissão');
    if (!form.startDate)     missing.push('Data de Emissão');
    if (!form.endDate)       missing.push('Data de Vencimento');
    if (missing.length) { setError(`Preencha: ${missing.join(', ')}`); return; }

    setCreating(true);
    try {
      await api.post('/admin/policies', {
        type: form.type, insurer: form.insurer,
        policyNumber: form.policyNumber,
        numeroCi: form.numeroCi || undefined,
        tipoEmissao: form.tipoEmissao,
        customerName: form.customerName,
        customerDocument: form.customerDocument || undefined,
        customerPhone: form.customerPhone || undefined,
        premiumAmount: parseFloat(form.premiumAmount),
        percComissao: parseFloat(form.percComissao) / 100,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        comissaoPaga: form.comissaoPaga,
        dataPagamentoComissao: form.dataPagamentoComissao
          ? new Date(form.dataPagamentoComissao).toISOString() : undefined,
        notes: form.notes || undefined,
      });
      setMsg('Apólice criada com sucesso!');
      setForm(emptyForm); setShowForm(false);
      loadDash(); loadList(1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar apólice');
    } finally { setCreating(false); }
  }

  // ── Marcar comissão como paga ─────────────────────────────────────────────
  async function markPaid(id: string) {
    setMsg(''); setError(''); setLoadingId(`${id}-paid`);
    try {
      const r = await api.patch<{ message: string }>(`/admin/policies/${id}/mark-paid`, {});
      setMsg(r.message); loadDash(); loadList(page);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally { setLoadingId(null); }
  }

  // ── Salvar edição ─────────────────────────────────────────────────────────
  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); setMsg(''); setError('');
    if (!editId) return;
    setLoadingId(`${editId}-edit`);
    try {
      const payload: Record<string, unknown> = { ...editForm };
      if (editForm.premiumAmount) payload.premiumAmount = parseFloat(editForm.premiumAmount);
      if (editForm.percComissao)  payload.percComissao  = parseFloat(editForm.percComissao) / 100;
      if (editForm.startDate)     payload.startDate     = new Date(editForm.startDate).toISOString();
      if (editForm.endDate)       payload.endDate       = new Date(editForm.endDate).toISOString();
      if (editForm.dataPagamentoComissao) payload.dataPagamentoComissao = new Date(editForm.dataPagamentoComissao).toISOString();

      await api.patch(`/admin/policies/${editId}`, payload);
      setMsg('Apólice atualizada!'); setEditId(null); setEditForm({});
      loadDash(); loadList(page);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar');
    } finally { setLoadingId(null); }
  }

  // ── Abrir edição ──────────────────────────────────────────────────────────
  function openEdit(p: Policy) {
    setEditId(p.id);
    setEditForm({
      type: p.type, insurer: p.insurer, numeroCi: p.numeroCi ?? '',
      tipoEmissao: p.tipoEmissao, customerName: p.customerName,
      customerDocument: p.customerDocument ?? '', customerPhone: p.customerPhone ?? '',
      startDate: p.startDate ? p.startDate.slice(0, 10) : '',
      endDate: p.endDate ? p.endDate.slice(0, 10) : '',
      premiumAmount: p.premiumAmount ? String(p.premiumAmount) : '',
      percComissao: p.percComissao ? String(Number(p.percComissao) * 100) : '',
      comissaoPaga: p.comissaoPaga,
      dataPagamentoComissao: p.dataPagamentoComissao ? p.dataPagamentoComissao.slice(0, 10) : '',
      notes: p.notes ?? '',
    });
  }

  const kpis = dash?.kpis;

  return (
    <div>
      {/* ── Cabeçalho ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0B2442', margin: 0 }}>🛡️ Apólices</h2>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Controle completo de apólices e comissões da seguradora</p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setMsg(''); setError(''); }}
          style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: showForm ? '#6b7280' : '#0B2442', color: showForm ? '#fff' : '#D1B46A', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          {showForm ? 'Fechar' : '+ Nova Apólice'}
        </button>
      </div>

      {/* ── Alertas ─────────────────────────────────────────────────────── */}
      {msg   && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', color: '#15803d', fontSize: 14, fontWeight: 500, marginBottom: 16 }}>✓ {msg}</div>}
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 16px', color: '#dc2626', fontSize: 14, fontWeight: 500, marginBottom: 16 }}>{error}</div>}

      {/* ── Dashboard KPIs ──────────────────────────────────────────────── */}
      {kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
          <KpiCard label="Apólices Ativas"     value={kpis.totalAtivas}             icon="🛡️" accent />
          <KpiCard label="A Vencer (30d)"       value={kpis.aVencer}                 icon="⏳" />
          <KpiCard label="Vencidas"             value={kpis.vencidas}                icon="❌" />
          <KpiCard label="Prêmio Total"         value={fmt(kpis.premioTotal)}        icon="💵" />
          <KpiCard label="Comissão Total"       value={fmt(kpis.comissaoTotal)}      icon="💰" />
          <KpiCard label="Comissão Pendente"    value={fmt(kpis.comissaoPendente)}   icon="⚠️" />
        </div>
      )}

      {/* ── Breakdowns ──────────────────────────────────────────────────── */}
      {dash && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Por tipo */}
          <div style={CARD}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#0B2442', textTransform: 'uppercase', letterSpacing: '0.7px', margin: '0 0 12px' }}>Apólices por Tipo de Seguro</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Tipo','Qtd','Prêmio','Comissão'].map(h => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dash.porTipo.map(t => (
                  <tr key={t.tipo} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '6px 8px' }}>
                      <span style={{ background: `${insuranceTypeColor[t.tipo] || '#6b7280'}18`, color: insuranceTypeColor[t.tipo] || '#6b7280', padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{t.tipo}</span>
                    </td>
                    <td style={{ padding: '6px 8px', fontWeight: 700, color: '#111827' }}>{t.qtd}</td>
                    <td style={{ padding: '6px 8px', color: '#374151' }}>{fmt(t.premio)}</td>
                    <td style={{ padding: '6px 8px', color: '#16a34a', fontWeight: 600 }}>{fmt(t.comissao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Por seguradora */}
          <div style={CARD}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#0B2442', textTransform: 'uppercase', letterSpacing: '0.7px', margin: '0 0 12px' }}>Comissão por Seguradora</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Seguradora','Qtd','Gerada','Paga','Pendente'].map(h => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dash.porSeguradora.map(s => (
                  <tr key={s.seguradora} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600, color: '#111827' }}>{s.seguradora}</td>
                    <td style={{ padding: '6px 8px', color: '#374151' }}>{s.qtd}</td>
                    <td style={{ padding: '6px 8px', color: '#374151' }}>{fmt(s.comissaoGerada)}</td>
                    <td style={{ padding: '6px 8px', color: '#16a34a', fontWeight: 600 }}>{fmt(s.comissaoPaga)}</td>
                    <td style={{ padding: '6px 8px', color: s.pendente > 0 ? '#d97706' : '#6b7280', fontWeight: 600 }}>{fmt(s.pendente)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Formulário de criação ────────────────────────────────────────── */}
      {showForm && (
        <form onSubmit={handleCreate} style={{ ...CARD, marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0B2442', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px' }}>Nova Apólice</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            {/* Tipo */}
            <div>
              <label style={LBL}>Tipo de Seguro *</label>
              <select style={INP} value={form.type} onChange={e => setF('type', e.target.value)} required>
                {TIPOS.map(t => <option key={t} value={t}>{insuranceTypeLabel[t] || t}</option>)}
              </select>
            </div>
            {/* Seguradora */}
            <div>
              <label style={LBL}>Seguradora *</label>
              <input style={INP} value={form.insurer} onChange={e => setF('insurer', e.target.value)} placeholder="Ex: Porto Seguro" required />
            </div>
            {/* Nº Apólice */}
            <div>
              <label style={LBL}>Nº Apólice *</label>
              <input style={INP} value={form.policyNumber} onChange={e => setF('policyNumber', e.target.value)} placeholder="AUTO-2025-001" required />
            </div>
            {/* Nº CI */}
            <div>
              <label style={LBL}>Nº CI</label>
              <input style={INP} value={form.numeroCi} onChange={e => setF('numeroCi', e.target.value)} placeholder="CI-001" />
            </div>
            {/* Tipo Emissão */}
            <div>
              <label style={LBL}>Tipo de Emissão</label>
              <select style={INP} value={form.tipoEmissao} onChange={e => setF('tipoEmissao', e.target.value)}>
                <option value="NOVO">Novo</option>
                <option value="RENOVACAO">Renovação</option>
              </select>
            </div>
            {/* Segurado */}
            <div>
              <label style={LBL}>Nome do Segurado *</label>
              <input style={INP} value={form.customerName} onChange={e => setF('customerName', e.target.value)} placeholder="Nome completo" required />
            </div>
            {/* CPF/CNPJ */}
            <div>
              <label style={LBL}>CPF / CNPJ</label>
              <input style={INP} value={form.customerDocument} onChange={e => setF('customerDocument', e.target.value)} placeholder="000.000.000-00" />
            </div>
            {/* Contato */}
            <div>
              <label style={LBL}>Contato</label>
              <input style={INP} value={form.customerPhone} onChange={e => setF('customerPhone', e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            {/* Data Emissão */}
            <div>
              <label style={LBL}>Data de Emissão *</label>
              <input type="date" style={INP} value={form.startDate} onChange={e => setF('startDate', e.target.value)} required />
            </div>
            {/* Data Vencimento */}
            <div>
              <label style={LBL}>Data de Vencimento *</label>
              <input type="date" style={INP} value={form.endDate} onChange={e => setF('endDate', e.target.value)} required />
            </div>
            {/* Prêmio */}
            <div>
              <label style={LBL}>Prêmio Líquido (R$) *</label>
              <input type="number" step="0.01" min="0" style={INP} value={form.premiumAmount}
                onChange={e => setF('premiumAmount', e.target.value)} placeholder="1200.00" required />
            </div>
            {/* % Comissão */}
            <div>
              <label style={LBL}>Comissão (%) *</label>
              <input type="number" step="0.1" min="0" max="100" style={INP} value={form.percComissao}
                onChange={e => setF('percComissao', e.target.value)} placeholder="20" required />
            </div>
            {/* Comissão gerada (calculada) */}
            {form.premiumAmount && form.percComissao && (
              <div style={{ ...CARD, background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <p style={{ margin: 0, fontSize: 11, color: '#6b7280', fontWeight: 600 }}>COMISSÃO GERADA (CALC.)</p>
                <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color: '#16a34a' }}>
                  {fmt(parseFloat(form.premiumAmount || '0') * parseFloat(form.percComissao || '0') / 100)}
                </p>
              </div>
            )}
            {/* Status comissão */}
            <div>
              <label style={LBL}>Comissão Paga?</label>
              <select style={INP} value={form.comissaoPaga} onChange={e => setF('comissaoPaga', e.target.value)}>
                <option value="PENDENTE">Pendente</option>
                <option value="PAGA">Paga</option>
              </select>
            </div>
            {/* Data pagamento */}
            {form.comissaoPaga === 'PAGA' && (
              <div>
                <label style={LBL}>Data de Pagamento</label>
                <input type="date" style={INP} value={form.dataPagamentoComissao}
                  onChange={e => setF('dataPagamentoComissao', e.target.value)} />
              </div>
            )}
            {/* Observações */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LBL}>Observações</label>
              <textarea style={{ ...INP, height: 60, resize: 'vertical' }} value={form.notes}
                onChange={e => setF('notes', e.target.value)} placeholder="Anotações sobre a apólice..." />
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button type="submit" disabled={creating}
              style={{ ...btnStyle('#0B2442'), padding: '9px 24px', fontSize: 13, opacity: creating ? 0.6 : 1 }}>
              {creating ? 'Salvando...' : 'Salvar Apólice'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); }}
              style={{ ...btnStyle('#6b7280'), padding: '9px 18px', fontSize: 13 }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* ── Formulário de edição inline ──────────────────────────────────── */}
      {editId && (
        <form onSubmit={handleEdit} style={{ ...CARD, marginBottom: 24, borderLeft: '4px solid #D1B46A' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0B2442', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px' }}>✏️ Editar Apólice</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div>
              <label style={LBL}>Tipo de Seguro</label>
              <select style={INP} value={editForm.type ?? ''} onChange={e => setE('type', e.target.value)}>
                {TIPOS.map(t => <option key={t} value={t}>{insuranceTypeLabel[t] || t}</option>)}
              </select>
            </div>
            <div>
              <label style={LBL}>Seguradora</label>
              <input style={INP} value={editForm.insurer ?? ''} onChange={e => setE('insurer', e.target.value)} />
            </div>
            <div>
              <label style={LBL}>Nº CI</label>
              <input style={INP} value={editForm.numeroCi ?? ''} onChange={e => setE('numeroCi', e.target.value)} />
            </div>
            <div>
              <label style={LBL}>Tipo de Emissão</label>
              <select style={INP} value={editForm.tipoEmissao ?? 'NOVO'} onChange={e => setE('tipoEmissao', e.target.value)}>
                <option value="NOVO">Novo</option>
                <option value="RENOVACAO">Renovação</option>
              </select>
            </div>
            <div>
              <label style={LBL}>Nome do Segurado</label>
              <input style={INP} value={editForm.customerName ?? ''} onChange={e => setE('customerName', e.target.value)} />
            </div>
            <div>
              <label style={LBL}>Contato</label>
              <input style={INP} value={editForm.customerPhone ?? ''} onChange={e => setE('customerPhone', e.target.value)} />
            </div>
            <div>
              <label style={LBL}>Emissão</label>
              <input type="date" style={INP} value={editForm.startDate ?? ''} onChange={e => setE('startDate', e.target.value)} />
            </div>
            <div>
              <label style={LBL}>Vencimento</label>
              <input type="date" style={INP} value={editForm.endDate ?? ''} onChange={e => setE('endDate', e.target.value)} />
            </div>
            <div>
              <label style={LBL}>Prêmio (R$)</label>
              <input type="number" step="0.01" min="0" style={INP} value={editForm.premiumAmount ?? ''}
                onChange={e => setE('premiumAmount', e.target.value)} />
            </div>
            <div>
              <label style={LBL}>Comissão (%)</label>
              <input type="number" step="0.1" min="0" max="100" style={INP} value={editForm.percComissao ?? ''}
                onChange={e => setE('percComissao', e.target.value)} />
            </div>
            <div>
              <label style={LBL}>Comissão Paga?</label>
              <select style={INP} value={editForm.comissaoPaga ?? 'PENDENTE'} onChange={e => setE('comissaoPaga', e.target.value)}>
                <option value="PENDENTE">Pendente</option>
                <option value="PAGA">Paga</option>
              </select>
            </div>
            {editForm.comissaoPaga === 'PAGA' && (
              <div>
                <label style={LBL}>Data de Pagamento</label>
                <input type="date" style={INP} value={editForm.dataPagamentoComissao ?? ''}
                  onChange={e => setE('dataPagamentoComissao', e.target.value)} />
              </div>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LBL}>Observações</label>
              <textarea style={{ ...INP, height: 52, resize: 'vertical' }} value={editForm.notes ?? ''}
                onChange={e => setE('notes', e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <button type="submit" disabled={!!loadingId}
              style={{ ...btnStyle('#D1B46A'), color: '#0B2442', padding: '8px 22px', fontSize: 13, opacity: loadingId ? 0.6 : 1 }}>
              {loadingId ? 'Salvando...' : 'Salvar Alterações'}
            </button>
            <button type="button" onClick={() => { setEditId(null); setEditForm({}); }}
              style={{ ...btnStyle('#6b7280'), padding: '8px 16px', fontSize: 13 }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* ── Tabs + Filtros ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {([['todas','Todas'],['aVencer','⏳ A Vencer'],['vencidas','❌ Vencidas'],['pendente','⚠️ Comissão Pendente']] as [string, string][]).map(([k, label]) => (
          <button key={k} onClick={() => { setTab(k as typeof tab); setPage(1); }}
            style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: tab === k ? '#0B2442' : '#f3f4f6',
              color: tab === k ? '#D1B46A' : '#374151' }}>
            {label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {/* Filtro por tipo */}
        <select style={{ ...INP, width: 160, fontSize: 12 }} value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
          <option value="">Todos os tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{insuranceTypeLabel[t] || t}</option>)}
        </select>
        {/* Busca */}
        <input style={{ ...INP, width: 200, fontSize: 12 }} placeholder="🔍 Buscar segurado, apólice..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {/* ── Tabela de apólices ───────────────────────────────────────────── */}
      <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Tipo','Nº Apólice','Segurado','Seguradora','Emissão','Vencimento','Dias','Vigência','Prêmio','Comissão','Gerada','Status Com.','Data Pgto','Ações'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {res?.data.length === 0 && (
                <tr><td colSpan={14} style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  Nenhuma apólice encontrada.
                </td></tr>
              )}
              {res?.data.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  {/* Tipo */}
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    <Badge label={insuranceTypeLabel[p.type] || p.type} color={insuranceTypeColor[p.type] || '#6b7280'} />
                  </td>
                  {/* Nº Apólice */}
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
                    <div>{p.policyNumber}</div>
                    {p.numeroCi && <div style={{ fontSize: 10, color: '#9ca3af' }}>CI: {p.numeroCi}</div>}
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>{tipoEmissaoLabel[p.tipoEmissao]}</div>
                  </td>
                  {/* Segurado */}
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{p.customerName}</div>
                    {p.customerPhone && <div style={{ fontSize: 10, color: '#6b7280' }}>{p.customerPhone}</div>}
                    {p.customerDocument && <div style={{ fontSize: 10, color: '#9ca3af' }}>{p.customerDocument}</div>}
                  </td>
                  {/* Seguradora */}
                  <td style={{ padding: '10px 12px', color: '#374151', fontWeight: 500 }}>{p.insurer}</td>
                  {/* Emissão */}
                  <td style={{ padding: '10px 12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDate(p.startDate)}</td>
                  {/* Vencimento */}
                  <td style={{ padding: '10px 12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDate(p.endDate)}</td>
                  {/* Dias restantes */}
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                    {p.diasRestantes !== undefined && p.diasRestantes !== null ? (
                      <span style={{ fontWeight: 700, color: p.diasRestantes < 0 ? '#dc2626' : p.diasRestantes <= 30 ? '#d97706' : '#16a34a' }}>
                        {p.diasRestantes < 0 ? `${Math.abs(p.diasRestantes)}d atrás` : `${p.diasRestantes}d`}
                      </span>
                    ) : '-'}
                  </td>
                  {/* Status vigência */}
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    <Badge label={policyVigenciaLabel[p.vigenciaStatus] || p.vigenciaStatus}
                      color={policyVigenciaColor[p.vigenciaStatus] || '#6b7280'} />
                  </td>
                  {/* Prêmio */}
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
                    {p.premiumAmount ? fmt(p.premiumAmount) : '-'}
                    {p.percComissao && <div style={{ fontSize: 10, color: '#9ca3af' }}>{(Number(p.percComissao) * 100).toFixed(1)}%</div>}
                  </td>
                  {/* Comissão gerada */}
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#16a34a', whiteSpace: 'nowrap' }}>
                    {p.comissaoGerada ? fmt(p.comissaoGerada) : '-'}
                  </td>
                  {/* Status comissão */}
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    <Badge label={comissaoPagaLabel[p.comissaoPaga] || p.comissaoPaga}
                      color={comissaoPagaColor[p.comissaoPaga] || '#6b7280'} />
                  </td>
                  {/* Data pagamento */}
                  <td style={{ padding: '10px 12px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {p.dataPagamentoComissao ? fmtDate(p.dataPagamentoComissao) : '-'}
                  </td>
                  {/* Ações */}
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(p)} title="Editar"
                        style={{ ...btnStyle('#2563eb'), padding: '4px 10px' }}>
                        ✏️
                      </button>
                      {p.comissaoPaga === 'PENDENTE' && (
                        <button
                          disabled={loadingId === `${p.id}-paid`}
                          onClick={() => markPaid(p.id)}
                          title="Marcar comissão como paga"
                          style={{ ...btnStyle('#16a34a'), padding: '4px 10px', fontSize: 11, opacity: loadingId === `${p.id}-paid` ? 0.6 : 1 }}>
                          ✓ Pago
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!res && (
                <tr><td colSpan={14} style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  Carregando apólices...
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Paginação ──────────────────────────────────────────────────── */}
        {res && res.meta.pages > 1 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              {res.meta.total} apólices — página {res.meta.page} de {res.meta.pages}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button disabled={page <= 1} onClick={() => loadList(page - 1)}
                style={{ ...btnStyle('#0B2442'), padding: '5px 14px', fontSize: 12, opacity: page <= 1 ? 0.4 : 1 }}>
                ← Anterior
              </button>
              <button disabled={page >= res.meta.pages} onClick={() => loadList(page + 1)}
                style={{ ...btnStyle('#0B2442'), padding: '5px 14px', fontSize: 12, opacity: page >= res.meta.pages ? 0.4 : 1 }}>
                Próxima →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
