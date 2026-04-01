'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

const PRIORITY_COLOR: Record<string, string> = {
  LOW: '#9ca3af', MEDIUM: '#6366f1', HIGH: '#dc2626',
};
const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta',
};
const TYPE_LABEL: Record<string, string> = {
  FOLLOWUP: 'Follow-up', RENEWAL: 'Renovação', MANUAL: 'Manual',
  CALL: 'Ligação', EMAIL: 'E-mail', MEETING: 'Reunião',
};

interface Task {
  id: string; title: string; type: string; priority: string;
  dueDate: string; completed: boolean; completedAt?: string; notes?: string;
  user?: { name: string };
  insurance?: { id: string; type: string; customerName: string };
  lead?: { id: string; name: string };
}

interface Summary { pending: number; overdue: number; byType: Record<string, number> }

export default function BrokerTasks() {
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [summary, setSummary]   = useState<Summary | null>(null);
  const [filter, setFilter]     = useState<'all' | 'overdue' | 'completed'>('all');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  function fetchTasks() {
    setLoading(true);
    const params = new URLSearchParams({ limit: '50' });
    if (filter === 'overdue')   { params.set('overdue', 'true'); }
    if (filter === 'completed') { params.set('completed', 'true'); }
    if (filter === 'all')       { params.set('completed', 'false'); }

    Promise.all([
      api.get<{ data: Task[] }>(`/tasks?${params}`),
      api.get<Summary>('/tasks/summary'),
    ]).then(([t, s]) => {
      setTasks(t.data);
      setSummary(s);
    }).catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchTasks(); }, [filter]);

  async function toggleComplete(task: Task) {
    try {
      await api.patch(`/tasks/${task.id}`, { completed: !task.completed });
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completed: !t.completed } : t));
      setSummary((s) => s ? {
        ...s,
        pending:  s.pending  + (task.completed ? 1 : -1),
        overdue:  s.overdue,
      } : s);
    } catch (err: any) {
      alert(err.message);
    }
  }

  const isOverdue = (t: Task) => !t.completed && new Date(t.dueDate) < new Date();

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Tarefas</h2>

      {/* Resumo */}
      {summary && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Pendentes', value: summary.pending, color: '#6366f1' },
            { label: 'Vencidas',  value: summary.overdue, color: '#dc2626' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 20px', textAlign: 'center', minWidth: 100 }}>
              <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: 26, fontWeight: 700, color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['all', 'overdue', 'completed'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid #d1d5db', background: filter === f ? '#1d4ed8' : '#fff', color: filter === f ? '#fff' : '#374151', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            {f === 'all' ? 'Pendentes' : f === 'overdue' ? 'Vencidas' : 'Concluídas'}
          </button>
        ))}
      </div>

      {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}

      {loading ? <p>Carregando...</p> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {tasks.map((task) => {
            const overdue = isOverdue(task);
            return (
              <div key={task.id} style={{
                background: '#fff', borderRadius: 10, padding: '14px 16px',
                border: `1px solid ${overdue ? '#fca5a5' : '#e5e7eb'}`,
                display: 'flex', alignItems: 'flex-start', gap: 14,
                opacity: task.completed ? 0.6 : 1,
              }}>
                {/* Checkbox */}
                <input type="checkbox" checked={task.completed}
                  onChange={() => toggleComplete(task)}
                  style={{ marginTop: 3, width: 18, height: 18, cursor: 'pointer' }} />

                {/* Conteúdo */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, textDecoration: task.completed ? 'line-through' : 'none' }}>
                      {task.title}
                    </span>
                    <span style={{ background: `${PRIORITY_COLOR[task.priority]}20`, color: PRIORITY_COLOR[task.priority], padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                      {PRIORITY_LABEL[task.priority]}
                    </span>
                    <span style={{ background: '#f3f4f6', color: '#374151', padding: '1px 8px', borderRadius: 10, fontSize: 11 }}>
                      {TYPE_LABEL[task.type] ?? task.type}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280' }}>
                    <span style={{ color: overdue ? '#dc2626' : '#6b7280', fontWeight: overdue ? 600 : 400 }}>
                      {overdue ? '⚠ Venceu: ' : 'Vence: '}
                      {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                    </span>
                    {task.user && <span>👤 {task.user.name}</span>}
                    {task.insurance && <span>🛡 {task.insurance.customerName}</span>}
                    {task.lead && <span>📋 Lead: {task.lead.name}</span>}
                  </div>

                  {task.notes && (
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{task.notes}</p>
                  )}
                </div>
              </div>
            );
          })}
          {tasks.length === 0 && (
            <div style={{ background: '#fff', borderRadius: 10, padding: 32, textAlign: 'center', border: '1px solid #e5e7eb' }}>
              <p style={{ color: '#9ca3af' }}>Nenhuma tarefa encontrada.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
