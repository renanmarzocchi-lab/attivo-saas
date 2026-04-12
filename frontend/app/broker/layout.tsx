'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { getMe, logout, AuthUser } from '../../lib/auth';

export default function BrokerLayout({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<AuthUser | null>(null);
  const [sidebarOpen, setSidebar] = useState(false);

  useEffect(() => {
    getMe().then(setUser).catch(() => {});
  }, []);

  const path = typeof window !== 'undefined' ? window.location.pathname : '';

  const navItems = [
    { href: '/broker/insurance',    label: 'Carteira',       icon: '📋' },
    { href: '/broker/pipeline',     label: 'Pipeline',       icon: '🔄' },
    { href: '/broker/leads',        label: 'Leads',          icon: '👥' },
    { href: '/broker/tasks',        label: 'Tarefas',        icon: '✅' },
    { href: '/broker/intelligence', label: 'Inteligência',   icon: '🎯' },
    { href: '/broker/security',     label: 'Segurança',      icon: '🔒' },
  ];

  const sidebarContent = (
    <aside className={`admin-sidebar${sidebarOpen ? ' open' : ''}`}
      style={{ background: '#0B2442', padding: '24px 16px', alignSelf: 'flex-start', position: 'sticky', top: 28, boxShadow: '0 8px 32px rgba(11,36,66,0.2)' }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <img src="/logo.png" alt="ATTIVO" style={{ height: 40, objectFit: 'contain', marginBottom: 8 }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>
          Painel Corretor
        </p>
      </div>

      {/* Usuário */}
      {user && (
        <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Corretor</p>
        </div>
      )}

      {/* Botão de ação rápida */}
      <a href="/broker/insurance/new" onClick={() => setSidebar(false)}
        style={{ display: 'block', textAlign: 'center', padding: '10px 12px', background: 'linear-gradient(135deg, #D1B46A 0%, #c9a84c 100%)', color: '#0B2442', borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: 'none', marginBottom: 16, boxShadow: '0 4px 12px rgba(209,180,106,0.25)' }}>
        + Novo Seguro
      </a>

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
      <button className="sidebar-toggle" onClick={() => setSidebar(v => !v)} aria-label="Menu">
        {sidebarOpen ? '✕' : '☰'}
      </button>
      <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebar(false)} />
      <div className="admin-shell">
        {sidebarContent}
        <section className="admin-content">{children}</section>
      </div>
    </main>
  );
}
