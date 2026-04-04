'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { getMe, logout, AuthUser } from '../../lib/auth';

// Páginas que o afiliado pode acessar mesmo com pendências
const ALLOWED_PENDING = ['/affiliate/profile', '/affiliate/accept-terms'];

export default function AffiliateLayout({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<AuthUser | null>(null);
  const [redirect, setRedirect] = useState<string | null>(null);

  useEffect(() => {
    getMe()
      .then((u) => {
        setUser(u);
        // Verificar pendências — só para AFFILIATE
        if (u.role !== 'AFFILIATE') return;
        const path = window.location.pathname;
        if (ALLOWED_PENDING.some(p => path.startsWith(p))) return;

        if (u.documentAccepted === false) {
          setRedirect('/affiliate/accept-terms');
        } else if (u.profileComplete === false) {
          setRedirect('/affiliate/profile');
        }
      })
      .catch(() => { /* auth middleware vai redirecionar */ });
  }, []);

  useEffect(() => {
    if (redirect) window.location.href = redirect;
  }, [redirect]);

  const hasPending = user?.role === 'AFFILIATE' && (user.profileComplete === false || user.documentAccepted === false);

  return (
    <main className="container">
      <div style={{ display: 'flex', gap: 20 }}>
        <aside className="card" style={{ minWidth: 220, alignSelf: 'flex-start' }}>
          <h3 style={{ marginBottom: 4 }}>ATTIVO</h3>
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Área do Afiliado</p>
          <hr style={{ marginBottom: 12, border: 'none', borderTop: '1px solid #e5e7eb' }} />
          <nav style={{ display: 'grid', gap: 8 }}>
            <a href="/affiliate/dashboard"   style={navStyle}>Dashboard</a>
            <a href="/affiliate/conversions" style={navStyle}>Conversões</a>
            <a href="/affiliate/statement"   style={navStyle}>Extrato</a>
            <a href="/affiliate/payments"    style={navStyle}>Pagamentos</a>
            <a href="/affiliate/profile"     style={navStyle}>Meu Perfil</a>
          </nav>
          {hasPending && (
            <>
              <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
              {user?.documentAccepted === false && (
                <a href="/affiliate/accept-terms" style={{ ...navStyle, color: '#d97706', fontWeight: 600, fontSize: 13 }}>
                  Aceitar Termos
                </a>
              )}
            </>
          )}
          <hr style={{ marginTop: 16, marginBottom: 12, border: 'none', borderTop: '1px solid #e5e7eb' }} />
          <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 14, fontWeight: 500, padding: '6px 0', textAlign: 'left' }}>
            Sair
          </button>
        </aside>
        <section style={{ flex: 1 }}>{children}</section>
      </div>
    </main>
  );
}

const navStyle: React.CSSProperties = {
  display: 'block',
  padding: '6px 0',
  color: '#374151',
  textDecoration: 'none',
  fontWeight: 500,
};
