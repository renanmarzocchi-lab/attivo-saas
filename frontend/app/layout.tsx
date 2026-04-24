import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'ATTIVO SaaS',
  description: 'Painel ATTIVO'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
