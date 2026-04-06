'use client';

import { useState, FormEvent } from 'react';
import { login } from '../../lib/auth';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'MASTER_ADMIN') {
        window.location.href = '/admin/dashboard';
      } else if (user.role === 'BROKER') {
        window.location.href = '/broker/insurance';
      } else {
        window.location.href = '/affiliate/dashboard';
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = { padding: '12px 14px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, width: '100%', outline: 'none' };
  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 };

  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 420, margin: '64px auto', padding: '32px 28px' }}>
        <h1 style={{ marginBottom: 4, color: '#0f172a', fontSize: 28, fontWeight: 700 }}>ATTIVO</h1>
        <p style={{ color: '#64748b', marginBottom: 24, fontSize: 15 }}>Programa de Afiliados</p>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={lbl}>E-mail</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inp}
            />
          </div>
          <div>
            <label style={lbl}>Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={inp}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#6b7280' }}>
                {showPw ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>
          {error && <p style={{ color: '#dc2626', fontSize: 13, background: '#fef2f2', padding: '10px 12px', borderRadius: 6, fontWeight: 500 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ padding: 12, background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 15, marginTop: 4 }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 4 }}>
            <a href="/forgot-password" style={{ color: '#1d4ed8', fontWeight: 500 }}>Esqueci minha senha</a>
          </p>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b' }}>
            Quer ser afiliado? <a href="/register" style={{ color: '#1d4ed8', fontWeight: 500 }}>Cadastre-se</a>
          </p>
        </form>
      </div>
    </main>
  );
}
