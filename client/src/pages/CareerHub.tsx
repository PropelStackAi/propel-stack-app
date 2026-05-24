/**
 * Career & Professional Growth Hub — Enhancement 33
 * Propel Stack AI, LLC
 *
 * License/CE tracker, job pipeline, AI interview prep.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface License { id: string; license_name: string; license_number: string | null; issuing_body: string | null; issue_date: string | null; expiry_date: string | null; ce_credits_required: number; ce_credits_earned: number; status: string; }
interface Job { id: string; company: string; role: string; status: string; applied_date: string | null; notes: string | null; }
interface CEEntry { id: string; course_name: string; provider: string | null; credits: number; completed_date: string; }

const JOB_STATUSES = ['applied', 'phone_screen', 'interview', 'offer', 'accepted', 'rejected', 'withdrawn'];
const STATUS_COLORS: Record<string, string> = {
  applied: 'bg-brand-indigo/10 text-brand-indigo', phone_screen: 'bg-brand-teal/10 text-brand-teal',
  interview: 'bg-amber-100 text-amber-800', offer: 'bg-green-100 text-green-800',
  accepted: 'bg-green-200 text-green-900', rejected: 'bg-red-100 text-red-600',
  withdrawn: 'bg-surface-sunk text-surface-muted',
};

export function CareerHub() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'licenses' | 'jobs' | 'prep'>('licenses');
  const [selectedLicense, setSelectedLicense] = useState<string | null>(null);
  const [licForm, setLicForm] = useState({ license_name: '', license_number: '', issuing_body: '', issue_date: '', expiry_date: '', ce_credits_required: '0' });
  const [jobForm, setJobForm] = useState({ company: '', role: '', status: 'applied', applied_date: '', notes: '' });
  const [ceForm, setCeForm] = useState({ course_name: '', provider: '', credits: '', completed_date: '' });
  const [prepForm, setPrepForm] = useState({ role: '', company: '', question: '' });
  const [prepResponse, setPrepResponse] = useState('');
  const [prepLoading, setPrepLoading] = useState(false);
  const [showLicAdd, setShowLicAdd] = useState(false);
  const [showJobAdd, setShowJobAdd] = useState(false);
  const [showCeAdd, setShowCeAdd] = useState(false);

  const { data: licenses = [] } = useQuery({ queryKey: ['career-licenses'], queryFn: () => apiRequest<License[]>('/api/career/licenses') });
  const { data: jobs = [] } = useQuery({ queryKey: ['career-jobs'], queryFn: () => apiRequest<Job[]>('/api/career/jobs') });
  const { data: alerts = [] } = useQuery({ queryKey: ['license-alerts'], queryFn: () => apiRequest<any[]>('/api/career/license-alerts') });
  const { data: ceLog = [] } = useQuery({
    queryKey: ['ce-log', selectedLicense],
    queryFn: () => apiRequest<CEEntry[]>(`/api/career/licenses/${selectedLicense}/ce-log`),
    enabled: !!selectedLicense,
  });

  const addLicMutation = useMutation({
    mutationFn: (d: typeof licForm) => apiRequest<{ id: string }>('/api/career/licenses', { method: 'POST', body: JSON.stringify({ ...d, ce_credits_required: Number(d.ce_credits_required) }), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['career-licenses'] }); setShowLicAdd(false); setLicForm({ license_name: '', license_number: '', issuing_body: '', issue_date: '', expiry_date: '', ce_credits_required: '0' }); },
  });

  const deleteLicMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/career/licenses/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['career-licenses'] }); setSelectedLicense(null); },
  });

  const addJobMutation = useMutation({
    mutationFn: (d: typeof jobForm) => apiRequest<{ id: string }>('/api/career/jobs', { method: 'POST', body: JSON.stringify(d), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['career-jobs'] }); setShowJobAdd(false); setJobForm({ company: '', role: '', status: 'applied', applied_date: '', notes: '' }); },
  });

  const updateJobMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest(`/api/career/jobs/${id}`, { method: 'PUT', body: JSON.stringify({ status }), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['career-jobs'] }),
  });

  const addCeMutation = useMutation({
    mutationFn: (d: typeof ceForm) => apiRequest<{ id: string }>(`/api/career/licenses/${selectedLicense}/ce-log`, { method: 'POST', body: JSON.stringify({ ...d, credits: Number(d.credits) }), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ce-log', selectedLicense] }); qc.invalidateQueries({ queryKey: ['career-licenses'] }); setShowCeAdd(false); setCeForm({ course_name: '', provider: '', credits: '', completed_date: '' }); },
  });

  async function runInterviewPrep() {
    setPrepLoading(true);
    try {
      const result = await apiRequest<{ coaching: string }>('/api/career/interview-prep', { method: 'POST', body: JSON.stringify(prepForm), headers: { 'Content-Type': 'application/json' } });
      setPrepResponse(result.coaching ?? '');
    } finally { setPrepLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-surface-ink">Career Hub</h1>
        {alerts.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-800">
            ⚠️ {alerts.length} license{alerts.length > 1 ? 's' : ''} expiring within 90 days
          </div>
        )}
      </div>

      <div className="flex gap-1 bg-surface-sunk p-1 rounded-xl w-fit">
        {(['licenses', 'jobs', 'prep'] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === t ? 'bg-surface-raised shadow-sm text-brand-indigo' : 'text-surface-muted'}`}>
            {t === 'licenses' ? '📜 Licenses & CE' : t === 'jobs' ? '💼 Job Pipeline' : '🎯 Interview Prep'}
          </button>
        ))}
      </div>

      {activeTab === 'licenses' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="btn-primary text-sm" onClick={() => setShowLicAdd(!showLicAdd)}>+ Add License</button>
          </div>
          {showLicAdd && (
            <div className="card space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input className="input w-full" placeholder="License name (e.g. Series 65)" value={licForm.license_name} onChange={(e) => setLicForm({ ...licForm, license_name: e.target.value })} />
                <input className="input w-full" placeholder="License #" value={licForm.license_number} onChange={(e) => setLicForm({ ...licForm, license_number: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input className="input w-full" placeholder="Issuing body (e.g. FINRA)" value={licForm.issuing_body} onChange={(e) => setLicForm({ ...licForm, issuing_body: e.target.value })} />
                <input className="input w-full" placeholder="CE credits required" type="number" value={licForm.ce_credits_required} onChange={(e) => setLicForm({ ...licForm, ce_credits_required: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" className="input w-full" placeholder="Issue date" value={licForm.issue_date} onChange={(e) => setLicForm({ ...licForm, issue_date: e.target.value })} />
                <input type="date" className="input w-full" placeholder="Expiry date" value={licForm.expiry_date} onChange={(e) => setLicForm({ ...licForm, expiry_date: e.target.value })} />
              </div>
              <button className="btn-primary text-sm" disabled={!licForm.license_name || addLicMutation.isPending} onClick={() => addLicMutation.mutate(licForm)}>
                {addLicMutation.isPending ? 'Saving…' : 'Save License'}
              </button>
            </div>
          )}
          {licenses.map((lic) => {
            const pct = lic.ce_credits_required > 0 ? Math.min(100, (lic.ce_credits_earned / lic.ce_credits_required) * 100) : 100;
            const daysLeft = lic.expiry_date ? Math.ceil((new Date(lic.expiry_date).getTime() - Date.now()) / 86400000) : null;
            return (
              <div key={lic.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-surface-ink">{lic.license_name}</p>
                      {lic.license_number && <span className="chip text-xs font-mono">{lic.license_number}</span>}
                      {daysLeft !== null && daysLeft <= 90 && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${daysLeft <= 30 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {daysLeft}d left
                        </span>
                      )}
                    </div>
                    {lic.issuing_body && <p className="text-xs text-surface-muted mt-0.5">{lic.issuing_body}</p>}
                    {lic.ce_credits_required > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-surface-muted mb-1">
                          <span>CE Credits</span>
                          <span>{lic.ce_credits_earned}/{lic.ce_credits_required}</span>
                        </div>
                        <div className="h-1.5 bg-surface-sunk rounded-full overflow-hidden">
                          <div className="h-full bg-brand-teal rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button className="btn-ghost text-xs" onClick={() => setSelectedLicense(selectedLicense === lic.id ? null : lic.id)}>
                      {selectedLicense === lic.id ? 'Close' : 'CE Log'}
                    </button>
                    <button className="text-xs text-brand-coral hover:underline" onClick={() => { if (confirm('Delete?')) deleteLicMutation.mutate(lic.id); }}>Delete</button>
                  </div>
                </div>
                {selectedLicense === lic.id && (
                  <div className="mt-4 border-t border-surface-ink/[0.06] pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold">CE Credit Log</p>
                      <button className="btn-ghost text-xs" onClick={() => setShowCeAdd(!showCeAdd)}>+ Log Credits</button>
                    </div>
                    {showCeAdd && (
                      <div className="rounded-xl bg-surface-sunk p-3 mb-3 space-y-2">
                        <input className="input w-full text-sm" placeholder="Course name" value={ceForm.course_name} onChange={(e) => setCeForm({ ...ceForm, course_name: e.target.value })} />
                        <div className="grid grid-cols-3 gap-2">
                          <input className="input text-sm" placeholder="Provider" value={ceForm.provider} onChange={(e) => setCeForm({ ...ceForm, provider: e.target.value })} />
                          <input className="input text-sm" type="number" placeholder="Credits" value={ceForm.credits} onChange={(e) => setCeForm({ ...ceForm, credits: e.target.value })} />
                          <input type="date" className="input text-sm" value={ceForm.completed_date} onChange={(e) => setCeForm({ ...ceForm, completed_date: e.target.value })} />
                        </div>
                        <button className="btn-primary text-xs" disabled={!ceForm.course_name || !ceForm.credits || !ceForm.completed_date || addCeMutation.isPending} onClick={() => addCeMutation.mutate(ceForm)}>
                          {addCeMutation.isPending ? 'Logging…' : 'Log Credits'}
                        </button>
                      </div>
                    )}
                    {ceLog.length === 0 ? <p className="text-xs text-surface-muted">No CE credits logged yet.</p> : (
                      <div className="space-y-1">
                        {ceLog.map((ce) => (
                          <div key={ce.id} className="flex items-center justify-between text-xs">
                            <span className="text-surface-ink">{ce.course_name}</span>
                            <span className="text-brand-teal font-semibold">+{ce.credits} credits</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {licenses.length === 0 && !showLicAdd && (
            <div className="py-10 text-center card">
              <div className="text-4xl mb-2">📜</div>
              <p className="text-surface-muted text-sm">No licenses tracked yet.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="btn-primary text-sm" onClick={() => setShowJobAdd(!showJobAdd)}>+ Add Application</button>
          </div>
          {showJobAdd && (
            <div className="card space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input className="input w-full" placeholder="Company" value={jobForm.company} onChange={(e) => setJobForm({ ...jobForm, company: e.target.value })} />
                <input className="input w-full" placeholder="Role" value={jobForm.role} onChange={(e) => setJobForm({ ...jobForm, role: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select className="input w-full" value={jobForm.status} onChange={(e) => setJobForm({ ...jobForm, status: e.target.value })}>
                  {JOB_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
                <input type="date" className="input w-full" value={jobForm.applied_date} onChange={(e) => setJobForm({ ...jobForm, applied_date: e.target.value })} />
              </div>
              <textarea className="input w-full h-16 resize-none text-sm" placeholder="Notes" value={jobForm.notes} onChange={(e) => setJobForm({ ...jobForm, notes: e.target.value })} />
              <button className="btn-primary text-sm" disabled={!jobForm.company || addJobMutation.isPending} onClick={() => addJobMutation.mutate(jobForm)}>
                {addJobMutation.isPending ? 'Saving…' : 'Save Application'}
              </button>
            </div>
          )}
          <div className="space-y-2">
            {jobs.map((job) => (
              <div key={job.id} className="card flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-surface-ink">{job.role} <span className="text-surface-muted font-normal">at</span> {job.company}</p>
                  {job.applied_date && <p className="text-xs text-surface-muted">Applied {new Date(job.applied_date).toLocaleDateString()}</p>}
                  {job.notes && <p className="text-xs text-surface-ink/60 mt-0.5 line-clamp-1">{job.notes}</p>}
                </div>
                <select
                  className={`text-xs font-semibold px-2 py-1 rounded-full border-0 ${STATUS_COLORS[job.status] ?? ''}`}
                  value={job.status}
                  onChange={(e) => updateJobMutation.mutate({ id: job.id, status: e.target.value })}
                >
                  {JOB_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
            ))}
            {jobs.length === 0 && !showJobAdd && (
              <div className="py-10 text-center card"><div className="text-4xl mb-2">💼</div><p className="text-surface-muted text-sm">No job applications tracked yet.</p></div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'prep' && (
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-surface-ink">AI Interview Coach</h2>
          <div className="grid grid-cols-2 gap-3">
            <input className="input w-full" placeholder="Target role" value={prepForm.role} onChange={(e) => setPrepForm({ ...prepForm, role: e.target.value })} />
            <input className="input w-full" placeholder="Company (optional)" value={prepForm.company} onChange={(e) => setPrepForm({ ...prepForm, company: e.target.value })} />
          </div>
          <textarea className="input w-full h-24 resize-none" placeholder="Interview question to practice…" value={prepForm.question} onChange={(e) => setPrepForm({ ...prepForm, question: e.target.value })} />
          <button className="btn-primary" disabled={!prepForm.role || !prepForm.question || prepLoading} onClick={runInterviewPrep}>
            {prepLoading ? 'Coaching…' : '🎯 Get Coaching'}
          </button>
          {prepResponse && (
            <div className="rounded-xl bg-brand-teal/5 border border-brand-teal/20 p-4 text-sm text-surface-ink whitespace-pre-wrap">
              {prepResponse}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
