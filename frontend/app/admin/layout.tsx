'use client';

import type { ReactNode } from 'react';
import { logout } from '../../lib/auth';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <main className="container">
      <div style={{ display: 'flex', gap: 20 }}>
        <aside style={SIDEBAR}>
          <div style={{ marginBottom: 20 }}>
            <img src="/logo.png" alt="ATTIVO" style={{ height: 36, marginBottom: 10, objectFit: 'contain' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            <div style={{ fontSize: 20, fontWeight: 800, color: '#D1B46A', letterSpacing: '-0.3px', lineHeight: 1 }}>
              ATTIVO<span style={{ color: 'rgba(255,255,255,0.4)' }}>.</span>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 3, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Admin
            </p>
          </div>

          <div style={DIVIDER} />

          <nav style={{ display: 'grid', gap: 2 }}>
            <a href="/admin/dashboard"    style={NAV}>Dashboard</a>
            <a href="/admin/affiliates"   style={NAV}>Afiliados</a>
            <a href="/admin/conversions"  style={NAV}>Conversões</a>
            <a href="/admin/commissions"  style={NAV}>Comissões</a>
            <a href="/admin/payments"     style={NAV}>Pagamentos</a>
            <div style={{ ...DIVIDER, margin: '8px 0' }} />
            <a href="/admin/commercial"   style={NAV}>Comercial</a>
            <a href="/admin/ranking"      style={NAV}>Ranking Corretores</a>
            <a href="/admin/goals"        style={NAV}>Metas</a>
            <a href="/admin/intelligence" style={NAV}>⚡ Inteligência IA</a>
          </nav>

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
