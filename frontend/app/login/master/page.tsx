'use client';

import { useState, FormEvent } from 'react';
import { login } from '../../../lib/auth';

export default function MasterLoginPage() {
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
        setError('Acesso negado. Esta área é restrita a administradores. Use o portal do afiliado.');
        setLoading(false);
        return;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #060f1d 0%, #0B2442 60%, #0d2d52 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Marca topo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.png" alt="ATTIVO" style={{ height: 48, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.9 }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(209,180,106,0.25)',
          borderRadius: 16,
          padding: '36px 36px 32px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}>
          {/* Badge restrito */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, padding: '10px 14px', background: 'rgba(209,180,106,0.08)', border: '1px solid rgba(209,180,106,0.2)', borderRadius: 8 }}>
            <span style={{ fontSize: 18 }}>🔐</span>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#D1B46A', letterSpacing: '0.3px' }}>Área Administrativa</p>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Acesso restrito — autorizado somente</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                E-mail administrativo
              </label>
              <input
                type="email"
                placeholder="admin@attivocorretora.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  padding: '13px 14px', borderRadius: 8,
                  border: '1.5px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  fontSize: 14, width: '100%', outline: 'none',
                  color: '#fff', transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#D1B46A')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    padding: '13px 14px', paddingRight: 80, borderRadius: 8,
                    border: '1.5px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.06)',
                    fontSize: 14, width: '100%', outline: 'none',
                    color: '#fff', transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#D1B46A')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                  {showPw ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13, fontWeight: 500 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '14px 12px',
                background: loading ? 'rgba(209,180,106,0.5)' : '#D1B46A',
                color: '#0B2442', border: 'none', borderRadius: 8,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 800, fontSize: 15, marginTop: 4,
                letterSpacing: '0.3px', transition: 'all 0.15s',
              }}
            >
              {loading ? 'Autenticando...' : 'Entrar no painel'}
            </button>
          </form>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 24, paddingTop: 18, textAlign: 'center' }}>
            <a href="/forgot-password" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, textDecoration: 'none', fontWeight: 500 }}>
              Esqueci minha senha
            </a>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/login" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textDecoration: 'none', fontWeight: 500 }}>
            ← Voltar ao portal do afiliado
          </a>
        </div>
      </div>
    </main>
  );
}
