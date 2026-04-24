'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../../lib/api';
import { fmt, fmtDate } from '../../../../lib/formatting';

const inp: React.CSSProperties = { padding: '9px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, width: '100%' };
const lbl: React.CSSProperties = { fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4, fontWeight: 500 };

const STAGES = ['LEAD','EM_COTACAO','COTADO','PROPOSTA_ENVIADA','PROPOSTA_ACEITA','APOLICE_EMITIDA'];
const STAGE_LABEL: Record<string, string> = {
  LEAD: 'Lead', EM_COTACAO: 'Em Cotação', COTADO: 'Cotado',
  PROPOSTA_ENVIADA: 'Proposta Enviada', PROPOSTA_ACEITA: 'Proposta Aceita', APOLICE_EMITIDA: 'Apólice Emitida',
};
const STAGE_COLOR: Record<string, string> = {
  LEAD: '#6b7280', EM_COTACAO: '#d97706', COTADO: '#2563eb',
  PROPOSTA_ENVIADA: '#7c3aed', PROPOSTA_ACEITA: '#059669', APOLICE_EMITIDA: '#16a34a',
};
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#16a34a', EXPIRED: '#dc2626', EXPIRING_SOON: '#d97706', CANCELLED: '#6b7280', RENEWED: '#2563eb',
};

type TimelineEntry = { id: string; action: string; description?: string; createdAt: string; createdBy?: { name: string } };
type Notification  = { id: string; type: string; status: string; scheduledAt: string; sentAt?: string; channel: string };
type Attachment    = { id: string; originalFileName: string; fileUrl: string; mimeType?: string; size?: number; createdAt: string; uploadedBy?: { name: string } };
type Record_       = {
  id: string; type: string; stage: string; status: string; insurer?: string;
  customerName: string; customerDocument: string; customerEmail?: string;
  customerPhone?: string; customerCityUf?: string;
  premiumAmount?: number; estimatedCommission?: number;
  policyNumber?: string; proposalNumber?: string;
  startDate?: string; endDate?: string; renewalReminderDays: number;
  notes?: string; sourceType: string;
  createdBy?: { name: string }; owner?: { name: string };
  createdAt: string; updatedAt: string;
  timeline: TimelineEntry[];
  notifications: Notification[];
};

