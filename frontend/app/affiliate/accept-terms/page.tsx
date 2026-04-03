'use client';

import { useState, FormEvent } from 'react';
import { api } from '../../../lib/api';

export default function AcceptTerms() {
  const [accepted, setAccepted] = useState(false);
  const [name, setName]         = useState('');
  const [cpf, setCpf]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

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

  const inp: React.CSSProperties = { padding: 10, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, width: '100%' };

  if (success) {
    return (
      <div>
        <h2 style={{ marginBottom: 16 }}>Termos de Uso</h2>
        <div className="card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Termos aceitos!</p>
          <p style={{ fontSize: 14 }}>{success}</p>
          <a href="/affiliate/dashboard" style={{ display: 'inline-block', marginTop: 12, color: '#1d4ed8', fontSize: 14 }}>
            Ir para o Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Termos de Uso e Política de Privacidade</h2>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ maxHeight: 300, overflow: 'auto', background: '#f9fafb', padding: 16, borderRadius: 8, fontSize: 13, lineHeight: 1.7, color: '#374151', border: '1px solid #e5e7eb' }}>
          <h3 style={{ marginBottom: 8 }}>TERMOS E CONDIÇÕES DO PROGRAMA DE AFILIADOS ATTIVO</h3>
          <p><strong>Versão 1.0</strong></p>
          <br />
          <p><strong>1. OBJETO</strong></p>
          <p>O presente termo regula a participação no Programa de Afiliados da plataforma ATTIVO, que permite ao AFILIADO indicar potenciais clientes para a contratação de seguros, recebendo comissão por conversões efetivadas.</p>
          <br />
          <p><strong>2. CADASTRO E ELEGIBILIDADE</strong></p>
          <p>2.1. O candidato deverá fornecer dados pessoais verdadeiros, incluindo nome completo, CPF, e-mail e telefone.</p>
          <p>2.2. O cadastro ficará pendente de aprovação pela administração da plataforma.</p>
          <p>2.3. A ATTIVO se reserva o direito de reprovar ou bloquear qualquer cadastro, a seu exclusivo critério.</p>
          <br />
          <p><strong>3. COMISSÕES</strong></p>
          <p>3.1. As comissões serão calculadas sobre o valor da conversão efetivada, conforme taxa vigente no momento da operação.</p>
          <p>3.2. O pagamento será realizado via PIX, na chave informada pelo afiliado no perfil.</p>
          <p>3.3. Comissões somente são devidas após confirmação e aprovação da conversão pela administração.</p>
          <br />
          <p><strong>4. OBRIGAÇÕES DO AFILIADO</strong></p>
          <p>4.1. Manter dados cadastrais atualizados.</p>
          <p>4.2. Não utilizar práticas enganosas, spam ou qualquer método que viole leis ou regulamentações vigentes.</p>
          <p>4.3. Não se apresentar como corretor de seguros, a menos que detenha habilitação legal para tal.</p>
          <br />
          <p><strong>5. PRIVACIDADE</strong></p>
          <p>5.1. Os dados pessoais do afiliado serão tratados conforme a Lei Geral de Proteção de Dados (LGPD).</p>
          <p>5.2. IP e dados do navegador são coletados no momento do aceite destes termos para fins de auditoria e segurança.</p>
          <br />
          <p><strong>6. DISPOSIÇÕES GERAIS</strong></p>
          <p>6.1. A ATTIVO poderá alterar estes termos a qualquer momento, sendo o afiliado notificado para novo aceite quando necessário.</p>
          <p>6.2. O descumprimento de qualquer cláusula poderá resultar em bloqueio imediato da conta do afiliado.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ display: 'grid', gap: 14 }}>
        <p style={{ fontSize: 13, color: '#6b7280' }}>
          Para confirmar a leitura e aceite dos termos, preencha seus dados abaixo:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Nome completo *</label>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} required placeholder="Seu nome completo" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>CPF *</label>
            <input style={inp} value={cpf} onChange={e => setCpf(e.target.value)} required placeholder="000.000.000-00" />
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 14, color: '#374151' }}>
          <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)}
            style={{ marginTop: 3, width: 18, height: 18, accentColor: '#1d4ed8' }} />
          <span>Li e aceito os Termos e Condições do Programa de Afiliados ATTIVO e a Política de Privacidade.</span>
        </label>

        {error && <p style={{ color: '#dc2626', fontSize: 13, background: '#fef2f2', padding: 10, borderRadius: 6 }}>{error}</p>}

        <button type="submit" disabled={loading || !accepted}
          style={{ padding: 12, background: accepted ? '#1d4ed8' : '#9ca3af', color: '#fff', border: 'none', borderRadius: 6, cursor: accepted ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: 15 }}>
          {loading ? 'Enviando...' : 'Aceitar e continuar'}
        </button>
      </form>
    </div>
  );
}
