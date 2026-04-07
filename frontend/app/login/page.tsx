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
    <main style={{ minHeight: '100vh', background: '#0B2442', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '44px 40px', width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img src="/logo.png" alt="ATTIVO" style={{ height: 48, marginBottom: 12, objectFit: 'contain' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0B2442', letterSpacing: '-0.5px', lineHeight: 1 }}>
            ATTIVO<span style={{ color: '#D1B46A' }}>.</span>
          </div>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 6 }}>Corretora de Seguros</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              E-mail
            </label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ padding: '12px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14, width: '100%', outline: 'none', transition: 'border-color 0.15s' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#0B2442')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ padding: '12px 14px', paddingRight: 80, borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14, width: '100%', outline: 'none', transition: 'border-color 0.15s' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#0B2442')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
                {showPw ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, fontWeight: 500 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ padding: '14px 12px', background: loading ? '#4b6a8a' : '#0B2442', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15, marginTop: 4, letterSpacing: '0.3px', transition: 'background 0.15s' }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f3f4f6', paddingTop: 16, marginTop: 4 }}>
            <a href="/forgot-password" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>
              Esqueci minha senha
            </a>
            <a href="/register" style={{ color: '#D1B46A', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
              Seja afiliado →
            </a>
          </div>
        </form>
      </div>
    </main>
  );
}
