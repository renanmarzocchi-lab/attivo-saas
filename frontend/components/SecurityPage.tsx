'use client';

import { useState, FormEvent } from 'react';
import { api } from '../lib/api';
import { clearToken } from '../lib/api';

/* ── Força da senha ─────────────────────────────────────────── */
interface StrengthResult { score: number; label: string; color: string; checks: Check[] }
interface Check { label: string; ok: boolean }

function analyzePassword(pw: string): StrengthResult {
  const checks: Check[] = [
    { label: 'Mínimo 8 caracteres',         ok: pw.length >= 8 },
    { label: 'Letra maiúscula (A-Z)',        ok: /[A-Z]/.test(pw) },
    { label: 'Letra minúscula (a-z)',        ok: /[a-z]/.test(pw) },
    { label: 'Número (0-9)',                 ok: /[0-9]/.test(pw) },
    { label: 'Caractere especial (!@#$...)', ok: /[^A-Za-z0-9]/.test(pw) },
  ];
  const score = checks.filter(c => c.ok).length;
  const labels = ['', 'Muito fraca', 'Fraca', 'Razoável', 'Forte', 'Muito forte'];
  const colors = ['#e5e7eb', '#dc2626', '#f59e0b', '#eab308', '#16a34a', '#059669'];
  return { score, label: pw.length === 0 ? '' : labels[score], color: colors[score], checks };
}

