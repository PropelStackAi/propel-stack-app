/**
 * AI Agent Task Execution — Enhancement 27
 * Propel Stack AI, LLC
 *
 * Elite-only: delegate real-world tasks to AI.
 * Pre-action confirmation is MANDATORY — never bypass.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface AgentTask {
  id: string;
  task_type: string;
  task_description: string;
  status: string;
  preview_shown_at: string | null;
  approved_at: string | null;
  executed_at: string | null;
  result_summary: string | null;
  confirmation_id: string | null;
  cost_amount: number | null;
  can_undo: boolean;
  undo_deadline: string | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending_approval: 'bg-yellow-100 text-yellow-800',
  approved:         'bg-brand-indigo/10 text-brand-indigo',
  executing:        'bg-brand-teal/10 text-brand-teal',
  complete:         'bg-green-100 text-green-800',
  failed:           'bg-red-100 text-red-600',
  cancelled:        'bg-surface-sunk text-surface-muted',
};

const TASK_TYPES = [
  { id: 'payment',       label: '💳 Bill Payment',   desc: 'Pay a bill on your behalf' },
  { id: 'booking',       label: '🏨 Booking',        desc: 'Book hotel, flight, restaurant' },
  { id: 'form_fill',     label: '📝 Form Fill',      desc: 'Auto-fill a web form' },
  { id: 'communication', label: '✉️ Communication',  desc: 'Draft and send an email' },
  { id: 'renewal',       label: '🔄 Renewal',        desc: 'Renew a registration or subscription' },
  { id: 'general',       label: '⚡ General',         desc: 'Any other task' },
];

export function AgentTasks() {
  const qc = useQueryClient();
  const [taskDesc, setTaskDesc] = useState('');
  const [taskType, setTaskType] = useState('general');
  const [pendingTask, setPendingTask] = useState<AgentTask | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['agent-tasks'],
    queryFn: () => apiRequest<AgentTask[]>('/api/agent-tasks'),
  });

  const createMutation = useMutation({
    mutationFn: (data: { task_description: string; task_type: string }) =>
      apiRequest<AgentTask>('/api/agent-tasks', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: (task) => {
      setPendingTask(task);
      setTaskDesc('');
      qc.invalidateQueries({ queryKey: ['agent-tasks'] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/agent-tasks/${id}/approve`, { method: 'POST' }),
    onSuccess: () => { setPendingTask(null); qc.invalidateQueries({ queryKey: ['agent-tasks'] }); },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/agent-tasks/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => { setPendingTask(null); qc.invalidateQueries({ queryKey: ['agent-tasks'] }); },
  });

  const undoMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/agent-tasks/${id}/undo`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agent-tasks'] }),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-surface-ink">AI Agent</h1>
        <p className="text-sm text-surface-muted mt-1">
          Delegate real-world tasks. AI always previews actions and requires your approval before executing.
        </p>
      </div>

      {/* Safety banner */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex gap-2">
        <span className="shrink-0">⚠️</span>
        <span>
          <strong>Elite feature.</strong> Every action requires your explicit approval before execution.
          Financial transactions above your spending limit ($0 by default) are never executed automatically.
        </span>
      </div>

      {/* Task input */}
      <section className="card">
        <h2 className="text-lg font-semibold text-surface-ink mb-4">New Task</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TASK_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTaskType(t.id)}
                className={[
                  'rounded-xl border p-2 text-left text-xs transition-all',
                  taskType === t.id
                    ? 'border-brand-indigo bg-brand-indigo/5 text-brand-indigo font-semibold'
                    : 'border-surface-ink/10 text-surface-muted hover:border-brand-indigo/40',
                ].join(' ')}
              >
                <div className="font-medium">{t.label}</div>
                <div className="opacity-70 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
          <textarea
            className="input w-full h-24 resize-none"
            placeholder="Describe what you want the AI to do… e.g. 'Pay my Verizon bill when it comes due' or 'Book a hotel in Austin for June 14 under $200'"
            value={taskDesc}
            onChange={(e) => setTaskDesc(e.target.value)}
          />
          <button
            className="btn-primary"
            disabled={!taskDesc.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate({ task_description: taskDesc, task_type: taskType })}
          >
            {createMutation.isPending ? 'Analyzing…' : 'Delegate to AI →'}
          </button>
        </div>
      </section>

      {/* Pre-action confirmation modal */}
      {pendingTask && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-raised rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🤖</div>
              <h2 className="text-lg font-bold text-surface-ink">Review Before AI Acts</h2>
              <p className="text-sm text-surface-muted mt-1">AI will perform this action on your behalf. Tap Approve to proceed.</p>
            </div>
            <div className="rounded-xl bg-surface-sunk p-4 mb-4">
              <p className="text-sm text-surface-ink font-medium">{pendingTask.task_description}</p>
              <p className="text-xs text-surface-muted mt-1">Type: {TASK_TYPES.find((t) => t.id === pendingTask.task_type)?.label ?? pendingTask.task_type}</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 mb-5">
              ⚠️ This action cannot be undone within 15 minutes once approved. Review carefully.
            </div>
            <div className="flex gap-3">
              <button
                className="flex-1 rounded-xl border border-surface-ink/20 py-2 text-sm font-semibold text-surface-muted hover:bg-surface-sunk transition-colors"
                onClick={() => cancelMutation.mutate(pendingTask.id)}
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-xl bg-brand-indigo text-white py-2 text-sm font-semibold hover:bg-brand-indigo/90 transition-colors"
                onClick={() => approveMutation.mutate(pendingTask.id)}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? 'Executing…' : '✓ Approve & Execute'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task history */}
      <section className="card">
        <h2 className="text-lg font-semibold text-surface-ink mb-4">Task History</h2>
        {isLoading ? (
          <div className="py-8 text-center text-surface-muted text-sm animate-pulse">Loading tasks…</div>
        ) : tasks.length === 0 ? (
          <div className="py-10 text-center">
            <div className="text-4xl mb-3">🤖</div>
            <p className="text-surface-muted text-sm">No tasks yet. Delegate your first task above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const canUndo = task.can_undo && task.undo_deadline && new Date(task.undo_deadline) > new Date();
              return (
                <div key={task.id} className="rounded-xl bg-surface-sunk p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-surface-ink">{task.task_description}</p>
                      <p className="text-xs text-surface-muted mt-0.5">{new Date(task.created_at).toLocaleString()}</p>
                      {task.result_summary && (
                        <p className="text-xs text-surface-ink/70 mt-1 italic">{task.result_summary}</p>
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_STYLES[task.status] ?? ''}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                  {canUndo && (
                    <button
                      className="mt-2 text-xs text-brand-coral hover:underline"
                      onClick={() => undoMutation.mutate(task.id)}
                    >
                      ↩ Undo (within 15 min)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
