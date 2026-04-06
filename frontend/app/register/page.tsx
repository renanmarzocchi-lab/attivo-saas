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

  const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, width: '100%', outline: 'none' };
  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 };
  const pwWrap: React.CSSProperties = { position: 'relative' };
  const eyeBtn: React.CSSProperties = { position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#6b7280', padding: 4 };

  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 520, margin: '48px auto', padding: '32px 28px' }}>
        <h1 style={{ marginBottom: 4, color: '#0f172a', fontSize: 28, fontWeight: 700 }}>ATTIVO</h1>
        <p style={{ color: '#64748b', marginBottom: 24, fontSize: 15 }}>Cadastro de Afiliado</p>

        {success ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 16, color: '#15803d' }}>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Cadastro enviado!</p>
            <p style={{ fontSize: 14 }}>{success}</p>
            <a href="/login" style={{ display: 'inline-block', marginTop: 12, color: '#1d4ed8', fontSize: 14, fontWeight: 500 }}>Ir para o login</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Nome completo *</label>
                <input style={inp} value={form.name}     onChange={e => set('name', e.target.value)}     required placeholder="João Silva" />
              </div>
              <div>
                <label style={lbl}>CPF *</label>
                <input style={inp} value={form.document} onChange={e => set('document', e.target.value)} required placeholder="000.000.000-00" />
              </div>
            </div>

            <div>
              <label style={lbl}>E-mail *</label>
              <input style={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} required placeholder="seu@email.com" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Celular *</label>
                <input style={inp} value={form.phone}  onChange={e => set('phone', e.target.value)} required placeholder="(00) 90000-0000" />
              </div>
              <div>
                <label style={lbl}>Cidade/UF</label>
                <input style={inp} value={form.cityUf} onChange={e => set('cityUf', e.target.value)} placeholder="São Paulo/SP" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Senha *</label>
                <div style={pwWrap}>
                  <input style={inp} type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} required placeholder="Mínimo 8 caracteres" />
                  <button type="button" onClick={() => setShowPw(v => !v)} style={eyeBtn}>{showPw ? 'Ocultar' : 'Mostrar'}</button>
                </div>
              </div>
              <div>
                <label style={lbl}>Confirmar senha *</label>
                <div style={pwWrap}>
                  <input style={inp} type={showPw ? 'text' : 'password'} value={form.confirm}  onChange={e => set('confirm', e.target.value)}  required placeholder="Repita a senha" />
                </div>
              </div>
            </div>

            {error && <p style={{ color: '#dc2626', fontSize: 13, background: '#fef2f2', padding: '10px 12px', borderRadius: 6, fontWeight: 500 }}>{error}</p>}

            <button type="submit" disabled={loading}
              style={{ padding: 12, background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 15, marginTop: 4 }}>
              {loading ? 'Cadastrando...' : 'Criar conta'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 4 }}>
              Já tem conta? <a href="/login" style={{ color: '#1d4ed8', fontWeight: 500 }}>Entrar</a>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
