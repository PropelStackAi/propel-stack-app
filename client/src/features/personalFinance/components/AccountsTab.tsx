// ─── Accounts Tab ────────────────────────────────────────────────────────────
// Enhancement 18 — Propel Stack AI, LLC

import { useState } from 'react';
import { useFinanceAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from '../api';
import type { AccountType, FinanceAccount } from '../types';

const ACCOUNT_TYPES: { value: AccountType; label: string; emoji: string }[] = [
  { value: 'checking',    label: 'Checking',    emoji: '🏦' },
  { value: 'savings',     label: 'Savings',     emoji: '💰' },
  { value: 'credit',      label: 'Credit Card', emoji: '💳' },
  { value: 'loan',        label: 'Loan',        emoji: '📋' },
  { value: 'investment',  label: 'Investment',  emoji: '📈' },
  { value: 'manual',      label: 'Other',       emoji: '🗂️' },
];

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function AccountCard({ acct, onUpdate, onDelete }: {
  acct: FinanceAccount;
  onUpdate: (data: Partial<FinanceAccount> & { id: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [balance, setBalance] = useState(String(acct.balance));
  const [name, setName] = useState(acct.display_name);
  const meta = ACCOUNT_TYPES.find((t) => t.value === acct.account_type) ?? ACCOUNT_TYPES[5];
  const isCredit = acct.account_type === 'credit' || acct.account_type === 'loan';

  function save() {
    onUpdate({ id: acct.id, display_name: name, balance: Number(balance), balance_date: new Date().toISOString().slice(0, 10) });
    setEditing(false);
  }

  return (
    <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-3">
      {editing ? (
        <div className="space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" placeholder="Account name" />
          <div className="flex gap-2">
            <input value={balance} onChange={(e) => setBalance(e.target.value)} type="number" step="0.01"
              className="flex-1 border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" placeholder="Balance" />
            <button type="button" onClick={save} className="text-xs bg-brand-teal text-white px-3 py-1.5 rounded-xl font-semibold">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="text-xs text-surface-muted">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-xl">{meta.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-surface-ink">{acct.display_name}</p>
            <p className="text-[10px] text-surface-muted uppercase tracking-wide">{meta.label} · Updated {acct.balance_date}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className={`text-base font-bold ${isCredit ? 'text-red-600' : 'text-brand-teal'}`}>
              {isCredit ? '-' : ''}{fmt(Math.abs(acct.balance))}
            </p>
            <p className="text-[10px] text-surface-muted">{isCredit ? 'Balance owed' : 'Balance'}</p>
          </div>
          <div className="flex gap-1">
            <button type="button" onClick={() => setEditing(true)} className="text-xs text-surface-muted hover:text-surface-ink px-1">✎</button>
            <button type="button" onClick={() => onDelete(acct.id)} className="text-xs text-surface-muted hover:text-red-500 px-1">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AccountsTab(): JSX.Element {
  const { data } = useFinanceAccounts();
  const create = useCreateAccount();
  const update = useUpdateAccount();
  const del = useDeleteAccount();

  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<AccountType>('checking');
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('0');

  const accounts = data?.accounts ?? [];
  const totalAssets = accounts.filter((a) => a.account_type !== 'credit' && a.account_type !== 'loan').reduce((s, a) => s + a.balance, 0);
  const totalDebt = accounts.filter((a) => a.account_type === 'credit' || a.account_type === 'loan').reduce((s, a) => s + a.balance, 0);

  function submit() {
    if (!name) return;
    create.mutate({ account_type: type, display_name: name, balance: Number(balance) }, {
      onSuccess: () => { setShowForm(false); setName(''); setBalance('0'); },
    });
  }

  return (
    <div className="space-y-3">
      {/* Summary strip */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
            <p className="text-base font-bold text-green-700">{fmt(totalAssets)}</p>
            <p className="text-[10px] text-green-600 uppercase tracking-wide">Total Assets</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
            <p className="text-base font-bold text-red-600">{fmt(totalDebt)}</p>
            <p className="text-[10px] text-red-500 uppercase tracking-wide">Total Debt</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-xs font-semibold text-surface-muted uppercase tracking-wide">Accounts ({accounts.length})</p>
        <button type="button" onClick={() => setShowForm(!showForm)}
          className="text-xs bg-brand-teal text-white px-3 py-1.5 rounded-xl font-semibold">
          + Add account
        </button>
      </div>

      {/* Add account form */}
      {showForm && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold">Add Account</p>
          <select value={type} onChange={(e) => setType(e.target.value as AccountType)}
            className="w-full border border-surface-ink/10 rounded-lg px-3 py-2 text-sm">
            {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
          </select>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Account name (e.g. Chase Checking)"
            className="w-full border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <input value={balance} onChange={(e) => setBalance(e.target.value)} type="number" step="0.01" placeholder="Current balance"
              className="flex-1 border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            <button type="button" onClick={submit} disabled={create.isPending}
              className="text-xs bg-brand-teal text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40">
              {create.isPending ? 'Adding…' : 'Add'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-surface-muted">Cancel</button>
          </div>
          <p className="text-[10px] text-surface-muted">
            🔒 Never enter full account numbers here — use a nickname like "Chase Checking" or "Amex Blue".
          </p>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="text-center py-10 space-y-2">
          <p className="text-2xl">🏦</p>
          <p className="text-sm text-surface-muted">No accounts yet.</p>
          <p className="text-xs text-surface-muted">Add accounts manually to start tracking your balances.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map((a) => (
            <AccountCard key={a.id} acct={a}
              onUpdate={(d) => update.mutate(d)}
              onDelete={(id) => del.mutate(id)}
            />
          ))}
        </div>
      )}

      <p className="text-[10px] text-surface-muted text-center pt-2">
        Never enter full account numbers. Use display names only. Propel Stack AI does not initiate payments or transfers.
      </p>
    </div>
  );
}
