'use client';

import type { ReactNode } from 'react';
import { logout } from '../../lib/auth';

export default function AffiliateLayout({ children }: { children: ReactNode }) {
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
