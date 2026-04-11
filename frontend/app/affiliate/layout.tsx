'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { getMe, logout, AuthUser } from '../../lib/auth';

const ALLOWED_PENDING = ['/affiliate/profile', '/affiliate/accept-terms'];

export default function AffiliateLayout({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<AuthUser | null>(null);
  const [redirect, setRedirect]   = useState<string | null>(null);
  const [sidebarOpen, setSidebar] = useState(false);

  useEffect(() => {
    getMe()
      .then((u) => {
        setUser(u);
        if (u.role !== 'AFFILIATE') return;
        const path = window.location.pathname;
        if (ALLOWED_PENDING.some(p => path.startsWith(p))) return;
        if (u.documentAccepted === false)  setRedirect('/affiliate/accept-terms');
        else if (u.profileComplete === false) setRedirect('/affiliate/profile');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (redirect) window.location.href = redirect;
  }, [redirect]);

  const path       = typeof window !== 'undefined' ? window.location.pathname : '';
  const hasPending = user?.role === 'AFFILIATE' && (user.profileComplete === false || user.documentAccepted === false);

  const navItems = [
    { href: '/affiliate/dashboard',   label: 'Dashboard',   icon: '📊' },
    { href: '/affiliate/conversions', label: 'Conversões',  icon: '🎯' },
    { href: '/affiliate/statement',   label: 'Extrato',     icon: '📋' },
    { href: '/affiliate/payments',    label: 'Pagamentos',  icon: '💳' },
    { href: '/affiliate/profile',     label: 'Meu Perfil',  icon: '👤' },
    { href: '/affiliate/security',    label: 'Segurança',   icon: '🔒' },
  ];

  const sidebarContent = (
    <aside className={`admin-sidebar${sidebarOpen ? ' open' : ''}`}
      style={{ background: '#0B2442', padding: '24px 16px', alignSelf: 'flex-start', position: 'sticky', top: 28, boxShadow: '0 8px 32px rgba(11,36,66,0.2)' }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <img src="/logo.png" alt="ATTIVO" style={{ height: 40, objectFit: 'contain', marginBottom: 8 }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>
          Portal Afiliado
        </p>
      </div>

      {/* Usuário */}
      {user && (
        <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Afiliado</p>
        </div>
      )}

      {/* Alerta pendente */}
      {hasPending && (
        <div style={{ background: 'rgba(209,180,106,0.12)', border: '1px solid rgba(209,180,106,0.25)', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: '#D1B46A', fontWeight: 600, margin: '0 0 6px' }}>⚠ Ação necessária</p>
          {user?.documentAccepted === false && (
            <a href="/affiliate/accept-terms" onClick={() => setSidebar(false)}
              style={{ fontSize: 12, color: '#D1B46A', fontWeight: 700, textDecoration: 'none', display: 'block' }}>
              → Aceitar Termos
            </a>
          )}
          {user?.profileComplete === false && (
            <a href="/affiliate/profile" onClick={() => setSidebar(false)}
              style={{ fontSize: 12, color: '#D1B46A', fontWeight: 700, textDecoration: 'none', display: 'block', marginTop: 4 }}>
              → Completar Perfil
            </a>
          )}
        </div>
      )}

      {/* Nav */}
      <nav style={{ display: 'grid', gap: 2 }}>
        {navItems.map(({ href, label, icon }) => {
          const active = path === href || path.startsWith(href + '/');
          return (
            <a key={href} href={href} onClick={() => setSidebar(false)} style={{
              display: 'block', padding: '9px 12px',
              color: active ? '#D1B46A' : 'rgba(255,255,255,0.65)',
              textDecoration: 'none', fontWeight: active ? 700 : 500, fontSize: 14, borderRadius: 8,
              background: active ? 'rgba(209,180,106,0.12)' : 'transparent',
              borderLeft: active ? '3px solid #D1B46A' : '3px solid transparent',
              transition: 'all 0.15s',
            }}>
              {icon} {label}
            </a>
          );
        })}
      </nav>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '16px 4px 12px' }} />

      <button onClick={logout} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'rgba(255,100,100,0.7)', fontSize: 13, fontWeight: 500,
        padding: '8px 12px', textAlign: 'left', width: '100%', borderRadius: 8,
      }}>
        ← Sair da conta
      </button>
    </aside>
  );

  return (
    <main className="container">
      {/* Hamburger mobile */}
      <button className="sidebar-toggle" onClick={() => setSidebar(v => !v)} aria-label="Menu">
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Overlay */}
      <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebar(false)} />

      <div className="admin-shell">
        {sidebarContent}
        <section className="admin-content">{children}</section>
      </div>
    </main>
  );
}
