/**
 * Grocery & Meal Intelligence — Enhancement 32
 * Propel Stack AI, LLC
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface PantryItem { id: string; name: string; category: string | null; quantity: number | null; unit: string | null; expiry_date: string | null; }
interface GroceryList { id: string; week_start: string; items: GroceryItem[]; estimated_total: number | null; actual_total: number | null; }
interface GroceryItem { name: string; quantity: string; unit: string; aisle: string; checked: boolean; meal_source?: string; }

const CATEGORIES = ['produce', 'dairy', 'meat', 'pantry', 'frozen', 'bakery', 'beverages', 'other'];

export function GroceryHub() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'list' | 'pantry' | 'suggest'>('list');
  const [pantryForm, setPantryForm] = useState({ name: '', category: 'produce', quantity: '', unit: '', expiry_date: '' });
  const [showPantryAdd, setShowPantryAdd] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const { data: currentList } = useQuery({
    queryKey: ['grocery-list'],
    queryFn: () => apiRequest<GroceryList>('/api/grocery/lists/current'),
  });

  const { data: pantry = [] } = useQuery({
    queryKey: ['pantry'],
    queryFn: () => apiRequest<PantryItem[]>('/api/grocery/pantry'),
  });

  const updateListMutation = useMutation({
    mutationFn: (data: { items: GroceryItem[] }) =>
      apiRequest(`/api/grocery/lists/${currentList?.id}`, { method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grocery-list'] }),
  });

  const addPantryMutation = useMutation({
    mutationFn: (data: typeof pantryForm) => apiRequest<{ id: string }>('/api/grocery/pantry', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pantry'] }); setShowPantryAdd(false); setPantryForm({ name: '', category: 'produce', quantity: '', unit: '', expiry_date: '' }); },
  });

  const deletePantryMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/grocery/pantry/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pantry'] }),
  });

  async function loadSuggestions() {
    setLoadingSuggestions(true);
    try {
      const result = await apiRequest<{ suggestions: string[] }>('/api/grocery/suggest-meals', { method: 'POST', body: JSON.stringify({}), headers: { 'Content-Type': 'application/json' } });
      setSuggestions(result.suggestions ?? []);
    } finally { setLoadingSuggestions(false); }
  }

  function toggleItem(idx: number) {
    if (!currentList) return;
    const items = [...(currentList.items ?? [])];
    items[idx] = { ...items[idx], checked: !items[idx].checked };
    updateListMutation.mutate({ items });
  }

  const items: GroceryItem[] = currentList?.items ?? [];
  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-surface-ink">Grocery & Meals</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-sunk p-1 rounded-xl w-fit">
        {(['list', 'pantry', 'suggest'] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === t ? 'bg-surface-raised shadow-sm text-brand-indigo' : 'text-surface-muted'}`}>
            {t === 'list' ? '🛒 Grocery List' : t === 'pantry' ? '🥦 Pantry' : '👨‍🍳 Meal Suggestions'}
          </button>
        ))}
      </div>

      {/* Grocery List Tab */}
      {activeTab === 'list' && currentList && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-surface-ink">
              Week of {new Date(currentList.week_start).toLocaleDateString()}
            </h2>
            <span className="text-sm text-surface-muted">{checkedCount}/{items.length} items</span>
          </div>
          {items.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-surface-muted text-sm">Your grocery list is empty.</p>
              <p className="text-xs text-surface-muted mt-1">Generate from a meal plan or add items manually.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {CATEGORIES.map((aisle) => {
                const aisleItems = items.filter((i) => (i.aisle ?? 'other') === aisle);
                if (aisleItems.length === 0) return null;
                return (
                  <div key={aisle} className="mb-3">
                    <p className="text-xs font-semibold text-surface-muted uppercase tracking-wide mb-1">{aisle}</p>
                    {aisleItems.map((item, globalIdx) => {
                      const realIdx = items.indexOf(item);
                      return (
                        <div key={globalIdx} className="flex items-center gap-2 py-1">
                          <input type="checkbox" checked={item.checked} onChange={() => toggleItem(realIdx)}
                            className="accent-brand-indigo w-4 h-4 rounded" />
                          <span className={`text-sm ${item.checked ? 'line-through text-surface-muted' : 'text-surface-ink'}`}>
                            {item.quantity} {item.unit} {item.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Pantry Tab */}
      {activeTab === 'pantry' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-surface-ink">Pantry Inventory ({pantry.length} items)</h2>
            <button className="btn-primary text-sm" onClick={() => setShowPantryAdd(!showPantryAdd)}>+ Add Item</button>
          </div>
          {showPantryAdd && (
            <div className="rounded-xl bg-surface-sunk p-4 mb-4 space-y-3">
              <input className="input w-full" placeholder="Item name" value={pantryForm.name} onChange={(e) => setPantryForm({ ...pantryForm, name: e.target.value })} />
              <div className="grid grid-cols-3 gap-2">
                <input className="input" placeholder="Qty" type="number" value={pantryForm.quantity} onChange={(e) => setPantryForm({ ...pantryForm, quantity: e.target.value })} />
                <input className="input" placeholder="Unit (oz, lbs…)" value={pantryForm.unit} onChange={(e) => setPantryForm({ ...pantryForm, unit: e.target.value })} />
                <select className="input" value={pantryForm.category} onChange={(e) => setPantryForm({ ...pantryForm, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <input type="date" className="input w-full" placeholder="Expiry date" value={pantryForm.expiry_date} onChange={(e) => setPantryForm({ ...pantryForm, expiry_date: e.target.value })} />
              <button className="btn-primary text-sm" disabled={!pantryForm.name || addPantryMutation.isPending} onClick={() => addPantryMutation.mutate(pantryForm)}>
                {addPantryMutation.isPending ? 'Adding…' : 'Add to Pantry'}
              </button>
            </div>
          )}
          {pantry.length === 0 ? (
            <p className="text-sm text-surface-muted text-center py-6">Pantry is empty. Add items to get meal suggestions.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {pantry.map((item) => (
                <div key={item.id} className="rounded-xl bg-surface-sunk p-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-surface-ink">{item.name}</p>
                    <p className="text-xs text-surface-muted">{item.quantity}{item.unit ? ` ${item.unit}` : ''}{item.category ? ` · ${item.category}` : ''}</p>
                    {item.expiry_date && <p className={`text-xs mt-0.5 ${new Date(item.expiry_date) < new Date(Date.now() + 7*86400000) ? 'text-brand-coral' : 'text-surface-muted'}`}>Exp: {new Date(item.expiry_date).toLocaleDateString()}</p>}
                  </div>
                  <button className="text-xs text-surface-muted hover:text-brand-coral" onClick={() => deletePantryMutation.mutate(item.id)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Meal Suggestions Tab */}
      {activeTab === 'suggest' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-surface-ink mb-2">What Can I Make?</h2>
          <p className="text-sm text-surface-muted mb-4">AI suggests meals based on your current pantry inventory.</p>
          <button className="btn-primary" onClick={loadSuggestions} disabled={loadingSuggestions}>
            {loadingSuggestions ? 'Thinking…' : '✨ Get Meal Suggestions'}
          </button>
          {suggestions.length > 0 && (
            <div className="mt-4 space-y-2">
              {suggestions.map((s, i) => (
                <div key={i} className="rounded-xl bg-surface-sunk p-3 text-sm text-surface-ink">{s}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
