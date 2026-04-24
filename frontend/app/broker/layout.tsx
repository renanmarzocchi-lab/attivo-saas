'use client';

import type { ReactNode } from 'react';
import { logout } from '../../lib/auth';

export default function BrokerLayout({ children }: { children: ReactNode }) {
  return (
    <main className="container">
      <div style={{ display: 'flex', gap: 20 }}>
        <aside className="card" style={{ minWidth: 220, alignSelf: 'flex-start' }}>
          <h3 style={{ marginBottom: 4 }}>ATTIVO</h3>
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Area do Corretor</p>
          <hr style={{ marginBottom: 12, border: 'none', borderTop: '1px solid #e5e7eb' }} />
          <nav style={{ display: 'grid', gap: 8 }}>
            <a href="/broker/insurance"     style={navStyle}>Carteira</a>
            <a href="/broker/pipeline"      style={navStyle}>Pipeline</a>
            <a href="/broker/leads"         style={navStyle}>Leads</a>
            <a href="/broker/tasks"         style={navStyle}>Tarefas</a>
            <a href="/broker/commissions"   style={{ ...navStyle, color: '#16a34a', fontWeight: 600 }}>Minhas Comissoes</a>
            <a href="/broker/intelligence"  style={navStyle}>Inteligencia</a>
            <a href="/broker/insurance/new" style={{ ...navStyle, background: '#1d4ed8', color: '#fff', padding: '8px 12px', borderRadius: 6, textAlign: 'center', fontWeight: 600 }}>
              + Novo Seguro
            </a>
          </nav>
          <hr style={{ marginTop: 16, marginBottom: 12, border: 'none', borderTop: '1px solid #e5e7eb' }} />
          <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 14, fontWeight: 500, padding: '6px 0', textAlign: 'left' }}>
            Sair
          </button>
        </aside>
        <section style={{ flex: 1, minWidth: 0 }}>{children}</section>
      </div>
    </main>
  );
}

const navStyle: React.CSSProperties = {
  display: 'block', padding: '6px 0',
  color: '#374151', textDecoration: 'none', fontWeight: 500,
};
