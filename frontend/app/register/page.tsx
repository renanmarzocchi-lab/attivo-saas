'use client';

import { useState, FormEvent } from 'react';
import { api } from '../../lib/api';

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '', document: '', email: '', phone: '', cityUf: '', password: '', confirm: '',
  });
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!form.name.trim())       { setError('Informe seu nome completo'); return; }
    if (!form.document.trim())   { setError('Informe seu CPF'); return; }
    if (!form.email.trim())      { setError('Informe seu e-mail'); return; }
    if (!form.phone.trim())      { setError('Informe seu celular'); return; }
    if (form.password.length < 8){ setError('Senha mínima de 8 caracteres'); return; }
    if (form.password !== form.confirm) { setError('As senhas não coincidem'); return; }

    setLoading(true);
    try {
      await api.post('/affiliates/register', {
        name:     form.name.trim(),
        document: form.document.trim(),
        email:    form.email.trim(),
        phone:    form.phone.trim(),
        cityUf:   form.cityUf.trim() || undefined,
        password: form.password,
      });
      setSuccess('Cadastro realizado! Aguarde a aprovação do administrador.');
      setForm({ name: '', document: '', email: '', phone: '', cityUf: '', password: '', confirm: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = {
    padding: '12px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb',
    fontSize: 14, width: '100%', outline: 'none',
  };
  const lbl: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: '#374151', display: 'block',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px',
  };

  return (
    <main style={{ minHeight: '100vh', background: '#0B2442', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 540, boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.png" alt="ATTIVO" style={{ height: 44, marginBottom: 12, objectFit: 'contain' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0B2442', letterSpacing: '-0.5px' }}>
            ATTIVO<span style={{ color: '#D1B46A' }}>.</span>
          </div>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Cadastro de Afiliado</p>
        </div>

        {success ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '20px 18px', color: '#15803d', textAlign: 'center' }}>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Cadastro enviado!</p>
            <p style={{ fontSize: 14 }}>{success}</p>
            <a href="/login" style={{ display: 'inline-block', marginTop: 16, color: '#0B2442', fontSize: 14, fontWeight: 600, textDecoration: 'none', background: '#D1B46A', padding: '8px 20px', borderRadius: 6 }}>
              Ir para o login →
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>Nome completo *</label>
                <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} required placeholder="João Silva"
                  onFocus={e => (e.currentTarget.style.borderColor = '#0B2442')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
              </div>
              <div>
                <label style={lbl}>CPF *</label>
                <input style={inp} value={form.document} onChange={e => set('document', e.target.value)} required placeholder="000.000.000-00"
                  onFocus={e => (e.currentTarget.style.borderColor = '#0B2442')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
              </div>
            </div>

            <div>
              <label style={lbl}>E-mail *</label>
              <input style={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} required placeholder="seu@email.com"
                onFocus={e => (e.currentTarget.style.borderColor = '#0B2442')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>Celular *</label>
                <input style={inp} value={form.phone} onChange={e => set('phone', e.target.value)} required placeholder="(00) 90000-0000"
                  onFocus={e => (e.currentTarget.style.borderColor = '#0B2442')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
              </div>
              <div>
                <label style={lbl}>Cidade / UF</label>
                <input style={inp} value={form.cityUf} onChange={e => set('cityUf', e.target.value)} placeholder="São Paulo / SP"
                  onFocus={e => (e.currentTarget.style.borderColor = '#0B2442')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>Senha *</label>
                <div style={{ position: 'relative' }}>
                  <input style={{ ...inp, paddingRight: 76 }} type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} required placeholder="Mínimo 8 caracteres"
                    onFocus={e => (e.currentTarget.style.borderColor = '#0B2442')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
                    {showPw ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>
              <div>
                <label style={lbl}>Confirmar senha *</label>
                <input style={inp} type={showPw ? 'text' : 'password'} value={form.confirm} onChange={e => set('confirm', e.target.value)} required placeholder="Repita a senha"
                  onFocus={e => (e.currentTarget.style.borderColor = '#0B2442')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
              </div>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, fontWeight: 500 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ padding: '14px 12px', background: loading ? '#4b6a8a' : '#0B2442', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15, marginTop: 4, letterSpacing: '0.3px' }}>
              {loading ? 'Cadastrando...' : 'Criar conta'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: 4 }}>
              Já tem conta?{' '}
              <a href="/login" style={{ color: '#D1B46A', fontWeight: 600, textDecoration: 'none' }}>Entrar</a>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
