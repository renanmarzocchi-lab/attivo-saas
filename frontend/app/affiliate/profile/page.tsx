'use client';

import { useEffect, useState, FormEvent } from 'react';
import { api } from '../../../lib/api';

interface Profile {
  id: string; name: string; document: string; email: string;
  phone?: string; cityUf?: string; pixKey?: string;
  address?: string; addressNumber?: string; addressComplement?: string;
  neighborhood?: string; zipCode?: string;
  profileComplete: boolean; refCode: string; status: string;
}

export default function AffiliateProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({
    phone: '', cityUf: '', pixKey: '', address: '', addressNumber: '',
    addressComplement: '', neighborhood: '', zipCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [msg, setMsg]         = useState('');

  useEffect(() => {
    api.get<{ affiliate: Profile }>('/affiliate/profile')
      .then(({ affiliate }) => {
        setProfile(affiliate);
        setForm({
          phone:             affiliate.phone ?? '',
          cityUf:            affiliate.cityUf ?? '',
          pixKey:            affiliate.pixKey ?? '',
          address:           affiliate.address ?? '',
          addressNumber:     affiliate.addressNumber ?? '',
          addressComplement: affiliate.addressComplement ?? '',
          neighborhood:      affiliate.neighborhood ?? '',
          zipCode:           affiliate.zipCode ?? '',
        });
      })
      .catch((e) => setError(e.message));
  }, []);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(''); setError(''); setLoading(true);
    try {
      await api.patch('/affiliate/profile', form);
      setMsg('Perfil atualizado com sucesso!');
      const { affiliate } = await api.get<{ affiliate: Profile }>('/affiliate/profile');
      setProfile(affiliate);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar perfil');
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
  const readOnly: React.CSSProperties = { ...inp, background: '#f8fafc', color: '#6b7280', cursor: 'default' };

  if (!profile && !error) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Carregando perfil...</div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0B2442', margin: 0 }}>Meu Perfil</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Mantenha seus dados atualizados</p>
      </div>

      {msg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', color: '#15803d', fontSize: 14, fontWeight: 500, marginBottom: 16 }}>
          ✓ {msg}
        </div>
      )}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 16px', color: '#dc2626', fontSize: 14, fontWeight: 500, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {!profile?.profileComplete && (
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '14px 16px', borderRadius: 8, marginBottom: 20, color: '#92400e', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚠</span>
          <span>Complete seu perfil para utilizar todas as funcionalidades do sistema.</span>
        </div>
      )}

      {profile && (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>

          {/* Dados fixos */}
          <div className="card" style={{ borderLeft: '4px solid #e5e7eb' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0B2442', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dados cadastrais</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>Nome</label>
                <input style={readOnly} value={profile.name} readOnly />
              </div>
              <div>
                <label style={lbl}>CPF</label>
                <input style={readOnly} value={profile.document} readOnly />
              </div>
              <div>
                <label style={lbl}>E-mail</label>
                <input style={readOnly} value={profile.email} readOnly />
              </div>
              <div>
                <label style={lbl}>Código de referência</label>
                <input style={{ ...readOnly, fontFamily: 'monospace', fontWeight: 700, color: '#0B2442' }} value={profile.refCode} readOnly />
              </div>
            </div>
          </div>

          {/* Dados editáveis */}
          <div className="card" style={{ borderLeft: '4px solid #D1B46A' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0B2442', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dados editáveis</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={lbl}>Celular *</label>
                <input style={inp} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(00) 90000-0000"
                  onFocus={e => (e.currentTarget.style.borderColor = '#0B2442')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
              </div>
              <div>
                <label style={lbl}>Cidade / UF *</label>
                <input style={inp} value={form.cityUf} onChange={e => set('cityUf', e.target.value)} placeholder="São Paulo / SP"
                  onFocus={e => (e.currentTarget.style.borderColor = '#0B2442')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
              </div>
            </div>

            <div>
              <label style={lbl}>Chave PIX *</label>
              <input style={inp} value={form.pixKey} onChange={e => set('pixKey', e.target.value)} placeholder="CPF, e-mail, celular ou chave aleatória"
                onFocus={e => (e.currentTarget.style.borderColor = '#0B2442')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
            </div>
          </div>

          {/* Endereço */}
          <div className="card" style={{ borderLeft: '4px solid #D1B46A' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0B2442', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Endereço</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={lbl}>CEP *</label>
                <input style={inp} value={form.zipCode} onChange={e => set('zipCode', e.target.value)} placeholder="00000-000"
                  onFocus={e => (e.currentTarget.style.borderColor = '#0B2442')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
              </div>
              <div>
                <label style={lbl}>Número</label>
                <input style={inp} value={form.addressNumber} onChange={e => set('addressNumber', e.target.value)} placeholder="123"
                  onFocus={e => (e.currentTarget.style.borderColor = '#0B2442')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Endereço *</label>
              <input style={inp} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rua, Avenida..."
                onFocus={e => (e.currentTarget.style.borderColor = '#0B2442')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>Bairro</label>
                <input style={inp} value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} placeholder="Centro"
                  onFocus={e => (e.currentTarget.style.borderColor = '#0B2442')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
              </div>
              <div>
                <label style={lbl}>Complemento</label>
                <input style={inp} value={form.addressComplement} onChange={e => set('addressComplement', e.target.value)} placeholder="Apto, Bloco..."
                  onFocus={e => (e.currentTarget.style.borderColor = '#0B2442')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading}
            style={{ padding: '14px 12px', background: loading ? '#4b6a8a' : '#0B2442', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15, letterSpacing: '0.3px' }}>
            {loading ? 'Salvando...' : 'Salvar perfil'}
          </button>
        </form>
      )}
    </div>
  );
}
