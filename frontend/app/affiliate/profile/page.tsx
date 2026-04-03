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
      // Recarregar para atualizar profileComplete
      const { affiliate } = await api.get<{ affiliate: Profile }>('/affiliate/profile');
      setProfile(affiliate);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = { padding: 10, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, width: '100%' };
  const lbl: React.CSSProperties = { fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 };
  const readOnly: React.CSSProperties = { ...inp, background: '#f9fafb', color: '#6b7280' };

  if (!profile && !error) return <p>Carregando...</p>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Meu Perfil</h2>

      {msg && <p style={{ background: '#f0fdf4', color: '#16a34a', padding: 10, borderRadius: 6, marginBottom: 12 }}>{msg}</p>}
      {error && <p style={{ background: '#fef2f2', color: '#dc2626', padding: 10, borderRadius: 6, marginBottom: 12 }}>{error}</p>}

      {!profile?.profileComplete && (
        <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', padding: 12, borderRadius: 8, marginBottom: 16, color: '#92400e', fontSize: 14 }}>
          Complete seu perfil para utilizar todas as funcionalidades do sistema.
        </div>
      )}

      {profile && (
        <form onSubmit={handleSubmit} className="card" style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Nome</label>
              <input style={readOnly} value={profile.name} readOnly />
            </div>
            <div>
              <label style={lbl}>CPF</label>
              <input style={readOnly} value={profile.document} readOnly />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>E-mail</label>
              <input style={readOnly} value={profile.email} readOnly />
            </div>
            <div>
              <label style={lbl}>Código de referência</label>
              <input style={readOnly} value={profile.refCode} readOnly />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '4px 0' }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Dados editáveis</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Celular *</label>
              <input style={inp} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(00) 90000-0000" />
            </div>
            <div>
              <label style={lbl}>Cidade/UF *</label>
              <input style={inp} value={form.cityUf} onChange={e => set('cityUf', e.target.value)} placeholder="São Paulo/SP" />
            </div>
          </div>

          <div>
            <label style={lbl}>Chave PIX *</label>
            <input style={inp} value={form.pixKey} onChange={e => set('pixKey', e.target.value)} placeholder="CPF, e-mail, celular ou chave aleatória" />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '4px 0' }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Endereço</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12 }}>
            <div>
              <label style={lbl}>CEP *</label>
              <input style={inp} value={form.zipCode} onChange={e => set('zipCode', e.target.value)} placeholder="00000-000" />
            </div>
            <div>
              <label style={lbl}>Número</label>
              <input style={inp} value={form.addressNumber} onChange={e => set('addressNumber', e.target.value)} placeholder="123" />
            </div>
          </div>

          <div>
            <label style={lbl}>Endereço *</label>
            <input style={inp} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rua, Avenida..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Bairro</label>
              <input style={inp} value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} placeholder="Centro" />
            </div>
            <div>
              <label style={lbl}>Complemento</label>
              <input style={inp} value={form.addressComplement} onChange={e => set('addressComplement', e.target.value)} placeholder="Apto, Bloco..." />
            </div>
          </div>

          <button type="submit" disabled={loading}
            style={{ padding: 12, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 15, marginTop: 4 }}>
            {loading ? 'Salvando...' : 'Salvar perfil'}
          </button>
        </form>
      )}
    </div>
  );
}
