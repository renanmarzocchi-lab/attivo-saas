'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { getMe, logout, AuthUser } from '../../lib/auth';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<AuthUser | null>(null);
  const [sidebarOpen, setSidebar] = useState(false);

  useEffect(() => {
    getMe().then(setUser).catch(() => {});
  }, []);

  // Fechar sidebar ao navegar
  useEffect(() => {
    setSidebar(false);
  }, [typeof window !== 'undefined' ? window.location.pathname : '']);

  const path = typeof window !== 'undefined' ? window.location.pathname : '';

  function NavLink({ href, label }: { href: string; label: string }) {
    const active = path === href || path.startsWith(href + '/');
    return (
      <a href={href} onClick={() => setSidebar(false)} style={{
        display: 'block', padding: '9px 12px', color: active ? '#D1B46A' : 'rgba(255,255,255,0.65)',
        textDecoration: 'none', fontWeight: active ? 700 : 500, fontSize: 14, borderRadius: 8,
        background: active ? 'rgba(209,180,106,0.12)' : 'transparent',
        borderLeft: active ? '3px solid #D1B46A' : '3px solid transparent',
        transition: 'all 0.15s',
      }}>
        {label}
      </a>
    );
  }

  const sidebarContent = (
    <aside
      className={`admin-sidebar${sidebarOpen ? ' open' : ''}`}
      style={{
        background: '#0B2442',
        padding: '24px 16px',
        alignSelf: 'flex-start',
        position: 'sticky', top: 28,
        boxShadow: '0 8px 32px rgba(11,36,66,0.2)',
      }}
    >
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <img src="/logo.png" alt="ATTIVO" style={{ height: 40, objectFit: 'contain', marginBottom: 8 }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>
          Painel Master
        </p>
      </div>

      {/* Usuário */}
      {user && (
        <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Administrador</p>
        </div>
      )}

      <nav style={{ display: 'grid', gap: 2 }}>
        <NavLink href="/admin/dashboard"    label="📊 Dashboard" />
        <NavLink href="/admin/affiliates"   label="👥 Afiliados" />
        <NavLink href="/admin/conversions"  label="🎯 Conversões" />
        <NavLink href="/admin/commissions"  label="💰 Comissões" />
        <NavLink href="/admin/payments"     label="💳 Pagamentos" />

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '8px 4px' }} />

        <NavLink href="/admin/commercial"   label="📈 Comercial" />
        <NavLink href="/admin/ranking"      label="🏆 Ranking" />
        <NavLink href="/admin/goals"        label="🎯 Metas" />
        <NavLink href="/admin/intelligence" label="⚡ Inteligência IA" />

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '8px 4px' }} />

        <NavLink href="/admin/users"        label="👤 Usuários" />
        <NavLink href="/admin/integrations" label="⚙️ Integrações" />
        <NavLink href="/admin/security"     label="🔒 Segurança" />
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
      {/* Botão hamburguer — só aparece no mobile via CSS */}
      <button
        className="sidebar-toggle"
        onClick={() => setSidebar(v => !v)}
        aria-label="Menu"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Overlay escuro ao abrir sidebar no mobile */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebar(false)}
      />

      <div className="admin-shell">
        {sidebarContent}
        <section className="admin-content">{children}</section>
      </div>
    </main>
  );
}
