'use client';

import { useState, useEffect, FormEvent } from 'react';
import { api } from '../../lib/api';

interface DeviceInfo {
  userAgent: string;
  language: string;
  platform: string;
  screenRes: string;
  timezone: string;
  timestamp: string;
}

function collectDeviceInfo(): DeviceInfo {
  return {
    userAgent: navigator.userAgent ?? '',
    language: navigator.language ?? '',
    platform: navigator.platform ?? '',
    screenRes: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
    timestamp: new Date().toISOString(),
  };
}

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '', document: '', email: '', phone: '', cityUf: '', password: '', confirm: '',
  });
  const [accepted, setAccepted] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [device, setDevice]     = useState<DeviceInfo | null>(null);
  const [referredBy, setReferredBy] = useState<string>('');

  useEffect(() => {
    setDevice(collectDeviceInfo());
    // Captura ?ref= da URL ou do localStorage (setado pelo site institucional)
    const params = new URLSearchParams(window.location.search);
    const urlRef = (params.get('ref') || '').trim();
    const storedRef = (localStorage.getItem('attivo_affiliate_ref') || '').trim();
    const ref = urlRef || storedRef;
    if (ref) {
      setReferredBy(ref);
      localStorage.setItem('attivo_affiliate_ref', ref);
    }
  }, []);

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
    if (!accepted) { setError('Você precisa aceitar os Termos e Condições para continuar.'); return; }

    setLoading(true);
    try {
      await api.post('/affiliates/register', {
        name:     form.name.trim(),
        document: form.document.trim(),
        email:    form.email.trim(),
        phone:    form.phone.trim(),
        cityUf:   form.cityUf.trim() || undefined,
        password: form.password,
        referredByCode: referredBy || undefined,
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
      <div className="register-card" style={{ background: '#fff', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 580, boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo.png" alt="ATTIVO Corretora de Seguros" style={{ height: 56, objectFit: 'contain' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 10 }}>Cadastro de Afiliado</p>
        </div>

        {referredBy && !success && (
          <div style={{ background: '#fef9e7', border: '1.5px solid #D1B46A', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#0B2442', textAlign: 'center' }}>
            Você está se cadastrando por indicação do parceiro <strong>#{referredBy}</strong>
          </div>
        )}

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

            {/* === TERMOS === */}
            <div style={{ background: '#f8fafc', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showTerms ? 12 : 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0B2442', margin: 0 }}>Termos e Condições do Programa de Afiliados</p>
                <button type="button" onClick={() => setShowTerms(v => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#D1B46A', fontWeight: 600 }}>
                  {showTerms ? 'Ocultar' : 'Ler termos'}
                </button>
              </div>

              {showTerms && (
                <div style={{ maxHeight: 200, overflow: 'auto', background: '#fff', padding: 14, borderRadius: 8, fontSize: 12, lineHeight: 1.7, color: '#374151', border: '1px solid #e5e7eb', marginBottom: 12 }}>
                  <p><strong>1. OBJETO</strong> — O presente termo regula a participação no Programa de Afiliados da plataforma ATTIVO, que permite ao AFILIADO indicar potenciais clientes para a contratação de seguros, recebendo comissão por conversões efetivadas.</p>
                  <p><strong>2. CADASTRO</strong> — O candidato deverá fornecer dados pessoais verdadeiros. O cadastro ficará pendente de aprovação. A ATTIVO se reserva o direito de reprovar ou bloquear qualquer cadastro.</p>
                  <p><strong>3. COMISSÕES</strong> — Calculadas sobre o valor da conversão efetivada. Pagamento via PIX, na chave informada. Comissões somente devidas após aprovação pela administração.</p>
                  <p><strong>4. OBRIGAÇÕES</strong> — Manter dados atualizados. Não utilizar práticas enganosas ou spam. Não se apresentar como corretor sem habilitação legal.</p>
                  <p><strong>5. PRIVACIDADE</strong> — Dados tratados conforme LGPD. IP, dados do navegador e dispositivo são coletados no momento do aceite para fins de auditoria e segurança.</p>
                  <p><strong>6. DISPOSIÇÕES GERAIS</strong> — Termos podem ser alterados a qualquer momento. Descumprimento pode resultar em bloqueio imediato.</p>
                </div>
              )}

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)}
                  style={{ marginTop: 2, width: 18, height: 18, accentColor: '#0B2442', flexShrink: 0 }} />
                <span>
                  Declaro que li e aceito os <strong>Termos e Condições</strong> do Programa de Afiliados ATTIVO e a <strong>Política de Privacidade</strong>.
                  Autorizo a coleta de dados do dispositivo para fins de segurança e auditoria.
                </span>
              </label>

              {device && (
                <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 8, lineHeight: 1.5 }}>
                  Dados coletados: {device.platform} · {device.screenRes} · {device.timezone} · {device.timestamp.slice(0, 19).replace('T', ' ')}
                </p>
              )}
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, fontWeight: 500 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || !accepted}
              style={{ padding: '14px 12px', background: !accepted ? '#9ca3af' : loading ? '#4b6a8a' : '#0B2442', color: '#fff', border: 'none', borderRadius: 8, cursor: !accepted ? 'not-allowed' : loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15, letterSpacing: '0.3px' }}>
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
