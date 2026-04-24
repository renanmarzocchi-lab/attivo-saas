'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { api } from '../../../../lib/api';

const TYPES   = ['AUTO','RESIDENCIAL','EMPRESARIAL','VIDA','PREVIDENCIA','SAUDE','ODONTO','VIAGEM','RC','EQUIPAMENTOS','OUTROS'];
const STAGES  = ['LEAD','EM_COTACAO','COTADO','PROPOSTA_ENVIADA','PROPOSTA_ACEITA','APOLICE_EMITIDA'];
const SOURCES = ['DIRECT','AFFILIATE','SITE','WHATSAPP','MANUAL'];

const inp: React.CSSProperties = { padding: '9px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, width: '100%' };
const lbl: React.CSSProperties = { fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4, fontWeight: 500 };

interface AffiliateOption { id: string; name: string; refCode: string; commissionRate: number }

export default function NewInsurance() {
  const [form, setForm] = useState({
    type: 'AUTO', stage: 'LEAD', insurer: '', sourceType: 'MANUAL',
    customerName: '', customerDocument: '', customerEmail: '', customerPhone: '', customerCityUf: '',
    premiumAmount: '', estimatedCommission: '', policyNumber: '', proposalNumber: '',
    startDate: '', endDate: '', renewalReminderDays: '30', notes: '',
    affiliateId: '', refCode: '',
  });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  // Dados de comissão
  const [brokerRate,  setBrokerRate]  = useState(0);
  const [affiliates,  setAffiliates]  = useState<AffiliateOption[]>([]);
  const [selectedAff, setSelectedAff] = useState<AffiliateOption | null>(null);
  const [commissionCalc, setCommissionCalc] = useState<{ rate: number; value: number } | null>(null);
  const manualCommission = useRef(false);

  // Carrega taxa do corretor e lista de afiliados
  useEffect(() => {
    api.get<{ commissionRate: number }>('/broker/commission-rate')
      .then(r => setBrokerRate(r.commissionRate))
      .catch(() => {});
    api.get<{ data: AffiliateOption[] }>('/affiliates?limit=200&status=ACTIVE')
      .then(r => setAffiliates(r.data ?? []))
      .catch(() => {});
  }, []);

  // Auto-calcula comissão ao mudar prêmio ou afiliado
  useEffect(() => {
    if (manualCommission.current) return;
    const premium = parseFloat(form.premiumAmount);
    if (!premium || isNaN(premium)) { setCommissionCalc(null); return; }

    if (form.affiliateId && selectedAff) {
      const value = Math.round(premium * selectedAff.commissionRate * 100) / 100;
      setCommissionCalc({ rate: selectedAff.commissionRate, value });
      setForm(f => ({ ...f, estimatedCommission: value.toFixed(2) }));
    } else if (brokerRate > 0) {
      const value = Math.round(premium * brokerRate * 100) / 100;
      setCommissionCalc({ rate: brokerRate, value });
      setForm(f => ({ ...f, estimatedCommission: value.toFixed(2) }));
    } else {
      setCommissionCalc(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.premiumAmount, form.affiliateId, selectedAff, brokerRate]);

  function set(field: string, value: string) {
    if (field === 'estimatedCommission') manualCommission.current = true;
    if (field === 'premiumAmount' || field === 'affiliateId') manualCommission.current = false;
    setForm(f => ({ ...f, [field]: value }));
    if (field === 'affiliateId') {
      const aff = affiliates.find(a => a.id === value) ?? null;
      setSelectedAff(aff);
      if (!value) setForm(f => ({ ...f, affiliateId: '', refCode: '' }));
      else if (aff) setForm(f => ({ ...f, affiliateId: value, refCode: aff.refCode }));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        type:             form.type,
        stage:            form.stage,
        sourceType:       form.sourceType,
        customerName:     form.customerName,
        customerDocument: form.customerDocument,
        renewalReminderDays: parseInt(form.renewalReminderDays) || 30,
      };
      if (form.insurer)            payload.insurer            = form.insurer;
      if (form.customerEmail)      payload.customerEmail      = form.customerEmail;
      if (form.customerPhone)      payload.customerPhone      = form.customerPhone;
      if (form.customerCityUf)     payload.customerCityUf     = form.customerCityUf;
      if (form.premiumAmount)      payload.premiumAmount      = parseFloat(form.premiumAmount);
      if (form.estimatedCommission) payload.estimatedCommission = parseFloat(form.estimatedCommission);
      if (form.policyNumber)       payload.policyNumber       = form.policyNumber;
      if (form.proposalNumber)     payload.proposalNumber     = form.proposalNumber;
      if (form.startDate)          payload.startDate          = new Date(form.startDate).toISOString();
      if (form.endDate)            payload.endDate            = new Date(form.endDate).toISOString();
      if (form.notes)              payload.notes              = form.notes;
      if (form.affiliateId)        payload.affiliateId        = form.affiliateId;
      if (form.refCode)            payload.refCode            = form.refCode;

      const res = await api.post<{ record: { id: string } }>('/broker/insurance', payload);
      window.location.href = `/broker/insurance/${res.record.id}`;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar registro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Novo Seguro</h2>
      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 16, color: '#374151' }}>Dados do Seguro</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>Tipo *</label>
              <select style={inp} value={form.type} onChange={e => set('type', e.target.value)} required>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Stage *</label>
              <select style={inp} value={form.stage} onChange={e => set('stage', e.target.value)}>
                {STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Origem</label>
              <select style={inp} value={form.sourceType} onChange={e => set('sourceType', e.target.value)}>
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Seguradora</label>
              <input style={inp} value={form.insurer} onChange={e => set('insurer', e.target.value)} placeholder="Ex: Porto Seguro" />
            </div>
            <div><label style={lbl}>Nº Proposta</label>
              <input style={inp} value={form.proposalNumber} onChange={e => set('proposalNumber', e.target.value)} />
            </div>
            <div><label style={lbl}>Nº Apólice</label>
              <input style={inp} value={form.policyNumber} onChange={e => set('policyNumber', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 16, color: '#374151' }}>Dados do Cliente</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div><label style={lbl}>Nome *</label>
              <input style={inp} value={form.customerName} onChange={e => set('customerName', e.target.value)} required placeholder="Nome completo" />
            </div>
            <div><label style={lbl}>CPF/CNPJ *</label>
              <input style={inp} value={form.customerDocument} onChange={e => set('customerDocument', e.target.value)} required placeholder="000.000.000-00" />
            </div>
            <div><label style={lbl}>E-mail</label>
              <input style={inp} type="email" value={form.customerEmail} onChange={e => set('customerEmail', e.target.value)} />
            </div>
            <div><label style={lbl}>Telefone</label>
              <input style={inp} value={form.customerPhone} onChange={e => set('customerPhone', e.target.value)} placeholder="(00) 90000-0000" />
            </div>
            <div><label style={lbl}>Cidade/UF</label>
              <input style={inp} value={form.customerCityUf} onChange={e => set('customerCityUf', e.target.value)} placeholder="São Paulo/SP" />
            </div>
          </div>
        </div>

        {/* Afiliado / Corretor */}
        <div className="card" style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 16, color: '#374151' }}>Afiliado (opcional)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Afiliado</label>
              <select style={inp} value={form.affiliateId} onChange={e => set('affiliateId', e.target.value)}>
                <option value="">— Nenhum (comissão do corretor) —</option>
                {affiliates.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.refCode}) — {(a.commissionRate * 100).toFixed(1)}%
                  </option>
                ))}
              </select>
            </div>
            <div><label style={lbl}>Código de Referência</label>
              <input style={inp} value={form.refCode} onChange={e => set('refCode', e.target.value)} placeholder="Preenchido automaticamente" readOnly={!!form.affiliateId} />
            </div>
          </div>
          {brokerRate > 0 && !form.affiliateId && (
            <p style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
              Sua taxa de comissão: <strong>{(brokerRate * 100).toFixed(1)}%</strong>
            </p>
          )}
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 16, color: '#374151' }}>Financeiro &amp; Vigência</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Prêmio Líquido (R$)</label>
              <input style={inp} type="number" step="0.01" min="0" value={form.premiumAmount}
                onChange={e => set('premiumAmount', e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <label style={lbl}>
                Comissão Est. (R$)
                {commissionCalc && (
                  <span style={{ marginLeft: 6, color: '#16a34a', fontWeight: 700 }}>
                    {(commissionCalc.rate * 100).toFixed(1)}% auto
                  </span>
                )}
              </label>
              <input style={{ ...inp, background: commissionCalc ? '#f0fdf4' : undefined }}
                type="number" step="0.01" min="0" value={form.estimatedCommission}
                onChange={e => set('estimatedCommission', e.target.value)} placeholder="0,00" />
            </div>
            <div><label style={lbl}>Início da vigência</label>
              <input style={inp} type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            </div>
            <div><label style={lbl}>Fim da vigência</label>
              <input style={inp} type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
            </div>
            <div><label style={lbl}>Alerta renovação (dias antes)</label>
              <input style={inp} type="number" min="1" max="365" value={form.renewalReminderDays}
                onChange={e => set('renewalReminderDays', e.target.value)} />
            </div>
          </div>
          {commissionCalc && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0', fontSize: 13 }}>
              Comissão calculada automaticamente: <strong>R$ {commissionCalc.value.toFixed(2)}</strong>
              {' '}({(commissionCalc.rate * 100).toFixed(1)}% sobre o prêmio)
              {' — '}
              {form.affiliateId ? `Afiliado: ${selectedAff?.name}` : 'Comissão do corretor'}
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 12, color: '#374151' }}>Observações</h4>
          <textarea style={{ ...inp, height: 80, resize: 'vertical' }} value={form.notes}
            onChange={e => set('notes', e.target.value)} placeholder="Notas internas..." />
        </div>

        {error && <p style={{ color: '#dc2626', background: '#fef2f2', padding: 12, borderRadius: 6, marginBottom: 12 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={loading}
            style={{ padding: '12px 28px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
            {loading ? 'Salvando...' : 'Criar Registro'}
          </button>
          <a href="/broker/insurance" style={{ padding: '12px 20px', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, textDecoration: 'none', fontSize: 14 }}>
            Cancelar
          </a>
        </div>
      </form>
    </div>
  );
}