/* ── Componente principal ───────────────────────────────────── */
export default function SecurityPage() {
  const [form, setForm]     = useState({ current: '', newPw: '', confirm: '' });
  const [show, setShow]     = useState({ current: false, newPw: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const strength = analyzePassword(form.newPw);

  function set(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }
  function toggleShow(field: keyof typeof show) {
    setShow(s => ({ ...s, [field]: !s[field] }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!form.current) { setError('Informe a senha atual'); return; }
    if (form.newPw.length < 8) { setError('A nova senha deve ter no mínimo 8 caracteres'); return; }
    if (strength.score < 3) { setError('Senha fraca demais — atenda pelo menos 3 requisitos'); return; }
    if (form.newPw !== form.confirm) { setError('As senhas não coincidem'); return; }

    setLoading(true);
    try {
      await api.patch('/auth/change-password', {
        currentPassword: form.current,
        newPassword:     form.newPw,
      });
      setSuccess('Senha alterada com sucesso! Você será desconectado para reautenticar.');
      setForm({ current: '', newPw: '', confirm: '' });
      setTimeout(() => {
        clearToken();
        window.location.href = '/login';
      }, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  }

  async function loadSessions() {
    setSessionsLoading(true);
    try {
      const res = await api.get<{ sessions: Session[] }>('/auth/sessions');
      setSessions(res.sessions);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }

  async function revokeSession(id: string) {
    await api.delete(`/auth/sessions/${id}`);
    setSessions(s => (s ?? []).filter(x => x.id !== id));
  }

  const inp: React.CSSProperties = {
    padding: '12px 14px', paddingRight: 80, borderRadius: 8,
    border: '1.5px solid #e5e7eb', fontSize: 14, width: '100%', outline: 'none',
    fontFamily: 'inherit',
  };
  const lbl: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: '#374151', display: 'block',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0B2442', margin: 0 }}>Segurança da Conta</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Gerencie sua senha e sessões ativas</p>
      </div>

      {/* ── TROCA DE SENHA ──────────────────────────────────── */}
      <div className="card" style={{ borderLeft: '4px solid #0B2442', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 22 }}>🔐</span>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0B2442' }}>Alterar senha</p>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Use uma senha forte com pelo menos 12 caracteres</p>
          </div>
        </div>

        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', color: '#15803d', fontSize: 14, fontWeight: 500, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>✓</span> {success}
          </div>
        )}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', fontSize: 14, fontWeight: 500, marginBottom: 20 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18, maxWidth: 480 }}>
          {/* Senha atual */}
          <div>
            <label style={lbl}>Senha atual</label>
            <div style={{ position: 'relative' }}>
              <input
                type={show.current ? 'text' : 'password'}
                value={form.current}
                onChange={e => set('current', e.target.value)}
                placeholder="Sua senha atual"
                style={inp}
                autoComplete="current-password"
                onFocus={e => (e.currentTarget.style.borderColor = '#0B2442')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
              />
              <button type="button" onClick={() => toggleShow('current')}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
                {show.current ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          {/* Nova senha */}
          <div>
            <label style={lbl}>Nova senha</label>
            <div style={{ position: 'relative' }}>
              <input
                type={show.newPw ? 'text' : 'password'}
                value={form.newPw}
                onChange={e => set('newPw', e.target.value)}
                placeholder="Mínimo 8 caracteres"
                style={inp}
                autoComplete="new-password"
                onFocus={e => (e.currentTarget.style.borderColor = '#0B2442')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
              />
              <button type="button" onClick={() => toggleShow('newPw')}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
                {show.newPw ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            {/* Barra de força */}
            {form.newPw.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 4, borderRadius: 2,
                      background: i <= strength.score ? strength.color : '#e5e7eb',
                      transition: 'background 0.2s',
                    }} />
                  ))}
                </div>
                <p style={{ fontSize: 12, fontWeight: 600, color: strength.color, margin: '0 0 8px' }}>
                  {strength.label}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px' }}>
                  {strength.checks.map((c, i) => (
                    <p key={i} style={{ fontSize: 11, color: c.ok ? '#16a34a' : '#9ca3af', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span>{c.ok ? '✓' : '○'}</span> {c.label}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirmar nova senha */}
          <div>
            <label style={lbl}>Confirmar nova senha</label>
            <div style={{ position: 'relative' }}>
              <input
                type={show.confirm ? 'text' : 'password'}
                value={form.confirm}
                onChange={e => set('confirm', e.target.value)}
                placeholder="Repita a nova senha"
                style={{
                  ...inp,
                  borderColor: form.confirm && form.confirm !== form.newPw ? '#dc2626' : undefined,
                }}
                autoComplete="new-password"
                onFocus={e => (e.currentTarget.style.borderColor = '#0B2442')}
                onBlur={e => (e.currentTarget.style.borderColor = form.confirm && form.confirm !== form.newPw ? '#dc2626' : '#e5e7eb')}
              />
              <button type="button" onClick={() => toggleShow('confirm')}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
                {show.confirm ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {form.confirm && form.confirm !== form.newPw && (
              <p style={{ fontSize: 12, color: '#dc2626', margin: '5px 0 0' }}>As senhas não coincidem</p>
            )}
          </div>

          <button type="submit" disabled={loading}
            style={{ padding: '13px 24px', background: loading ? '#4b6a8a' : '#0B2442', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, letterSpacing: '0.3px', width: 'fit-content' }}>
            {loading ? 'Salvando...' : '🔒 Salvar nova senha'}
          </button>
        </form>

        <div style={{ marginTop: 20, padding: '14px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: '#374151' }}>Importante:</strong> Ao alterar a senha, todas as sessões ativas serão encerradas por segurança.
            Você precisará fazer login novamente em todos os dispositivos.
          </p>
        </div>
      </div>

      {/* ── SESSÕES ATIVAS ───────────────────────────────────── */}
      <div className="card" style={{ borderLeft: '4px solid #D1B46A' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🖥️</span>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0B2442' }}>Sessões ativas</p>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Dispositivos conectados à sua conta</p>
            </div>
          </div>
          <button onClick={loadSessions} disabled={sessionsLoading}
            style={{ padding: '7px 16px', borderRadius: 6, border: '1.5px solid #e5e7eb', background: '#fff', color: '#0B2442', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {sessionsLoading ? 'Carregando...' : sessions === null ? 'Ver sessões' : '↻ Atualizar'}
          </button>
        </div>

        {sessions === null && !sessionsLoading && (
          <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>
            Clique em "Ver sessões" para listar os dispositivos conectados
          </p>
        )}

        {sessions !== null && sessions.length === 0 && (
          <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>
            Nenhuma outra sessão ativa
          </p>
        )}

        {sessions && sessions.length > 0 && (
          <div style={{ display: 'grid', gap: 10 }}>
            {sessions.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{getDeviceIcon(s.userAgent)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0B2442', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {parseUserAgent(s.userAgent)}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>
                    IP: {s.ipAddress} · Inicio: {new Date(s.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <button onClick={() => revokeSession(s.id)}
                  style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#fef2f2', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Encerrar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Tipos e helpers ────────────────────────────────────────── */
interface Session {
  id: string; userAgent: string | null; ipAddress: string | null;
  createdAt: string; expiresAt: string;
}

function parseUserAgent(ua: string | null): string {
  if (!ua) return 'Dispositivo desconhecido';
  if (ua === 'password-reset') return 'Reset de senha';
  if (/Mobile|Android|iPhone/i.test(ua)) {
    if (/iPhone/i.test(ua)) return 'iPhone / Safari';
    if (/Android/i.test(ua)) return 'Android / Chrome';
    return 'Dispositivo móvel';
  }
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return 'Google Chrome (Desktop)';
  if (/Firefox/i.test(ua)) return 'Mozilla Firefox (Desktop)';
  if (/Safari/i.test(ua)) return 'Safari (Desktop)';
  if (/Edg/i.test(ua)) return 'Microsoft Edge (Desktop)';
  return ua.slice(0, 60);
}

function getDeviceIcon(ua: string | null): string {
  if (!ua) return '🖥️';
  if (/iPhone/i.test(ua)) return '📱';
  if (/Android.*Mobile/i.test(ua)) return '📱';
  if (/Android/i.test(ua)) return '📟';
  return '💻';
}
