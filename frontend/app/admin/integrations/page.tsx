'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

interface QueueCounts { waiting: number; active: number; completed: number; failed: number; delayed: number }
interface OpsData {
  infrastructure: { redis: string; sentry: string };
  notifications: { pending: number; failed: number };
  whatsapp: { pending: number; failed: number; sent: number };
  email: { pending: number; failed: number; sent: number };
  insurance: { expiring: number; expired: number };
  queues: Record<string, QueueCounts>;
  ts: string;
}

export default function AdminIntegrations() {
  const [data, setData] = useState<OpsData | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  function load() {
    setRefreshing(true);
    api.get<OpsData>('/admin/ops/summary')
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setRefreshing(false));
  }

  useEffect(() => { load(); }, []);

  if (!data && !error) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Carregando status...</div>;

  const infra = data?.infrastructure;
  const redisOk = infra?.redis === 'ok';
  const sentryOk = infra?.sentry === 'ok';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0B2442', margin: 0 }}>Integrações & Infraestrutura</h2>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Visão operacional dos serviços e filas</p>
        </div>
        <button onClick={load} disabled={refreshing}
          style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#0B2442', color: '#D1B46A', fontWeight: 700, fontSize: 13, cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.6 : 1 }}>
          {refreshing ? 'Atualizando...' : '↻ Atualizar'}
        </button>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 16px', color: '#dc2626', fontSize: 14, fontWeight: 500, marginBottom: 16 }}>{error}</div>}

      {data && (
        <>
          {/* Infrastructure */}
          <h3 style={SECTION_TITLE}>Infraestrutura</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 28 }}>
            <StatusCard name="Redis" status={redisOk ? 'ok' : 'indisponível'} ok={redisOk} detail="Cache e filas" />
            <StatusCard name="Sentry" status={sentryOk ? 'ativo' : 'desativado'} ok={sentryOk} detail="Monitoramento de erros" />
          </div>

          {/* Messaging */}
          <h3 style={SECTION_TITLE}>Mensageria</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 28 }}>
            <MessagingCard name="WhatsApp" sent={data.whatsapp.sent} pending={data.whatsapp.pending} failed={data.whatsapp.failed} />
            <MessagingCard name="E-mail" sent={data.email.sent} pending={data.email.pending} failed={data.email.failed} />
            <MessagingCard name="Notificações" sent={0} pending={data.notifications.pending} failed={data.notifications.failed} hidesSent />
          </div>

          {/* Insurance */}
          <h3 style={SECTION_TITLE}>Seguros</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 28 }}>
            <div className="card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>A Vencer</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#d97706', marginTop: 6 }}>{data.insurance.expiring}</div>
            </div>
            <div className="card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vencidos</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626', marginTop: 6 }}>{data.insurance.expired}</div>
            </div>
          </div>

          {/* Queues */}
          <h3 style={SECTION_TITLE}>Filas (BullMQ)</h3>
          {!redisOk ? (
            <div className="card" style={{ padding: '20px 24px', color: '#6b7280', fontSize: 14 }}>
              Redis indisponível — informações de fila não disponíveis.
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0B2442' }}>
                    {['Fila', 'Aguardando', 'Ativo', 'Concluído', 'Falhou', 'Atrasado'].map(h => (
                      <th key={h} style={TH}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.queues).map(([name, q], i) => (
                    <tr key={name} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                      <td style={{ ...TD, fontWeight: 600, color: '#111827' }}>{QUEUE_LABELS[name] ?? name}</td>
                      <td style={TD}><QBadge n={q.waiting} color="#d97706" /></td>
                      <td style={TD}><QBadge n={q.active} color="#2563eb" /></td>
                      <td style={TD}><QBadge n={q.completed} color="#16a34a" /></td>
                      <td style={TD}><QBadge n={q.failed} color="#dc2626" /></td>
                      <td style={TD}><QBadge n={q.delayed} color="#6b7280" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Timestamp */}
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 16, textAlign: 'right' }}>
            Última atualização: {new Date(data.ts).toLocaleString('pt-BR')}
          </p>
        </>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function StatusCard({ name, status, ok, detail }: { name: string; status: string; ok: boolean; detail: string }) {
  return (
    <div className="card" style={{ padding: '18px 20px', borderLeft: `4px solid ${ok ? '#16a34a' : '#dc2626'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: ok ? '#16a34a' : '#dc2626', flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0B2442' }}>{name}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{detail}</div>
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: ok ? '#16a34a' : '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {status}
      </div>
    </div>
  );
}

function MessagingCard({ name, sent, pending, failed, hidesSent }: { name: string; sent: number; pending: number; failed: number; hidesSent?: boolean }) {
  const hasIssue = failed > 0;
  return (
    <div className="card" style={{ padding: '18px 20px', borderLeft: `4px solid ${hasIssue ? '#d97706' : '#16a34a'}` }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#0B2442', marginBottom: 12 }}>{name}</div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {!hidesSent && <Stat label="Enviados" value={sent} color="#16a34a" />}
        <Stat label="Pendentes" value={pending} color="#d97706" />
        <Stat label="Falhas" value={failed} color="#dc2626" />
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function QBadge({ n, color }: { n: number; color: string }) {
  if (n === 0) return <span style={{ fontSize: 13, color: '#d1d5db' }}>0</span>;
  return <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: color, color: '#fff' }}>{n}</span>;
}

/* ── Constants ──────────────────────────────────────────────────────────── */

const QUEUE_LABELS: Record<string, string> = {
  notifications: 'Notificações',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  renewal: 'Renovações',
  document: 'Documentos',
};

const SECTION_TITLE: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#0B2442', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 };
const TH: React.CSSProperties = { padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' };
const TD: React.CSSProperties = { padding: '12px 14px', fontSize: 13 };
