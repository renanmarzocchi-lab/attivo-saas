'use client';

import { useState, useEffect, FormEvent } from 'react';
import { api } from '../../../lib/api';

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

export default function AcceptTerms() {
  const [accepted, setAccepted] = useState(false);
  const [name, setName]         = useState('');
  const [cpf, setCpf]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [device, setDevice]     = useState<DeviceInfo | null>(null);

  useEffect(() => {
    setDevice(collectDeviceInfo());
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!accepted) { setError('Você precisa aceitar os termos para continuar.'); return; }
    if (!name.trim() || name.trim().length < 3) { setError('Informe seu nome completo.'); return; }
    if (!cpf.trim() || cpf.replace(/\D/g, '').length < 11) { setError('Informe um CPF válido.'); return; }

    setLoading(true);
    try {
      await api.post('/affiliates/accept-document', { name: name.trim(), cpf: cpf.trim() });
      setSuccess('Termos aceitos com sucesso! Você pode continuar utilizando o sistema.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao aceitar termos');
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

  if (success) {
    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0B2442', margin: 0 }}>Termos de Uso</h2>
        </div>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '24px 20px', color: '#15803d' }}>
          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>✓ Termos aceitos com sucesso!</p>
          <p style={{ fontSize: 14 }}>{success}</p>
          <a href="/affiliate/dashboard" style={{ display: 'inline-block', marginTop: 16, color: '#0B2442', fontSize: 14, fontWeight: 700, textDecoration: 'none', background: '#D1B46A', padding: '10px 24px', borderRadius: 8 }}>
            Ir para o Dashboard →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0B2442', margin: 0 }}>Termos de Uso e Política de Privacidade</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Leia os termos abaixo e confirme para prosseguir</p>
      </div>

      {/* Termos */}
      <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid #D1B46A' }}>
        <div style={{ maxHeight: 320, overflow: 'auto', background: '#f8fafc', padding: 18, borderRadius: 8, fontSize: 13, lineHeight: 1.8, color: '#374151', border: '1px solid #e5e7eb' }}>
          <h3 style={{ marginBottom: 12, color: '#0B2442', fontSize: 15 }}>TERMOS E CONDIÇÕES DO PROGRAMA DE AFILIADOS ATTIVO</h3>
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}><strong>Versão 1.0</strong> — Vigência a partir da data do aceite</p>

          <p><strong>1. OBJETO</strong></p>
          <p>O presente termo regula a participação no Programa de Afiliados da plataforma ATTIVO, que permite ao AFILIADO indicar potenciais clientes para a contratação de seguros, recebendo comissão por conversões efetivadas.</p>

          <p style={{ marginTop: 12 }}><strong>2. CADASTRO E ELEGIBILIDADE</strong></p>
          <p>2.1. O candidato deverá fornecer dados pessoais verdadeiros, incluindo nome completo, CPF, e-mail e telefone.</p>
          <p>2.2. O cadastro ficará pendente de aprovação pela administração da plataforma.</p>
          <p>2.3. A ATTIVO se reserva o direito de reprovar ou bloquear qualquer cadastro, a seu exclusivo critério.</p>

          <p style={{ marginTop: 12 }}><strong>3. COMISSÕES</strong></p>
          <p>3.1. As comissões serão calculadas sobre o valor da conversão efetivada, conforme taxa vigente no momento da operação.</p>
          <p>3.2. O pagamento será realizado via PIX, na chave informada pelo afiliado no perfil.</p>
          <p>3.3. Comissões somente são devidas após confirmação e aprovação da conversão pela administração.</p>

          <p style={{ marginTop: 12 }}><strong>4. OBRIGAÇÕES DO AFILIADO</strong></p>
          <p>4.1. Manter dados cadastrais atualizados.</p>
          <p>4.2. Não utilizar práticas enganosas, spam ou qualquer método que viole leis ou regulamentações vigentes.</p>
          <p>4.3. Não se apresentar como corretor de seguros, a menos que detenha habilitação legal para tal.</p>

          <p style={{ marginTop: 12 }}><strong>5. PRIVACIDADE E COLETA DE DADOS</strong></p>
          <p>5.1. Os dados pessoais do afiliado serão tratados conforme a Lei Geral de Proteção de Dados (LGPD).</p>
          <p>5.2. No momento do aceite destes termos, os seguintes dados são coletados automaticamente para fins de auditoria, segurança e comprovação jurídica: endereço IP, navegador utilizado (User-Agent), plataforma/sistema operacional, resolução de tela, idioma do navegador, fuso horário e data/hora exata do aceite.</p>
          <p>5.3. Estes dados serão armazenados junto ao registro do aceite e poderão ser utilizados como prova em eventual disputa judicial ou administrativa.</p>

          <p style={{ marginTop: 12 }}><strong>6. DISPOSIÇÕES GERAIS</strong></p>
          <p>6.1. A ATTIVO poderá alterar estes termos a qualquer momento, sendo o afiliado notificado para novo aceite quando necessário.</p>
          <p>6.2. O descumprimento de qualquer cláusula poderá resultar em bloqueio imediato da conta do afiliado.</p>
          <p>6.3. Ao clicar em &quot;Aceitar e continuar&quot;, o afiliado declara ciência e concordância integral com todos os termos acima.</p>
        </div>
      </div>

      {/* Dados do dispositivo coletados */}
      {device && (
        <div className="card" style={{ marginBottom: 20, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#0B2442', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Dados coletados do seu dispositivo
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12, color: '#6b7280' }}>
            <p><strong>Plataforma:</strong> {device.platform}</p>
            <p><strong>Resolução:</strong> {device.screenRes}</p>
            <p><strong>Idioma:</strong> {device.language}</p>
            <p><strong>Fuso horário:</strong> {device.timezone}</p>
            <p style={{ gridColumn: 'span 2' }}><strong>Navegador:</strong> {device.userAgent.slice(0, 100)}...</p>
            <p><strong>Data/hora:</strong> {device.timestamp.slice(0, 19).replace('T', ' ')}</p>
          </div>
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
            Estes dados são coletados conforme cláusula 5.2 dos Termos para fins de auditoria e segurança jurídica.
          </p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="card" style={{ display: 'grid', gap: 16 }}>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
          Para confirmar a leitura e aceite dos termos, preencha seus dados abaixo:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={lbl}>Nome completo *</label>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} required placeholder="Seu nome completo"
              onFocus={e => (e.currentTarget.style.borderColor = '#0B2442')}
              onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
          </div>
          <div>
            <label style={lbl}>CPF *</label>
            <input style={inp} value={cpf} onChange={e => setCpf(e.target.value)} required placeholder="000.000.000-00"
              onFocus={e => (e.currentTarget.style.borderColor = '#0B2442')}
              onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 14, color: '#374151', background: '#f8fafc', padding: 14, borderRadius: 8, border: '1.5px solid #e5e7eb' }}>
          <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)}
            style={{ marginTop: 3, width: 20, height: 20, accentColor: '#0B2442', flexShrink: 0 }} />
          <span>
            Declaro que li e aceito integralmente os <strong>Termos e Condições</strong> do Programa de Afiliados ATTIVO e a <strong>Política de Privacidade</strong>.
            Autorizo a coleta dos dados do meu dispositivo exibidos acima para fins de segurança e comprovação jurídica.
          </span>
        </label>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, fontWeight: 500 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading || !accepted}
          style={{ padding: '14px 12px', background: !accepted ? '#9ca3af' : loading ? '#4b6a8a' : '#0B2442', color: '#fff', border: 'none', borderRadius: 8, cursor: !accepted ? 'not-allowed' : loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15, letterSpacing: '0.3px' }}>
          {loading ? 'Processando...' : 'Aceitar e continuar'}
        </button>
      </form>
    </div>
  );
}
