/**
 * Family Hub — Shared family coordination
 * Propel Stack AI, LLC
 */
import { useState } from 'react';
import { FamilySharingToggle } from '../components/FamilySharingToggle'; // Enhancement 22
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface FamilyMember {
  id: string;
  name: string;
  role: string;
  dob: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface FamilyTask {
  id: string;
  title: string;
  assignee_name: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

const ROLE_OPTIONS = ['Parent', 'Spouse', 'Partner', 'Child', 'Guardian', 'Other'];

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase();
}

function isOverdue(task: FamilyTask): boolean {
  if (task.completed || !task.due_date) return false;
  return new Date(task.due_date) < new Date(new Date().toDateString());
}

export function FamilyHub() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'members' | 'tasks' | 'emergency'>('members');

  // Member form state
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('Parent');
  const [memberDob, setMemberDob] = useState('');

  // Task form state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDue, setTaskDue] = useState('');

  // Emergency contact form state
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelationship, setContactRelationship] = useState('');

  // Queries
  const { data: members = [], isLoading: membersLoading } = useQuery<FamilyMember[]>({
    queryKey: ['family-members'],
    queryFn: () => apiRequest<FamilyMember[]>('/api/family/members'),
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<FamilyTask[]>({
    queryKey: ['family-tasks'],
    queryFn: () => apiRequest<FamilyTask[]>('/api/family/tasks'),
  });

  const { data: contacts = [], isLoading: contactsLoading } = useQuery<EmergencyContact[]>({
    queryKey: ['family-emergency-contacts'],
    queryFn: () => apiRequest<EmergencyContact[]>('/api/family/emergency-contacts'),
  });

  // Mutations — Members
  const addMemberMutation = useMutation({
    mutationFn: (body: { name: string; role: string; dob?: string }) =>
      apiRequest<{ id: string }>('/api/family/members', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family-members'] });
      setShowMemberForm(false);
      setMemberName('');
      setMemberRole('Parent');
      setMemberDob('');
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/family/members/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family-members'] }),
  });

  // Mutations — Tasks
  const addTaskMutation = useMutation({
    mutationFn: (body: { title: string; assignee_name?: string; due_date?: string }) =>
      apiRequest<{ id: string }>('/api/family/tasks', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family-tasks'] });
      setShowTaskForm(false);
      setTaskTitle('');
      setTaskAssignee('');
      setTaskDue('');
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      apiRequest<{ id: string }>(`/api/family/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ completed }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family-tasks'] }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/family/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family-tasks'] }),
  });

  // Mutations — Emergency Contacts
  const addContactMutation = useMutation({
    mutationFn: (body: { name: string; phone: string; relationship: string }) =>
      apiRequest<{ id: string }>('/api/family/emergency-contacts', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family-emergency-contacts'] });
      setShowContactForm(false);
      setContactName('');
      setContactPhone('');
      setContactRelationship('');
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/family/emergency-contacts/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family-emergency-contacts'] }),
  });

  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-ink">Family Hub</h1>
          <p className="text-surface-muted text-sm mt-1">
            Manage family members, shared tasks, and emergency contacts in one place.
          </p>
        </div>
      </div>

      {/* Family Sharing Toggle (Enhancement 22) */}
      <FamilySharingToggle />

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface-sunk rounded-xl p-1">
        {(['members', 'tasks', 'emergency'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-sm py-2 px-3 rounded-lg font-medium transition-all ${
              tab === t
                ? 'bg-white text-brand-indigo shadow-sm'
                : 'text-surface-muted hover:text-surface-ink'
            }`}
          >
            {t === 'members' ? '👨‍👩‍👧 Members' : t === 'tasks' ? '✅ Tasks' : '🚨 Emergency'}
          </button>
        ))}
      </div>

      {/* --- MEMBERS TAB --- */}
      {tab === 'members' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowMemberForm(s => !s)}
              className="btn-primary text-sm"
            >
              + Add Member
            </button>
          </div>

          {showMemberForm && (
            <div className="card border-brand-indigo/30">
              <h3 className="font-semibold text-surface-ink mb-3">Add Family Member</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Name *</label>
                  <input
                    className="input"
                    placeholder="Full name"
                    value={memberName}
                    onChange={e => setMemberName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Role</label>
                  <select
                    className="input"
                    value={memberRole}
                    onChange={e => setMemberRole(e.target.value)}
                  >
                    {ROLE_OPTIONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Date of Birth (optional)</label>
                  <input
                    type="date"
                    className="input"
                    value={memberDob}
                    onChange={e => setMemberDob(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      addMemberMutation.mutate({
                        name: memberName,
                        role: memberRole,
                        ...(memberDob ? { dob: memberDob } : {}),
                      })
                    }
                    disabled={!memberName.trim() || addMemberMutation.isPending}
                    className="btn-primary text-sm"
                  >
                    {addMemberMutation.isPending ? 'Saving…' : 'Add Member'}
                  </button>
                  <button onClick={() => setShowMemberForm(false)} className="btn-secondary text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {membersLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="card animate-pulse">
                  <div className="h-12 w-12 rounded-full bg-surface-sunk mb-3" />
                  <div className="h-4 bg-surface-sunk rounded w-3/4 mb-2" />
                  <div className="h-3 bg-surface-sunk rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-5xl mb-3">👨‍👩‍👧</div>
              <p className="font-medium text-surface-ink">No family members yet</p>
              <p className="text-sm text-surface-muted mt-1">Add members to get started with shared coordination.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map(m => (
                <div key={m.id} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-full bg-brand-indigo/20 text-brand-indigo grid place-items-center text-lg font-bold flex-shrink-0">
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt={m.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        getInitial(m.name)
                      )}
                    </div>
                    <button
                      onClick={() => deleteMemberMutation.mutate(m.id)}
                      disabled={deleteMemberMutation.isPending}
                      className="text-surface-muted hover:text-red-500 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="font-semibold text-surface-ink">{m.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="chip text-xs">{m.role}</span>
                  </div>
                  {m.dob && (
                    <div className="text-xs text-surface-muted mt-1.5">
                      DOB: {new Date(m.dob).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TASKS TAB --- */}
      {tab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowTaskForm(s => !s)}
              className="btn-primary text-sm"
            >
              + Add Task
            </button>
          </div>

          {showTaskForm && (
            <div className="card border-brand-indigo/30">
              <h3 className="font-semibold text-surface-ink mb-3">Add Task</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Title *</label>
                  <input
                    className="input"
                    placeholder="e.g. Take out recycling"
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Assign to (optional)</label>
                  <input
                    className="input"
                    placeholder="Family member name"
                    value={taskAssignee}
                    onChange={e => setTaskAssignee(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Due date (optional)</label>
                  <input
                    type="date"
                    className="input"
                    value={taskDue}
                    onChange={e => setTaskDue(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      addTaskMutation.mutate({
                        title: taskTitle,
                        ...(taskAssignee ? { assignee_name: taskAssignee } : {}),
                        ...(taskDue ? { due_date: taskDue } : {}),
                      })
                    }
                    disabled={!taskTitle.trim() || addTaskMutation.isPending}
                    className="btn-primary text-sm"
                  >
                    {addTaskMutation.isPending ? 'Saving…' : 'Add Task'}
                  </button>
                  <button onClick={() => setShowTaskForm(false)} className="btn-secondary text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {tasksLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="card animate-pulse flex gap-3">
                  <div className="w-5 h-5 rounded bg-surface-sunk flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="h-4 bg-surface-sunk rounded w-2/3 mb-1" />
                    <div className="h-3 bg-surface-sunk rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-5xl mb-3">✅</div>
              <p className="font-medium text-surface-ink">No tasks yet</p>
              <p className="text-sm text-surface-muted mt-1">Add shared tasks to coordinate your household.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingTasks.map(task => (
                <div
                  key={task.id}
                  className={`card flex items-start gap-3 ${isOverdue(task) ? 'border-2 border-red-400' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggleTaskMutation.mutate({ id: task.id, completed: true })}
                    className="mt-0.5 w-4 h-4 accent-brand-indigo cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-surface-ink">{task.title}</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {task.assignee_name && (
                        <span className="text-xs text-surface-muted">👤 {task.assignee_name}</span>
                      )}
                      {task.due_date && (
                        <span className={`text-xs ${isOverdue(task) ? 'text-red-500 font-semibold' : 'text-surface-muted'}`}>
                          📅 {isOverdue(task) ? 'Overdue — ' : ''}{new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTaskMutation.mutate(task.id)}
                    className="text-surface-muted hover:text-red-500 text-sm flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {completedTasks.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-surface-muted uppercase tracking-wide pt-2 pb-1">
                    Completed ({completedTasks.length})
                  </div>
                  {completedTasks.map(task => (
                    <div key={task.id} className="card flex items-start gap-3 opacity-50">
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => toggleTaskMutation.mutate({ id: task.id, completed: false })}
                        className="mt-0.5 w-4 h-4 accent-brand-indigo cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-surface-ink line-through">{task.title}</div>
                        {task.assignee_name && (
                          <span className="text-xs text-surface-muted">👤 {task.assignee_name}</span>
                        )}
                      </div>
                      <button
                        onClick={() => deleteTaskMutation.mutate(task.id)}
                        className="text-surface-muted hover:text-red-500 text-sm flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- EMERGENCY CONTACTS TAB --- */}
      {tab === 'emergency' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowContactForm(s => !s)}
              className="btn-primary text-sm"
            >
              + Add Contact
            </button>
          </div>

          {showContactForm && (
            <div className="card border-red-300">
              <h3 className="font-semibold text-surface-ink mb-3">Add Emergency Contact</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Name *</label>
                  <input
                    className="input"
                    placeholder="Full name"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Phone *</label>
                  <input
                    type="tel"
                    className="input"
                    placeholder="+1 (555) 000-0000"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Relationship *</label>
                  <input
                    className="input"
                    placeholder="e.g. Doctor, Neighbor, Sister"
                    value={contactRelationship}
                    onChange={e => setContactRelationship(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      addContactMutation.mutate({
                        name: contactName,
                        phone: contactPhone,
                        relationship: contactRelationship,
                      })
                    }
                    disabled={
                      !contactName.trim() ||
                      !contactPhone.trim() ||
                      !contactRelationship.trim() ||
                      addContactMutation.isPending
                    }
                    className="btn-primary text-sm"
                  >
                    {addContactMutation.isPending ? 'Saving…' : 'Add Contact'}
                  </button>
                  <button onClick={() => setShowContactForm(false)} className="btn-secondary text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {contactsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="card animate-pulse">
                  <div className="h-4 bg-surface-sunk rounded w-1/2 mb-2" />
                  <div className="h-3 bg-surface-sunk rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-5xl mb-3">🚨</div>
              <p className="font-medium text-surface-ink">No emergency contacts yet</p>
              <p className="text-sm text-surface-muted mt-1">
                Add doctors, neighbors, and trusted contacts who can be reached in an emergency.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.map(c => (
                <div key={c.id} className="card flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 grid place-items-center text-base font-bold flex-shrink-0">
                    {getInitial(c.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-surface-ink">{c.name}</div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <a
                        href={`tel:${c.phone}`}
                        className="text-sm text-brand-indigo hover:underline"
                      >
                        {c.phone}
                      </a>
                      <span className="chip text-xs">{c.relationship}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteContactMutation.mutate(c.id)}
                    disabled={deleteContactMutation.isPending}
                    className="text-surface-muted hover:text-red-500 text-sm flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
