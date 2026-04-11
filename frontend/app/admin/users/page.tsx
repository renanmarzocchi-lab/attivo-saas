'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { fmtDate, userStatusColor, userStatusLabel, userRoleLabel, userRoleColor } from '../../../lib/formatting';

interface User {
  id: string; name: string; email: string; role: string; status: string;
  createdAt: string; affiliateId?: string | null;
}
interface Res { data: User[]; meta: { total: number; page: number; pages: number } }

const emptyForm = { name: '', email: '', password: '', confirm: '', role: 'BROKER' };

export default function AdminUsers() {
  const [res, setRes]     = useState<Res | null>(null);
  const [page, setPage]   = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg]     = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  // Create
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  // Reset password
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPw, setNewPw] = useState('');

  function load(p = page, r = roleFilter) {
    const params = new URLSearchParams({ page: String(p), limit: '20' });
    if (r) params.set('role', r);
    api.get<Res>(`/admin/users?${params}`).then(setRes).catch(e => setError(e.message));
  }

  useEffect(() => { load(page, roleFilter); }, [page, roleFilter]);

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })); }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setMsg(''); setError('');
    if (form.password.length < 8) { setError('Senha mínima de 8 caracteres'); return; }
    if (form.password !== form.confirm) { setError('As senhas não coincidem'); return; }
    setCreating(true);
    try {
      await api.post('/admin/users', { name: form.name, email: form.email, password: form.password, role: form.role });
      setMsg('Usuário criado com sucesso');
      setForm(emptyForm); setShowCreate(false);
      load(1, roleFilter); setPage(1);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erro ao criar usuário'); }
    finally { setCreating(false); }
  }

  async function blockUser(id: string) {
    setMsg(''); setError(''); setLoading(`${id}-block`);
    try {
      const r = await api.patch<{ message: string }>(`/admin/users/${id}/block`);
      setMsg(r.message); load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erro'); }
    finally { setLoading(null); }
  }

  async function unblockUser(id: string) {
    setMsg(''); setError(''); setLoading(`${id}-unblock`);
    try {
      const r = await api.patch<{ message: string }>(`/admin/users/${id}/unblock`);
      setMsg(r.message); load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erro'); }
    finally { setLoading(null); }
  }

  async function handleResetPw() {
    if (!resetId || newPw.length < 8) { setError('Senha mínima de 8 caracteres'); return; }
    setMsg(''); setError(''); setLoading(`${resetId}-reset`);
    try {
      const r = await api.post<{ message: string }>(`/admin/users/${resetId}/reset-password`, { newPassword: newPw });
      setMsg(r.message); setResetId(null); setNewPw('');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erro'); }
    finally { setLoading(null); }
  }

  const filterLabels: Record<string, string> = { '': 'Todos', MASTER_ADMIN: 'Admin', BROKER: 'Corretor' };

  if (!res && !error) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Carregando usuários...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0B2442', margin: 0 }}>Usuários</h2>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Gerencie os usuários do painel gerencial</p>
        </div>
        <button onClick={() => setShowCreate(v => !v)}
          style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: showCreate ? '#6b7280' : '#0B2442', color: showCreate ? '#fff' : '#D1B46A', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          {showCreate ? 'Fechar' : '+ Novo Usuário'}
        </button>
      </div>

      {msg && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', color: '#15803d', fontSize: 14, fontWeight: 500, marginBottom: 16 }}>✓ {msg}</div>}
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 16px', color: '#dc2626', fontSize: 14, fontWeight: 500, marginBottom: 16 }}>{error}</div>}

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="card" style={{ marginBottom: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0B2442', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px' }}>Novo Usuário</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={LBL}>Nome *</label>
              <input style={INP} value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Nome completo" />
            </div>
            <div>
              <label style={LBL}>E-mail *</label>
              <input style={INP} type="email" value={form.email} onChange={e => set('email', e.target.value)} required placeholder="email@exemplo.com" />
            </div>
            <div>
              <label style={LBL}>Senha *</label>
              <input style={INP} type="password" value={form.password} onChange={e => set('password', e.target.value)} required placeholder="Mínimo 8 caracteres" />
            </div>
            <div>
              <label style={LBL}>Confirmar senha *</label>
              <input style={INP} type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} required placeholder="Repita a senha" />
            </div>
            <div>
              <label style={LBL}>Papel *</label>
              <select style={INP} value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="BROKER">Corretor</option>
                <option value="MASTER_ADMIN">Administrador</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button type="submit" disabled={creating}
              style={{ padding: '10px 24px', borderRadius: 6, border: 'none', background: creating ? '#4b6a8a' : '#0B2442', color: '#fff', fontWeight: 700, fontSize: 14, cursor: creating ? 'not-allowed' : 'pointer' }}>
              {creating ? 'Criando...' : 'Criar Usuário'}
            </button>
            <button type="button" onClick={() => { setShowCreate(false); setForm(emptyForm); }}
              style={{ padding: '10px 20px', borderRadius: 6, border: '1.5px solid #e5e7eb', background: '#fff', color: '#6b7280', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Reset password modal */}
      {resetId && (
        <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid #D1B46A' }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0B2442', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px' }}>Resetar Senha</h4>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={LBL}>Nova senha *</label>
              <input style={INP} type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Mínimo 8 caracteres"
                onKeyDown={e => { if (e.key === 'Enter') handleResetPw(); }} />
            </div>
            <button onClick={handleResetPw} disabled={loading === `${resetId}-reset`}
              style={{ padding: '10px 20px', borderRadius: 6, border: 'none', background: '#D1B46A', color: '#0B2442', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {loading === `${resetId}-reset` ? '...' : 'Confirmar'}
            </button>
            <button onClick={() => { setResetId(null); setNewPw(''); }}
              style={{ padding: '10px 16px', borderRadius: 6, border: '1.5px solid #e5e7eb', background: '#fff', color: '#6b7280', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['', 'MASTER_ADMIN', 'BROKER'].map((r) => (
          <button key={r} onClick={() => { setRoleFilter(r); setPage(1); }}
            style={{
              padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: roleFilter === r ? 'none' : '1.5px solid #e5e7eb',
              background: roleFilter === r ? '#0B2442' : '#fff',
              color: roleFilter === r ? '#D1B46A' : '#374151',
              transition: 'all 0.15s',
            }}>
            {filterLabels[r]}
          </button>
        ))}
      </div>

      {res && (
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0B2442' }}>
                {['Nome', 'E-mail', 'Papel', 'Status', 'Criado em', 'Ações'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {res.data.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Nenhum usuário encontrado.</td></tr>
              ) : res.data.map((u, i) => (
                <tr key={u.id} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                  <td style={{ ...TD, fontWeight: 500, color: '#111827' }}>{u.name}</td>
                  <td style={{ ...TD, color: '#6b7280' }}>{u.email}</td>
                  <td style={TD}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, color: '#fff', background: userRoleColor[u.role] ?? '#6b7280' }}>
                      {userRoleLabel[u.role] ?? u.role}
                    </span>
                  </td>
                  <td style={TD}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, color: '#fff', background: userStatusColor[u.status] ?? '#6b7280' }}>
                      {userStatusLabel[u.status] ?? u.status}
                    </span>
                  </td>
                  <td style={{ ...TD, fontSize: 12, color: '#9ca3af' }}>{fmtDate(u.createdAt)}</td>
                  <td style={TD}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {u.status === 'ACTIVE' && (
                        <ActionBtn label="Bloquear" color="#6b7280" loading={loading === `${u.id}-block`} disabled={!!loading} onClick={() => blockUser(u.id)} />
                      )}
                      {u.status === 'BLOCKED' && (
                        <ActionBtn label="Reativar" color="#2563eb" loading={loading === `${u.id}-unblock`} disabled={!!loading} onClick={() => unblockUser(u.id)} />
                      )}
                      <ActionBtn label="Resetar Senha" color="#D1B46A" textColor="#0B2442" loading={false} disabled={!!loading} onClick={() => { setResetId(u.id); setNewPw(''); }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {res && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            style={{ ...BTN_PAGE, background: page === 1 ? '#e5e7eb' : '#0B2442', color: page === 1 ? '#9ca3af' : '#D1B46A', cursor: page === 1 ? 'default' : 'pointer' }}>← Anterior</button>
          <span style={{ fontSize: 13, color: '#6b7280' }}>Página {res.meta.page} de {res.meta.pages} · {res.meta.total} usuários</span>
          <button disabled={page >= res.meta.pages} onClick={() => setPage(p => p + 1)}
            style={{ ...BTN_PAGE, background: page >= res.meta.pages ? '#e5e7eb' : '#0B2442', color: page >= res.meta.pages ? '#9ca3af' : '#D1B46A', cursor: page >= res.meta.pages ? 'default' : 'pointer' }}>Próxima →</button>
        </div>
      )}
    </div>
  );
}

function ActionBtn({ label, color, textColor, loading, disabled, onClick }: {
  label: string; color: string; textColor?: string; loading: boolean; disabled: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        padding: '5px 12px', borderRadius: 5, border: 'none',
        background: loading ? '#9ca3af' : color,
        color: textColor ?? '#fff', fontSize: 12, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled && !loading ? 0.6 : 1,
        transition: 'background 0.15s', whiteSpace: 'nowrap',
      }}>
      {loading ? '...' : label}
    </button>
  );
}

const TH: React.CSSProperties = { padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' };
const TD: React.CSSProperties = { padding: '12px 14px', fontSize: 13 };
const BTN_PAGE: React.CSSProperties = { padding: '7px 16px', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 13 };
const LBL: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' };
const INP: React.CSSProperties = { padding: '10px 12px', borderRadius: 6, border: '1.5px solid #e5e7eb', fontSize: 13, width: '100%', outline: 'none' };
