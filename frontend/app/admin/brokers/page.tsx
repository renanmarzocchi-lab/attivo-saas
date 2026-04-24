'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../../../lib/api';

interface Broker {
  id: string; name: string; email: string; role: string; status: string;
  commissionRate: number; pixKey?: string; createdAt: string;
  _count: { ownedInsurances: number; brokerCommissions: number };
}
interface Res { data: Broker[]; meta: { total: number; page: number; pages: number } }

const inp: React.CSSProperties = { padding: '9px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, width: '100%' };
const lbl: React.CSSProperties = { fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4, fontWeight: 500 };

export default function AdminBrokers() {
  const [res,     setRes]     = useState<Res | null>(null);
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState('');
  const [error,   setError]   = useState('');
  const [msg,     setMsg]     = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '', email: '', password: '', commissionRate: '', pixKey: '', status: 'ACTIVE',
  });
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    api.get<Res>(`/admin/brokers?${params}`).then(setRes).catch(e => setError(e.message));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  async function create() {
    setMsg('');
    try {
      await api.post('/admin/brokers', {
        name:           form.name,
        email:          form.email,
        password:       form.password,
        commissionRate: parseFloat(form.commissionRate) / 100 || 0,
        pixKey:         form.pixKey || undefined,
        status:         form.status,
      });
      setMsg('Corretor criado com sucesso!');
      setShowNew(false);
      setForm({ name: '', email: '', password: '', commissionRate: '', pixKey: '', status: 'ACTIVE' });
      load();
    } catch (e: unknown) { setMsg(e instanceof Error ? e.message : 'Erro'); }
  }

  async function update(id: string) {
    setMsg('');
    try {
      const payload: Record<string, unknown> = {};
      if (editForm.name)           payload.name           = editForm.name;
      if (editForm.commissionRate) payload.commissionRate = parseFloat(editForm.commissionRate) / 100;
      if (editForm.pixKey !== undefined) payload.pixKey   = editForm.pixKey || null;
      if (editForm.status)         payload.status         = editForm.status;
      if (editForm.password)       payload.password       = editForm.password;
      await api.patch(`/admin/brokers/${id}`, payload);
      setMsg('Corretor atualizado!');
      setEditing(null);
      load();
    } catch (e: unknown) { setMsg(e instanceof Error ? e.message : 'Erro'); }
  }

  const statusColor: Record<string, string> = { ACTIVE: '#16a34a', INACTIVE: '#6b7280', BLOCKED: '#dc2626' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>Corretores</h2>
        <button onClick={() => setShowNew(v => !v)}
          style={{ padding: '8px 20px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
          {showNew ? 'Cancelar' : '+ Novo Corretor'}
        </button>
      </div>

      {msg && <p style={{ background: '#f0fdf4', color: '#16a34a', padding: 10, borderRadius: 6, marginBottom: 12 }}>{msg}</p>}
      {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}

      {showNew && (
        <div className="card" style={{ marginBottom: 16, border: '1px solid #bfdbfe', background: '#eff6ff' }}>
          <h4 style={{ marginBottom: 16 }}>Novo Corretor</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>Nome *</label><input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome completo" /></div>
            <div><label style={lbl}>E-mail *</label><input style={inp} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><label style={lbl}>Senha *</label><input style={inp} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mín. 8 caracteres" /></div>
            <div><label style={lbl}>Comissão (%)</label><input style={inp} type="number" step="0.1" min="0" max="100" value={form.commissionRate} onChange={e => setForm(f => ({ ...f, commissionRate: e.target.value }))} placeholder="Ex: 5 para 5%" /></div>
            <div><label style={lbl}>Chave PIX</label><input style={inp} value={form.pixKey} onChange={e => setForm(f => ({ ...f, pixKey: e.target.value }))} /></div>
            <div><label style={lbl}>Status</label>
              <select style={inp} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="ACTIVE">ATIVO</option>
                <option value="INACTIVE">INATIVO</option>
              </select>
            </div>
          </div>
          <button onClick={create}
            style={{ marginTop: 12, padding: '8px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            Criar Corretor
          </button>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <input style={{ ...inp, maxWidth: 300 }} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por nome ou e-mail..." />
      </div>

      {!res && <p>Carregando...</p>}
      {res && res.data.length === 0 && <div className="card"><p style={{ color: '#6b7280' }}>Nenhum corretor encontrado.</p></div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {res && res.data.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                {['Nome', 'E-mail', 'Comissão', 'PIX', 'Apólices', 'Comissões', 'Status', 'Ações'].map(h =>
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {res.data.map(b => (
                <>
                  <tr key={b.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{b.name}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>{b.email}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#1d4ed8' }}>
                      {(Number(b.commissionRate) * 100).toFixed(1)}%
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{b.pixKey ?? '-'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'center' }}>{b._count.ownedInsurances}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'center' }}>{b._count.brokerCommissions}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: statusColor[b.status] ?? '#374151' }}>{b.status}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={() => { setEditing(editing === b.id ? null : b.id); setEditForm({ name: b.name, commissionRate: String(Number(b.commissionRate) * 100), pixKey: b.pixKey ?? '', status: b.status }); }}
                        style={{ padding: '4px 10px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>
                        Editar
                      </button>
                    </td>
                  </tr>
                  {editing === b.id && (
                    <tr key={`edit-${b.id}`} style={{ background: '#f9fafb' }}>
                      <td colSpan={8} style={{ padding: 16 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                          <div><label style={lbl}>Nome</label><input style={inp} value={editForm.name ?? ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
                          <div><label style={lbl}>Comissão (%)</label><input style={inp} type="number" step="0.1" min="0" max="100" value={editForm.commissionRate ?? ''} onChange={e => setEditForm(f => ({ ...f, commissionRate: e.target.value }))} /></div>
                          <div><label style={lbl}>Chave PIX</label><input style={inp} value={editForm.pixKey ?? ''} onChange={e => setEditForm(f => ({ ...f, pixKey: e.target.value }))} /></div>
                          <div><label style={lbl}>Status</label>
                            <select style={inp} value={editForm.status ?? 'ACTIVE'} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                              <option value="ACTIVE">ATIVO</option><option value="INACTIVE">INATIVO</option><option value="BLOCKED">BLOQUEADO</option>
                            </select>
                          </div>
                          <div><label style={lbl}>Nova Senha</label><input style={inp} type="password" placeholder="Deixe vazio para manter" value={editForm.password ?? ''} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} /></div>
                        </div>
                        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                          <button onClick={() => update(b.id)}
                            style={{ padding: '6px 16px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                            Salvar
                          </button>
                          <button onClick={() => setEditing(null)}
                            style={{ padding: '6px 14px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {res && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer' }}>Anterior</button>
          <span style={{ fontSize: 13 }}>Página {res.meta.page} de {res.meta.pages} ({res.meta.total} total)</span>
          <button disabled={page >= res.meta.pages} onClick={() => setPage(p => p + 1)}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer' }}>Próxima</button>
        </div>
      )}
    </div>
  );
}
