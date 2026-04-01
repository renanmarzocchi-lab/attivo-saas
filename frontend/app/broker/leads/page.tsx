'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Novo', CONTACT_ATTEMPTED: 'Contato Tentado', IN_PROGRESS: 'Em Andamento',
  CONVERTED: 'Convertido', LOST: 'Perdido', DISQUALIFIED: 'Desqualificado',
};
const STATUS_COLOR: Record<string, string> = {
  NEW: '#6366f1', CONTACT_ATTEMPTED: '#0ea5e9', IN_PROGRESS: '#f59e0b',
  CONVERTED: '#16a34a', LOST: '#dc2626', DISQUALIFIED: '#9ca3af',
};
const SOURCE_LABEL: Record<string, string> = {
  AFFILIATE: 'Afiliado', ORGANIC: 'Orgânico', CAMPAIGN: 'Campanha',
  WHATSAPP: 'WhatsApp', SITE: 'Site', INDICATION: 'Indicação',
  RENEWAL: 'Renovação', MANUAL: 'Manual',
};

interface Lead {
  id: string; name: string; phone?: string; email?: string;
  status: string; source: string; insuranceType?: string;
  assignedBroker?: { name: string };
  _count: { tasks: number };
  createdAt: string;
}

export default function BrokerLeads() {
  const [leads, setLeads]       = useState<Lead[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatus] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showNew, setShowNew]   = useState(false);
  const [newForm, setNewForm]   = useState({ name: '', phone: '', email: '', insuranceType: '' });
  const [saving, setSaving]     = useState(false);

  const limit = 20;

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search)      params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);

    api.get<{ data: Lead[]; meta: { total: number } }>(`/leads?${params}`)
      .then((r) => { if (active) { setLeads(r.data); setTotal(r.meta.total); } })
      .catch((e) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, search, statusFilter]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/leads', newForm);
      setShowNew(false);
      setNewForm({ name: '', phone: '', email: '', insuranceType: '' });
      setPage(1);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      await api.patch(`/leads/${id}`, { status });
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
    } catch (err: any) {
      alert(err.message);
    }
  }

  const pages = Math.ceil(total / limit);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Leads</h2>
        <button onClick={() => setShowNew(true)}
          style={{ padding: '8px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          + Novo Lead
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input placeholder="Buscar por nome..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, flex: 1, fontSize: 14 }} />
        <select value={statusFilter} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}

      {/* Modal novo lead */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: 400 }}>
            <h3 style={{ marginBottom: 20 }}>Novo Lead</h3>
            <form onSubmit={handleCreate} style={{ display: 'grid', gap: 12 }}>
              <input required placeholder="Nome *" value={newForm.name}
                onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8 }} />
              <input placeholder="Telefone" value={newForm.phone}
                onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })}
                style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8 }} />
              <input type="email" placeholder="Email" value={newForm.email}
                onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
                style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8 }} />
              <select value={newForm.insuranceType}
                onChange={(e) => setNewForm({ ...newForm, insuranceType: e.target.value })}
                style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}>
                <option value="">Tipo de Seguro (opcional)</option>
                {['AUTO','RESIDENCIAL','EMPRESARIAL','VIDA','PREVIDENCIA','SAUDE','ODONTO','VIAGEM','RC','EQUIPAMENTOS','OUTROS'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setShowNew(false)}
                  style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  style={{ flex: 1, padding: '8px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                  {saving ? 'Salvando...' : 'Criar Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabela de leads */}
      {loading ? <p>Carregando...</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={th}>Nome</th>
                <th style={th}>Contato</th>
                <th style={th}>Tipo</th>
                <th style={th}>Origem</th>
                <th style={th}>Status</th>
                <th style={th}>Corretor</th>
                <th style={th}>Tarefas</th>
                <th style={th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={td}><strong>{lead.name}</strong></td>
                  <td style={td}>
                    {lead.phone && <div style={{ fontSize: 12 }}>{lead.phone}</div>}
                    {lead.email && <div style={{ fontSize: 12, color: '#6b7280' }}>{lead.email}</div>}
                  </td>
                  <td style={td}>{lead.insuranceType ?? '—'}</td>
                  <td style={td}>{SOURCE_LABEL[lead.source] ?? lead.source}</td>
                  <td style={td}>
                    <span style={{ background: `${STATUS_COLOR[lead.status]}20`, color: STATUS_COLOR[lead.status], padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                      {STATUS_LABEL[lead.status] ?? lead.status}
                    </span>
                  </td>
                  <td style={td}>{lead.assignedBroker?.name ?? '—'}</td>
                  <td style={td} align="center">{lead._count.tasks}</td>
                  <td style={td}>
                    <select value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }}>
                      {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Nenhum lead encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {pages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
          <button disabled={page === 1} onClick={() => setPage(page - 1)}
            style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', background: '#fff' }}>
            ← Anterior
          </button>
          <span style={{ padding: '6px 12px', fontSize: 14 }}>{page} / {pages} ({total} leads)</span>
          <button disabled={page >= pages} onClick={() => setPage(page + 1)}
            style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', background: '#fff' }}>
            Próximo →
          </button>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'left', fontSize: 12,
  fontWeight: 600, color: '#6b7280', textTransform: 'uppercase',
  borderBottom: '1px solid #e5e7eb',
};
const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'middle' };
