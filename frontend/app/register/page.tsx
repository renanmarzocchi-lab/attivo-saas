'use client';

import { useState, FormEvent } from 'react';
import { api } from '../../lib/api';

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '', document: '', email: '', phone: '', cityUf: '', pixKey: '', password: '', confirm: '',
  });
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (form.password !== form.confirm) { setError('As senhas não coincidem'); return; }
    if (form.password.length < 8)       { setError('Senha mínima de 8 caracteres'); return; }
    setLoading(true);
    try {
      await api.post('/affiliates/register', {
        name:     form.name,
        document: form.document,
        email:    form.email,
        phone:    form.phone   || undefined,
        cityUf:   form.cityUf  || undefined,
        pixKey:   form.pixKey  || undefined,
        password: form.password,
      });
      setSuccess('Cadastro realizado! Aguarde a aprovação do administrador.');
      setForm({ name: '', document: '', email: '', phone: '', cityUf: '', pixKey: '', password: '', confirm: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = { padding: 10, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, width: '100%' };

  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 520, margin: '48px auto' }}>
        <h1 style={{ marginBottom: 4 }}>ATTIVO</h1>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>Cadastro de Afiliado</p>

        {success ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 16, color: '#15803d' }}>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Cadastro enviado!</p>
            <p style={{ fontSize: 14 }}>{success}</p>
            <a href="/login" style={{ display: 'inline-block', marginTop: 12, color: '#1d4ed8', fontSize: 14 }}>Ir para o login</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Nome completo *</label>
                <input style={inp} value={form.name}     onChange={e => set('name', e.target.value)}     required placeholder="João Silva" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>CPF *</label>
                <input style={inp} value={form.document} onChange={e => set('document', e.target.value)} required placeholder="000.000.000-00" />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>E-mail *</label>
              <input style={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} required placeholder="seu@email.com" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Celular</label>
                <input style={inp} value={form.phone}  onChange={e => set('phone', e.target.value)}  placeholder="(00) 90000-0000" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Cidade/UF</label>
                <input style={inp} value={form.cityUf} onChange={e => set('cityUf', e.target.value)} placeholder="São Paulo/SP" />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Chave PIX</label>
              <input style={inp} value={form.pixKey} onChange={e => set('pixKey', e.target.value)} placeholder="CPF, e-mail ou celular" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Senha *</label>
                <input style={inp} type="password" value={form.password} onChange={e => set('password', e.target.value)} required placeholder="Mínimo 8 caracteres" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Confirmar senha *</label>
                <input style={inp} type="password" value={form.confirm}  onChange={e => set('confirm', e.target.value)}  required placeholder="Repita a senha" />
              </div>
            </div>

            {error && <p style={{ color: '#dc2626', fontSize: 13, background: '#fef2f2', padding: 10, borderRadius: 6 }}>{error}</p>}

            <button type="submit" disabled={loading}
              style={{ padding: 12, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>
              {loading ? 'Cadastrando...' : 'Criar conta'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
              Já tem conta? <a href="/login" style={{ color: '#1d4ed8' }}>Entrar</a>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
