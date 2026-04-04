'use client';

import { useState, FormEvent, useEffect } from 'react';
import { api } from '../../lib/api';

export default function ResetPasswordPage() {
  const [token, setToken]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') ?? '');
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!token) { setError('Link inválido. Solicite a recuperação novamente.'); return; }
    if (password !== confirm) { setError('As senhas não coincidem.'); return; }
    if (password.length < 8) { setError('Senha mínima de 8 caracteres.'); return; }
    setLoading(true);
    try {
      const r = await api.post<{ message: string }>('/auth/reset-password', { token, password });
      setSuccess(r.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = { padding: 12, borderRadius: 6, border: '1px solid #d1d5db', width: '100%' };

  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 420, margin: '64px auto' }}>
        <h1 style={{ marginBottom: 4 }}>ATTIVO</h1>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>Redefinir Senha</p>

        {success ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 16, color: '#15803d' }}>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Senha alterada!</p>
            <p style={{ fontSize: 14 }}>{success}</p>
            <a href="/login" style={{ display: 'inline-block', marginTop: 12, color: '#1d4ed8', fontSize: 14 }}>Ir para o login</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
            {!token && (
              <p style={{ color: '#dc2626', fontSize: 14, background: '#fef2f2', padding: 10, borderRadius: 6 }}>
                Link inválido. <a href="/forgot-password" style={{ color: '#1d4ed8' }}>Solicite novamente</a>.
              </p>
            )}
            <div>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Nova senha *</label>
              <div style={{ position: 'relative' }}>
                <input style={inp} type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Mínimo 8 caracteres" />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#6b7280' }}>
                  {showPw ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Confirmar nova senha *</label>
              <input style={inp} type={showPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Repita a nova senha" />
            </div>
            {error && <p style={{ color: '#dc2626', fontSize: 14, background: '#fef2f2', padding: 10, borderRadius: 6 }}>{error}</p>}
            <button type="submit" disabled={loading || !token}
              style={{ padding: 12, background: token ? '#1d4ed8' : '#9ca3af', color: '#fff', border: 'none', borderRadius: 6, cursor: token ? 'pointer' : 'not-allowed', fontWeight: 600 }}>
              {loading ? 'Redefinindo...' : 'Redefinir senha'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
              <a href="/login" style={{ color: '#1d4ed8' }}>Voltar para o login</a>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
