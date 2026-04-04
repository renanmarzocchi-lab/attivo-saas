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

  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 420, margin: '64px auto' }}>
        <h1 style={{ marginBottom: 4 }}>ATTIVO</h1>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>Programa de Afiliados</p>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: 12, borderRadius: 6, border: '1px solid #d1d5db' }}
          />
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ padding: 12, borderRadius: 6, border: '1px solid #d1d5db', width: '100%' }}
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#6b7280' }}>
              {showPw ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {error && <p style={{ color: '#dc2626', fontSize: 14 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ padding: 12, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            <a href="/forgot-password" style={{ color: '#1d4ed8' }}>Esqueci minha senha</a>
          </p>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
            Quer ser afiliado? <a href="/register" style={{ color: '#1d4ed8' }}>Cadastre-se</a>
          </p>
        </form>
      </div>
    </main>
  );
}
