'use client';

import type { ReactNode } from 'react';
import { logout } from '../../lib/auth';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <main className="container">
      <div style={{ display: 'flex', gap: 20 }}>
        <aside className="card" style={{ minWidth: 220, alignSelf: 'flex-start' }}>
          <h3 style={{ marginBottom: 4 }}>ATTIVO Admin</h3>
          <hr style={{ marginBottom: 12, border: 'none', borderTop: '1px solid #e5e7eb' }} />
          <nav style={{ display: 'grid', gap: 8 }}>
            <a href="/admin/dashboard"   style={navStyle}>Dashboard</a>
            <a href="/admin/affiliates"  style={navStyle}>Afiliados</a>
            <a href="/admin/conversions" style={navStyle}>Conversões</a>
            <a href="/admin/commissions" style={navStyle}>Comissões</a>
            <a href="/admin/payments"    style={navStyle}>Pagamentos</a>
            <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
            <a href="/admin/commercial"    style={navStyle}>Comercial</a>
            <a href="/admin/ranking"       style={navStyle}>Ranking Corretores</a>
            <a href="/admin/goals"         style={navStyle}>Metas</a>
            <a href="/admin/intelligence"  style={navStyle}>⚡ Inteligência IA</a>
          </nav>
          <hr style={{ marginTop: 16, marginBottom: 12, border: 'none', borderTop: '1px solid #e5e7eb' }} />
          <button onClick={logout} style={{ ...navStyle, background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', textAlign: 'left', padding: '6px 0' }}>
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