export default function InsuranceDetail() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord]       = useState<Record_ | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [tab, setTab]             = useState<'info'|'timeline'|'notifications'|'attachments'>('info');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // edit form state
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<Partial<Record_>>({});

  // stage change
  const [newStage, setNewStage]         = useState('');
  const [stageNote, setStageNote]       = useState('');
  const [stageSaving, setStageSaving]   = useState(false);

  const load = useCallback(async () => {
    let active = true;
    setLoading(true);
    try {
      const [recRes, attRes] = await Promise.all([
        api.get<{ record: Record_ }>(`/broker/insurance/${id}`),
        api.get<{ attachments: Attachment[] }>(`/broker/insurance/${id}/attachments`),
      ]);
      if (!active) return;
      setRecord(recRes.record);
      setForm(recRes.record);
      setNewStage(recRes.record.stage);
      setAttachments(attRes.attachments);
    } catch {
      if (active) setError('Erro ao carregar registro');
    } finally {
      if (active) setLoading(false);
    }
    return () => { active = false; };
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function setF(field: string, value: string | number) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        insurer:             form.insurer,
        customerName:        form.customerName,
        customerDocument:    form.customerDocument,
        customerEmail:       form.customerEmail,
        customerPhone:       form.customerPhone,
        customerCityUf:      form.customerCityUf,
        premiumAmount:       form.premiumAmount ? Number(form.premiumAmount) : undefined,
        estimatedCommission: form.estimatedCommission ? Number(form.estimatedCommission) : undefined,
        policyNumber:        form.policyNumber,
        proposalNumber:      form.proposalNumber,
        renewalReminderDays: form.renewalReminderDays ? Number(form.renewalReminderDays) : 30,
        notes:               form.notes,
        startDate:           form.startDate ? new Date(form.startDate as string).toISOString() : undefined,
        endDate:             form.endDate   ? new Date(form.endDate   as string).toISOString() : undefined,
      };
      await api.patch(`/broker/insurance/${id}`, payload);
      setEdit(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function handleStageChange() {
    if (newStage === record?.stage) return;
    setStageSaving(true);
    setError('');
    try {
      await api.patch(`/broker/insurance/${id}/stage`, { stage: newStage, note: stageNote });
      setStageNote('');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao mudar stage');
    } finally {
      setStageSaving(false);
    }
  }

  if (loading) return <p>Carregando...</p>;
  if (!record) return <p style={{ color: '#dc2626' }}>{error || 'Registro não encontrado.'}</p>;

  const dateInput = (val?: string) => val ? val.split('T')[0] : '';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <a href="/broker/insurance" style={{ color: '#6b7280', textDecoration: 'none', fontSize: 14 }}>← Carteira</a>
        <h2 style={{ margin: 0 }}>{record.customerName}</h2>
        <span style={{ background: STAGE_COLOR[record.stage] ?? '#6b7280', color: '#fff', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
          {STAGE_LABEL[record.stage] ?? record.stage}
        </span>
        <span style={{ background: STATUS_COLOR[record.status] ?? '#6b7280', color: '#fff', padding: '3px 10px', borderRadius: 12, fontSize: 12 }}>
          {record.status}
        </span>
      </div>

      {error && <p style={{ color: '#dc2626', background: '#fef2f2', padding: 10, borderRadius: 6, marginBottom: 12 }}>{error}</p>}

      {/* Stage change bar */}
      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={lbl}>Mover para stage</label>
          <select style={inp} value={newStage} onChange={e => setNewStage(e.target.value)}>
            {STAGES.map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
          </select>
        </div>
        <div style={{ flex: 2 }}>
          <label style={lbl}>Nota (opcional)</label>
          <input style={inp} value={stageNote} onChange={e => setStageNote(e.target.value)} placeholder="Ex: Cliente aprovou proposta" />
        </div>
        <button
          onClick={handleStageChange}
          disabled={stageSaving || newStage === record.stage}
          style={{ padding: '9px 20px', background: newStage !== record.stage ? '#1d4ed8' : '#9ca3af', color: '#fff', border: 'none', borderRadius: 6, cursor: newStage !== record.stage ? 'pointer' : 'default', fontWeight: 600 }}>
          {stageSaving ? 'Salvando...' : 'Atualizar Stage'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid #e5e7eb' }}>
        {(['info','attachments','timeline','notifications'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: tab === t ? 700 : 400,
              color: tab === t ? '#1d4ed8' : '#6b7280', borderBottom: tab === t ? '2px solid #1d4ed8' : '2px solid transparent', marginBottom: -2 }}>
            {t === 'info' ? 'Informações'
              : t === 'attachments' ? `Anexos (${attachments.length})`
              : t === 'timeline' ? `Histórico (${record.timeline.length})`
              : `Notificações (${record.notifications.length})`}
          </button>
        ))}
      </div>

      {/* Tab: Informações */}
      {tab === 'info' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            {edit
              ? <>
                  <button onClick={handleSave} disabled={saving}
                    style={{ padding: '8px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, marginRight: 8 }}>
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button onClick={() => { setEdit(false); setForm(record); }}
                    style={{ padding: '8px 14px', background: 'none', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </>
              : <button onClick={() => setEdit(true)}
                  style={{ padding: '8px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                  Editar
                </button>
            }
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <h4 style={{ marginBottom: 14, color: '#374151' }}>Seguro</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>Tipo</label>
                {edit ? <input style={inp} value={form.type ?? ''} onChange={e => setF('type', e.target.value)} /> : <p style={{ margin: 0, fontWeight: 600 }}>{record.type}</p>}
              </div>
              <div><label style={lbl}>Seguradora</label>
                {edit ? <input style={inp} value={form.insurer ?? ''} onChange={e => setF('insurer', e.target.value)} /> : <p style={{ margin: 0 }}>{record.insurer ?? '-'}</p>}
              </div>
              <div><label style={lbl}>Origem</label><p style={{ margin: 0 }}>{record.sourceType}</p></div>
              <div><label style={lbl}>Nº Proposta</label>
                {edit ? <input style={inp} value={form.proposalNumber ?? ''} onChange={e => setF('proposalNumber', e.target.value)} /> : <p style={{ margin: 0 }}>{record.proposalNumber ?? '-'}</p>}
              </div>
              <div><label style={lbl}>Nº Apólice</label>
                {edit ? <input style={inp} value={form.policyNumber ?? ''} onChange={e => setF('policyNumber', e.target.value)} /> : <p style={{ margin: 0 }}>{record.policyNumber ?? '-'}</p>}
              </div>
              <div><label style={lbl}>Criado por</label><p style={{ margin: 0 }}>{record.createdBy?.name ?? '-'}</p></div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <h4 style={{ marginBottom: 14, color: '#374151' }}>Cliente</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <div><label style={lbl}>Nome</label>
                {edit ? <input style={inp} value={form.customerName ?? ''} onChange={e => setF('customerName', e.target.value)} /> : <p style={{ margin: 0, fontWeight: 600 }}>{record.customerName}</p>}
              </div>
              <div><label style={lbl}>CPF/CNPJ</label>
                {edit ? <input style={inp} value={form.customerDocument ?? ''} onChange={e => setF('customerDocument', e.target.value)} /> : <p style={{ margin: 0 }}>{record.customerDocument}</p>}
              </div>
              <div><label style={lbl}>E-mail</label>
                {edit ? <input style={inp} type="email" value={form.customerEmail ?? ''} onChange={e => setF('customerEmail', e.target.value)} /> : <p style={{ margin: 0 }}>{record.customerEmail ?? '-'}</p>}
              </div>
              <div><label style={lbl}>Telefone</label>
                {edit ? <input style={inp} value={form.customerPhone ?? ''} onChange={e => setF('customerPhone', e.target.value)} /> : <p style={{ margin: 0 }}>{record.customerPhone ?? '-'}</p>}
              </div>
              <div><label style={lbl}>Cidade/UF</label>
                {edit ? <input style={inp} value={form.customerCityUf ?? ''} onChange={e => setF('customerCityUf', e.target.value)} /> : <p style={{ margin: 0 }}>{record.customerCityUf ?? '-'}</p>}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <h4 style={{ marginBottom: 14, color: '#374151' }}>Financeiro & Vigência</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>Prêmio</label>
                {edit ? <input style={inp} type="number" step="0.01" value={form.premiumAmount ?? ''} onChange={e => setF('premiumAmount', e.target.value)} />
                      : <p style={{ margin: 0, fontWeight: 700, color: '#16a34a' }}>{record.premiumAmount ? fmt(record.premiumAmount) : '-'}</p>}
              </div>
              <div><label style={lbl}>Comissão Est.</label>
                {edit ? <input style={inp} type="number" step="0.01" value={form.estimatedCommission ?? ''} onChange={e => setF('estimatedCommission', e.target.value)} />
                      : <p style={{ margin: 0, fontWeight: 700, color: '#2563eb' }}>{record.estimatedCommission ? fmt(record.estimatedCommission) : '-'}</p>}
              </div>
              <div><label style={lbl}>Início vigência</label>
                {edit ? <input style={inp} type="date" value={dateInput(form.startDate as string)} onChange={e => setF('startDate', e.target.value)} />
                      : <p style={{ margin: 0 }}>{fmtDate(record.startDate)}</p>}
              </div>
              <div><label style={lbl}>Fim vigência</label>
                {edit ? <input style={inp} type="date" value={dateInput(form.endDate as string)} onChange={e => setF('endDate', e.target.value)} />
                      : <p style={{ margin: 0 }}>{fmtDate(record.endDate)}</p>}
              </div>
              <div><label style={lbl}>Alerta renovação (dias antes)</label>
                {edit ? <input style={inp} type="number" min="1" max="365" value={form.renewalReminderDays ?? 30} onChange={e => setF('renewalReminderDays', e.target.value)} />
                      : <p style={{ margin: 0 }}>{record.renewalReminderDays} dias</p>}
              </div>
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: 8, color: '#374151' }}>Observações</h4>
            {edit
              ? <textarea style={{ ...inp, height: 80, resize: 'vertical' }} value={form.notes ?? ''} onChange={e => setF('notes', e.target.value)} />
              : <p style={{ margin: 0, color: '#374151', whiteSpace: 'pre-wrap' }}>{record.notes || <em style={{ color: '#9ca3af' }}>Sem observações</em>}</p>}
          </div>
        </div>
      )}

      {/* Tab: Anexos */}
      {tab === 'attachments' && (
        <div className="card">
          {/* Upload */}
          <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #e5e7eb' }}>
            <h4 style={{ marginBottom: 10, color: '#374151' }}>Adicionar Anexo</h4>
            {uploadError && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 8 }}>{uploadError}</p>}
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.txt"
              disabled={uploading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                setUploadError('');
                try {
                  const formData = new FormData();
                  formData.append('file', file);
                  const token = localStorage.getItem('attivo_token');
                  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1';
                  const res = await fetch(`${apiUrl}/broker/insurance/${id}/attachments`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                  });
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.message ?? 'Erro ao enviar arquivo');
                  }
                  await load();
                  e.target.value = '';
                } catch (err: unknown) {
                  setUploadError(err instanceof Error ? err.message : 'Erro ao enviar');
                } finally {
                  setUploading(false);
                }
              }}
              style={{ fontSize: 14 }}
            />
            {uploading && <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Enviando...</p>}
            <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>
              Tipos permitidos: PDF, imagem, DOCX, XLSX, TXT · Máx 10 MB
            </p>
          </div>

          {/* Lista de anexos */}
          {attachments.length === 0 && <p style={{ color: '#9ca3af' }}>Nenhum anexo.</p>}
          <div style={{ display: 'grid', gap: 10 }}>
            {attachments.map(att => (
              <div key={att.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div>
                  <a href={att.fileUrl} target="_blank" rel="noopener noreferrer"
                    style={{ fontWeight: 600, color: '#1d4ed8', fontSize: 14, textDecoration: 'none' }}>
                    📎 {att.originalFileName}
                  </a>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>
                    {att.mimeType ?? '—'} · {att.size ? `${Math.round(att.size / 1024)} KB` : '—'} · {att.uploadedBy?.name} · {fmtDate(att.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Histórico */}
      {tab === 'timeline' && (
        <div className="card">
          {record.timeline.length === 0 && <p style={{ color: '#9ca3af' }}>Nenhum registro no histórico.</p>}
          <div style={{ display: 'grid', gap: 12 }}>
            {record.timeline.map(entry => (
              <div key={entry.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1d4ed8', marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{entry.action}</span>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>{fmtDate(entry.createdAt)} · {entry.createdBy?.name ?? 'Sistema'}</span>
                  </div>
                  {entry.description && <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{entry.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Notificações */}
      {tab === 'notifications' && (
        <div className="card">
          {record.notifications.length === 0 && <p style={{ color: '#9ca3af' }}>Nenhuma notificação agendada.</p>}
          <div style={{ display: 'grid', gap: 8 }}>
            {record.notifications.map(n => (
              <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{n.type}</span>
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280' }}>via {n.channel}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    background: n.status === 'SENT' ? '#dcfce7' : n.status === 'FAILED' ? '#fee2e2' : '#fef9c3',
                    color: n.status === 'SENT' ? '#16a34a' : n.status === 'FAILED' ? '#dc2626' : '#854d0e',
                    padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600
                  }}>{n.status}</span>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>
                    {n.status === 'SENT' ? `Enviado: ${fmtDate(n.sentAt)}` : `Agendado: ${fmtDate(n.scheduledAt)}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
