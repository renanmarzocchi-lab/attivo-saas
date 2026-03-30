'use client';

import { useEffect, useState, FormEvent } from 'react';
import { api } from '../../../lib/api';
import { fmt } from '../../../lib/formatting';

interface GoalUser { id: string; name: string; email: string; }
interface Goal {
  id: string; competenceMonth: string; targetRevenue: number; targetPolicies: number;
  user: GoalUser;
  achieved: { policies: number; revenue: number; policiesPct: string; revenuePct: string };
}
interface Broker { id: string; name: string; email: string; }

const currentMonth = () => new Date().toISOString().slice(0, 7);
const inp: React.CSSProperties = { padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 };

function PctBar({ pct }: { pct: string }) {
  const v = Math.min(parseFloat(pct), 100);
  const color = v >= 100 ? '#16a34a' : v >= 70 ? '#d97706' : '#dc2626';
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 11, color }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${v}%`, background: color, borderRadius: 3, transition: 'width .4s' }} />
      </div>
    </div>
  );
}

export default function AdminGoals() {
  const [goals, setGoals]     = useState<Goal[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [month, setMonth]     = useState(currentMonth());
  const [form, setForm]       = useState({ userId: '', targetRevenue: '', targetPolicies: '' });
  const [error, setError]     = useState('');
  const [msg, setMsg]         = useState('');

  function loadGoals(m = month) {
    let active = true;
    api.get<{ data: Goal[] }>(`/admin/goals?competenceMonth=${m}`)
      .then((r) => { if (active) setGoals(r.data); })
      .catch((e) => { if (active) setError(e.message); });
  }

  useEffect(() => { loadGoals(month); }, [month]);

  useEffect(() => {
    api.get<{ data: Broker[] }>('/affiliates?limit=100')
      .catch(() => null);
    // Buscar corretores (BROKER + MASTER_ADMIN)
    api.get<{ data: { id: string; name: string; email: string }[] }>('/admin/ranking/brokers')
      .then((r) => setBrokers(r.data))
      .catch(() => null);
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await api.post('/admin/goals', {
        userId:          form.userId,
        competenceMonth: month,
        targetRevenue:   parseFloat(form.targetRevenue),
        targetPolicies:  parseInt(form.targetPolicies),
      });
      setMsg('Meta salva com sucesso!');
      setForm({ userId: '', targetRevenue: '', targetPolicies: '' });
      loadGoals(month);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar meta');
    }
  }

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Metas de Produção</h2>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <label style={{ fontSize: 14, fontWeight: 500 }}>Competência:</label>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={inp} />
      </div>

      {/* Formulário de meta */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h4 style={{ marginBottom: 12 }}>Definir / Atualizar Meta</h4>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Corretor *</label>
            <select style={inp} value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} required>
              <option value="">Selecione...</option>
              {brokers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Meta de Prêmio (R$) *</label>
            <input style={inp} type="number" step="0.01" min="0" placeholder="50000,00" value={form.targetRevenue} onChange={e => setForm(f => ({ ...f, targetRevenue: e.target.value }))} required />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Meta de Apólices *</label>
            <input style={inp} type="number" min="1" placeholder="10" value={form.targetPolicies} onChange={e => setForm(f => ({ ...f, targetPolicies: e.target.value }))} required />
          </div>
          <button type="submit" style={{ padding: '8px 20px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>Salvar</button>
        </form>
        {msg   && <p style={{ marginTop: 8, color: '#16a34a', fontSize: 13 }}>{msg}</p>}
        {error && <p style={{ marginTop: 8, color: '#dc2626', fontSize: 13 }}>{error}</p>}
      </div>

      {/* Lista de metas */}
      <div style={{ display: 'grid', gap: 12 }}>
        {goals.map(g => (
          <div key={g.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <p style={{ fontWeight: 700 }}>{g.user.name}</p>
                <p style={{ fontSize: 12, color: '#6b7280' }}>{g.competenceMonth}</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <p style={{ fontSize: 13, color: '#6b7280' }}>Prêmio</p>
                <p style={{ fontWeight: 700 }}>{fmt(g.achieved.revenue)} <span style={{ color: '#9ca3af', fontWeight: 400 }}>/ {fmt(Number(g.targetRevenue))}</span></p>
                <PctBar pct={g.achieved.revenuePct} />
              </div>
              <div>
                <p style={{ fontSize: 13, color: '#6b7280' }}>Apólices</p>
                <p style={{ fontWeight: 700 }}>{g.achieved.policies} <span style={{ color: '#9ca3af', fontWeight: 400 }}>/ {g.targetPolicies}</span></p>
                <PctBar pct={g.achieved.policiesPct} />
              </div>
            </div>
          </div>
        ))}
        {goals.length === 0 && <div className="card"><p style={{ color: '#9ca3af' }}>Nenhuma meta definida para este período.</p></div>}
      </div>
    </div>
  );
}
