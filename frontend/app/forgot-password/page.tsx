'use client';

import { useState, FormEvent } from 'react';
import { api } from '../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [sent, setSent]       = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar solicitação');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 420, margin: '64px auto' }}>
        <h1 style={{ marginBottom: 4 }}>ATTIVO</h1>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>Recuperação de Senha</p>

        {sent ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 16, color: '#15803d' }}>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>E-mail enviado!</p>
            <p style={{ fontSize: 14 }}>Se o e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha.</p>
            <a href="/login" style={{ display: 'inline-block', marginTop: 12, color: '#1d4ed8', fontSize: 14 }}>Voltar para o login</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
            <p style={{ fontSize: 14, color: '#6b7280' }}>
              Informe seu e-mail cadastrado e enviaremos um link para redefinir sua senha.
            </p>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ padding: 12, borderRadius: 6, border: '1px solid #d1d5db' }}
            />
            {error && <p style={{ color: '#dc2626', fontSize: 14 }}>{error}</p>}
            <button type="submit" disabled={loading}
              style={{ padding: 12, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: 4 }}>
              <a href="/login" style={{ color: '#1d4ed8' }}>Voltar para o login</a>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
