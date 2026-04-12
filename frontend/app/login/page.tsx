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
    <main style={{ minHeight: '100vh', display: 'flex', background: '#f8fafc' }}>

      {/* ── Painel esquerdo — marca ── */}
      <div className="login-brand-panel">
        {/* Decoração de fundo */}
        <div style={{ position: 'absolute', top: -120, right: -120, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(209,180,106,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -100, width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(209,180,106,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ position: 'relative' }}>
          <img src="/logo.png" alt="ATTIVO Corretora de Seguros" style={{ height: 50, objectFit: 'contain' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        </div>

        {/* Conteúdo central */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 32, position: 'relative' }}>
          <div>
            <p style={{ fontSize: 11, color: '#D1B46A', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 14, margin: '0 0 14px' }}>
              Portal do Afiliado
            </p>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', lineHeight: 1.3, margin: '0 0 10px', maxWidth: 300 }}>
              Acompanhe seus ganhos e indicações
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
              Dashboard completo com dados em tempo real
            </p>
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            {([
              { icon: '📊', title: 'Dashboard em tempo real', desc: 'Cliques, leads, conversões e comissões' },
              { icon: '💰', title: 'Comissões rastreadas', desc: 'Saiba exatamente o que gerou e o que foi pago' },
              { icon: '🔗', title: 'Seu link exclusivo', desc: 'Compartilhe e acompanhe cada indicação' },
            ] as const).map(item => (
              <div key={item.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9,
                  background: 'rgba(209,180,106,0.10)',
                  border: '1px solid rgba(209,180,106,0.16)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, flexShrink: 0,
                }}>
                  {item.icon}
                </div>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.90)', fontWeight: 600, fontSize: 13, margin: '0 0 3px' }}>{item.title}</p>
                  <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12, margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats discretos */}
          <div style={{ display: 'flex', gap: 24, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            {([
              { value: '100%', label: 'Transparente' },
              { value: 'PIX', label: 'Pagamento rápido' },
              { value: '24/7', label: 'Acesso online' },
            ] as const).map(s => (
              <div key={s.label}>
                <p style={{ color: '#D1B46A', fontWeight: 800, fontSize: 16, margin: '0 0 2px' }}>{s.value}</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0, fontWeight: 600 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé do painel */}
        <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, margin: 0, position: 'relative' }}>
          © 2026 ATTIVO Corretora de Seguros
        </p>
      </div>

      {/* ── Painel direito — formulário ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Logo visível apenas no mobile (painel esquerdo escondido) */}
          <div className="login-mobile-logo">
            <img src="/logo.png" alt="ATTIVO Corretora de Seguros" style={{ height: 44, objectFit: 'contain' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </div>

          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0B2442', margin: '0 0 8px' }}>
              Entrar na conta
            </h2>
            <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
              Use seu e-mail e senha cadastrados
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
            {/* E-mail */}
            <div>
              <label style={LBL}>E-mail</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={INP}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#0B2442'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(11,36,66,0.08)'; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Senha */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <label style={LBL}>Senha</label>
                <a href="/forgot-password" style={{ fontSize: 12, color: '#D1B46A', fontWeight: 600, textDecoration: 'none' }}>
                  Esqueci a senha
                </a>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ ...INP, paddingRight: 80 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#0B2442'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(11,36,66,0.08)'; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#6b7280', fontWeight: 600, padding: '4px 8px', borderRadius: 4 }}>
                  {showPw ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '11px 14px', color: '#dc2626', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>⚠</span>
                {error}
              </div>
            )}

            {/* Botão submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '14px 12px',
                background: loading
                  ? 'linear-gradient(135deg, #4b6a8a, #5a7fa0)'
                  : 'linear-gradient(135deg, #0B2442 0%, #0d2d52 100%)',
                color: '#D1B46A',
                border: 'none',
                borderRadius: 10,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: '0.3px',
                transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(11,36,66,0.20)',
              }}
            >
              {loading ? 'Verificando...' : 'Entrar no painel →'}
            </button>

            {/* Rodapé do form */}
            <div style={{ textAlign: 'center', paddingTop: 12, borderTop: '1px solid #f0f2f5' }}>
              <span style={{ color: '#9ca3af', fontSize: 13 }}>Ainda não é afiliado?{' '}</span>
              <a href="/register" style={{ color: '#D1B46A', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                Cadastre-se gratuitamente →
              </a>
            </div>
          </form>

          {/* Acesso Administrativo — visível e claro */}
          <div style={{
            marginTop: 24,
            padding: '14px 18px',
            background: 'linear-gradient(135deg, #060f1d 0%, #0B2442 100%)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🔐</span>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#D1B46A' }}>Área Administrativa</p>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Acesso master e corretor</p>
              </div>
            </div>
            <a href="/login/master" style={{
              padding: '8px 14px',
              background: '#D1B46A',
              color: '#0B2442',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 800,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}>
              Entrar →
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

const LBL: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: '#374151',
  display: 'block', marginBottom: 7, letterSpacing: '0.2px',
};
const INP: React.CSSProperties = {
  padding: '13px 16px', borderRadius: 10,
  border: '1.5px solid #e5e7eb', fontSize: 14,
  width: '100%', outline: 'none', background: '#fff',
  color: '#111827', transition: 'border-color 0.15s, box-shadow 0.15s',
};
