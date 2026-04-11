'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { getMe, logout, AuthUser } from '../../lib/auth';

const ALLOWED_PENDING = ['/affiliate/profile', '/affiliate/accept-terms'];

export default function AffiliateLayout({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<AuthUser | null>(null);
  const [redirect, setRedirect] = useState<string | null>(null);

  useEffect(() => {
    getMe()
      .then((u) => {
        setUser(u);
        if (u.role !== 'AFFILIATE') return;
        const path = window.location.pathname;
        if (ALLOWED_PENDING.some(p => path.startsWith(p))) return;

        if (u.documentAccepted === false) {
          setRedirect('/affiliate/accept-terms');
        } else if (u.profileComplete === false) {
          setRedirect('/affiliate/profile');
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (redirect) window.location.href = redirect;
  }, [redirect]);

  const hasPending = user?.role === 'AFFILIATE' && (user.profileComplete === false || user.documentAccepted === false);

  return (
    <main className="container">
      <div style={{ display: 'flex', gap: 20 }}>
        <aside style={SIDEBAR}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <img src="/logo.png" alt="ATTIVO Corretora de Seguros" style={{ height: 44, objectFit: 'contain', marginBottom: 10 }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600, margin: 0 }}>
              Afiliado
            </p>
          </div>

          <div style={DIVIDER} />

          <nav style={{ display: 'grid', gap: 2, marginTop: 12 }}>
            <a href="/affiliate/dashboard"   style={NAV}>📊 Dashboard</a>
            <a href="/affiliate/conversions" style={NAV}>🎯 Conversões</a>
            <a href="/affiliate/statement"   style={NAV}>📋 Extrato</a>
            <a href="/affiliate/payments"    style={NAV}>💳 Pagamentos</a>
            <a href="/affiliate/profile"     style={NAV}>👤 Meu Perfil</a>
            <a href="/affiliate/security"    style={NAV}>🔒 Segurança</a>
          </nav>

          {hasPending && (
            <>
              <div style={{ ...DIVIDER, margin: '10px 0' }} />
              {user?.documentAccepted === false && (
                <a href="/affiliate/accept-terms"
                  style={{ ...NAV, color: '#D1B46A', fontWeight: 700, fontSize: 13 }}>
                  ⚠ Aceitar Termos
                </a>
              )}
            </>
          )}

          <div style={{ ...DIVIDER, margin: '16px 0 12px' }} />

          <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,100,100,0.8)', fontSize: 13, fontWeight: 500, padding: '6px 0', textAlign: 'left', width: '100%' }}>
            Sair
          </button>
        </aside>
        <section style={{ flex: 1, minWidth: 0 }}>{children}</section>
      </div>
    </main>
  );
}

const SIDEBAR: React.CSSProperties = {
  minWidth: 220,
  background: '#0B2442',
  borderRadius: 12,
  padding: '24px 18px',
  alignSelf: 'flex-start',
  position: 'sticky',
  top: 28,
};

const NAV: React.CSSProperties = {
  display: 'block',
  padding: '9px 10px',
  color: 'rgba(255,255,255,0.72)',
  textDecoration: 'none',
  fontWeight: 500,
  fontSize: 14,
  borderRadius: 6,
};

const DIVIDER: React.CSSProperties = {
  height: 1,
  background: 'rgba(255,255,255,0.1)',
};
