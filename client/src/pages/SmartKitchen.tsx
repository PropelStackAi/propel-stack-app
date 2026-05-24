/**
 * Smart Kitchen — Pantry tracker, shopping list, AI meal suggestions
 * Propel Stack AI, LLC
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface PantryItem {
  id: string;
  item_name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  expiry_date: string | null;
  created_at: string;
}

interface GroceryList {
  id: string;
  items: Array<{ name: string; quantity: string; unit: string; checked: boolean }>;
}

interface MealSuggestion {
  name: string;
  ingredients: string[];
  instructions: string;
}

const CATEGORY_OPTIONS = ['Produce', 'Dairy', 'Meat', 'Frozen', 'Pantry', 'Beverages', 'Other'];

function daysUntilExpiry(expiryDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  return Math.floor((exp.getTime() - now.getTime()) / 86400000);
}

function expiryColor(expiryDate: string | null): string {
  if (!expiryDate) return '';
  const days = daysUntilExpiry(expiryDate);
  if (days < 0) return 'text-red-600 font-semibold';
  if (days <= 7) return 'text-amber-600 font-semibold';
  return 'text-surface-muted';
}

export function SmartKitchen() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'pantry' | 'shopping' | 'recipes'>('pantry');

  // Pantry form state
  const [showPantryForm, setShowPantryForm] = useState(false);
  const [pantryName, setPantryName] = useState('');
  const [pantryCategory, setPantryCategory] = useState('Pantry');
  const [pantryQty, setPantryQty] = useState('1');
  const [pantryUnit, setPantryUnit] = useState('');
  const [pantryExpiry, setPantryExpiry] = useState('');

  // Shopping list add state
  const [newListItemName, setNewListItemName] = useState('');
  const [newListItemQty, setNewListItemQty] = useState('1');
  const [newListItemUnit, setNewListItemUnit] = useState('');

  // Recipes state
  const [suggestions, setSuggestions] = useState<MealSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);

  // Queries
  const { data: pantry = [], isLoading: pantryLoading } = useQuery<PantryItem[]>({
    queryKey: ['pantry'],
    queryFn: () => apiRequest<PantryItem[]>('/api/grocery/pantry'),
  });

  const { data: groceryList, isLoading: listLoading } = useQuery<GroceryList>({
    queryKey: ['grocery-list'],
    queryFn: () => apiRequest<GroceryList>('/api/grocery/lists/current'),
  });

  // Pantry mutations
  const addPantryMutation = useMutation({
    mutationFn: (body: {
      item_name: string;
      category?: string;
      quantity: number;
      unit?: string;
      expiry_date?: string;
    }) =>
      apiRequest<{ id: string }>('/api/grocery/pantry', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pantry'] });
      setShowPantryForm(false);
      setPantryName('');
      setPantryCategory('Pantry');
      setPantryQty('1');
      setPantryUnit('');
      setPantryExpiry('');
    },
  });

  const deletePantryMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/grocery/pantry/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pantry'] }),
  });

  // Shopping list mutations
  const updateListMutation = useMutation({
    mutationFn: ({
      id,
      items,
    }: {
      id: string;
      items: GroceryList['items'];
    }) =>
      apiRequest<{ id: string }>(`/api/grocery/lists/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ items }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grocery-list'] }),
  });

  function toggleListItem(index: number) {
    if (!groceryList) return;
    const updated = groceryList.items.map((item, i) =>
      i === index ? { ...item, checked: !item.checked } : item
    );
    updateListMutation.mutate({ id: groceryList.id, items: updated });
  }

  function addListItem() {
    if (!groceryList || !newListItemName.trim()) return;
    const updated = [
      ...groceryList.items,
      {
        name: newListItemName.trim(),
        quantity: newListItemQty,
        unit: newListItemUnit,
        checked: false,
      },
    ];
    updateListMutation.mutate({ id: groceryList.id, items: updated });
    setNewListItemName('');
    setNewListItemQty('1');
    setNewListItemUnit('');
  }

  // Meal suggestions
  async function handleSuggestMeals() {
    setSuggestLoading(true);
    setSuggestions([]);
    try {
      const pantryNames = pantry.slice(0, 10).map(p => p.item_name);
      const result = await apiRequest<{ suggestions: MealSuggestion[] }>(
        '/api/grocery/suggest-meals',
        {
          method: 'POST',
          body: JSON.stringify({ pantry_items: pantryNames }),
        }
      );
      setSuggestions(result.suggestions);
    } finally {
      setSuggestLoading(false);
    }
  }

  // Expiry alerts
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiredItems = pantry.filter(
    p => p.expiry_date && daysUntilExpiry(p.expiry_date) < 0
  );
  const expiringItems = pantry.filter(
    p => p.expiry_date && daysUntilExpiry(p.expiry_date) >= 0 && daysUntilExpiry(p.expiry_date) <= 7
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-ink">Smart Kitchen</h1>
          <p className="text-surface-muted text-sm mt-1">
            Track your pantry, manage your shopping list, and get AI meal ideas.
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface-sunk rounded-xl p-1">
        {(['pantry', 'shopping', 'recipes'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-sm py-2 px-3 rounded-lg font-medium transition-all ${
              tab === t
                ? 'bg-white text-brand-indigo shadow-sm'
                : 'text-surface-muted hover:text-surface-ink'
            }`}
          >
            {t === 'pantry' ? '🥫 Pantry' : t === 'shopping' ? '🛒 Shopping List' : '👨‍🍳 Recipes'}
          </button>
        ))}
      </div>

      {/* --- PANTRY TAB --- */}
      {tab === 'pantry' && (
        <div className="space-y-4">
          {/* Expiry alerts */}
          {expiredItems.length > 0 && (
            <div className="card border-2 border-red-400 bg-red-50">
              <div className="font-semibold text-red-700 mb-2">🚫 Expired Items ({expiredItems.length})</div>
              <div className="space-y-1">
                {expiredItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-red-700 font-medium">{item.item_name}</span>
                    <span className="text-red-500 text-xs">
                      Expired {Math.abs(daysUntilExpiry(item.expiry_date!))}d ago
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {expiringItems.length > 0 && (
            <div className="card border-2 border-amber-400 bg-amber-50">
              <div className="font-semibold text-amber-700 mb-2">⚠ Expiring Soon ({expiringItems.length})</div>
              <div className="space-y-1">
                {expiringItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-amber-700 font-medium">{item.item_name}</span>
                    <span className="text-amber-600 text-xs">
                      {daysUntilExpiry(item.expiry_date!) === 0
                        ? 'Expires today'
                        : `${daysUntilExpiry(item.expiry_date!)}d left`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setShowPantryForm(s => !s)}
              className="btn-primary text-sm"
            >
              + Add Item
            </button>
          </div>

          {showPantryForm && (
            <div className="card border-brand-indigo/30">
              <h3 className="font-semibold text-surface-ink mb-3">Add Pantry Item</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Item name *</label>
                  <input
                    className="input"
                    placeholder="e.g. Brown rice"
                    value={pantryName}
                    onChange={e => setPantryName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select
                    className="input"
                    value={pantryCategory}
                    onChange={e => setPantryCategory(e.target.value)}
                  >
                    {CATEGORY_OPTIONS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Quantity</label>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    step="0.1"
                    value={pantryQty}
                    onChange={e => setPantryQty(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Unit (optional)</label>
                  <input
                    className="input"
                    placeholder="e.g. lbs, oz, cups"
                    value={pantryUnit}
                    onChange={e => setPantryUnit(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Expiry date (optional)</label>
                  <input
                    type="date"
                    className="input"
                    value={pantryExpiry}
                    onChange={e => setPantryExpiry(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() =>
                    addPantryMutation.mutate({
                      item_name: pantryName,
                      category: pantryCategory,
                      quantity: parseFloat(pantryQty) || 1,
                      ...(pantryUnit ? { unit: pantryUnit } : {}),
                      ...(pantryExpiry ? { expiry_date: pantryExpiry } : {}),
                    })
                  }
                  disabled={!pantryName.trim() || addPantryMutation.isPending}
                  className="btn-primary text-sm"
                >
                  {addPantryMutation.isPending ? 'Saving…' : 'Add to Pantry'}
                </button>
                <button onClick={() => setShowPantryForm(false)} className="btn-secondary text-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {pantryLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="card animate-pulse flex gap-3">
                  <div className="flex-1">
                    <div className="h-4 bg-surface-sunk rounded w-1/2 mb-2" />
                    <div className="h-3 bg-surface-sunk rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : pantry.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-5xl mb-3">🥫</div>
              <p className="font-medium text-surface-ink">Your pantry is empty</p>
              <p className="text-sm text-surface-muted mt-1">Add items to track what you have on hand.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pantry.map(item => (
                <div key={item.id} className="card flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-surface-ink">{item.item_name}</div>
                    <div className="flex flex-wrap gap-2 mt-1 items-center">
                      <span className="text-sm text-surface-muted">
                        {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                      </span>
                      {item.category && (
                        <span className="chip text-xs">{item.category}</span>
                      )}
                      {item.expiry_date && (
                        <span className={`text-xs ${expiryColor(item.expiry_date)}`}>
                          Exp: {new Date(item.expiry_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deletePantryMutation.mutate(item.id)}
                    disabled={deletePantryMutation.isPending}
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

      {/* --- SHOPPING LIST TAB --- */}
      {tab === 'shopping' && (
        <div className="space-y-4">
          {listLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="card animate-pulse flex gap-3">
                  <div className="w-4 h-4 rounded bg-surface-sunk flex-shrink-0" />
                  <div className="h-4 bg-surface-sunk rounded flex-1" />
                </div>
              ))}
            </div>
          ) : !groceryList ? (
            <div className="card text-center py-8 text-surface-muted">
              <div className="text-4xl mb-2">🛒</div>
              <p>No shopping list found. One will be created automatically.</p>
            </div>
          ) : (
            <>
              {groceryList.items.length === 0 ? (
                <div className="card text-center py-10">
                  <div className="text-4xl mb-2">🛒</div>
                  <p className="font-medium text-surface-ink">Your list is empty</p>
                  <p className="text-sm text-surface-muted mt-1">Add items below to build your shopping list.</p>
                </div>
              ) : (
                <div className="card space-y-2">
                  {groceryList.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => toggleListItem(i)}
                        className="w-4 h-4 accent-brand-indigo cursor-pointer"
                      />
                      <span
                        className={`flex-1 text-sm ${
                          item.checked ? 'line-through text-surface-muted' : 'text-surface-ink'
                        }`}
                      >
                        {item.name}
                        {(item.quantity || item.unit) && (
                          <span className="text-surface-muted ml-1.5">
                            ({item.quantity}{item.unit ? ` ${item.unit}` : ''})
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Add to list */}
              <div className="card border-brand-indigo/20">
                <div className="text-xs font-semibold text-surface-muted uppercase tracking-wide mb-2">
                  Add to List
                </div>
                <div className="flex gap-2 flex-wrap">
                  <input
                    className="input flex-1 min-w-[160px]"
                    placeholder="Item name"
                    value={newListItemName}
                    onChange={e => setNewListItemName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addListItem()}
                  />
                  <input
                    className="input w-20"
                    placeholder="Qty"
                    value={newListItemQty}
                    onChange={e => setNewListItemQty(e.target.value)}
                  />
                  <input
                    className="input w-24"
                    placeholder="Unit"
                    value={newListItemUnit}
                    onChange={e => setNewListItemUnit(e.target.value)}
                  />
                  <button
                    onClick={addListItem}
                    disabled={!newListItemName.trim() || updateListMutation.isPending}
                    className="btn-primary text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>

              <button
                onClick={() => setTab('recipes')}
                className="btn-secondary text-sm w-full"
              >
                ✨ AI Suggest Meals from Pantry
              </button>
            </>
          )}
        </div>
      )}

      {/* --- RECIPES TAB --- */}
      {tab === 'recipes' && (
        <div className="space-y-4">
          <div className="card text-center py-6">
            <div className="text-4xl mb-3">👨‍🍳</div>
            <p className="text-sm text-surface-muted mb-4">
              Generate meal ideas based on the top 10 items in your pantry.
            </p>
            <button
              onClick={handleSuggestMeals}
              disabled={suggestLoading || pantry.length === 0}
              className="btn-primary"
            >
              {suggestLoading ? '✨ Generating suggestions…' : '✨ Suggest Recipes from Pantry'}
            </button>
            {pantry.length === 0 && (
              <p className="text-xs text-surface-muted mt-2">Add items to your pantry first.</p>
            )}
          </div>

          {suggestLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="card animate-pulse">
                  <div className="h-5 bg-surface-sunk rounded w-1/2 mb-3" />
                  <div className="h-3 bg-surface-sunk rounded w-full mb-2" />
                  <div className="h-3 bg-surface-sunk rounded w-4/5" />
                </div>
              ))}
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="space-y-3">
              {suggestions.map((recipe, i) => (
                <div key={i} className="card">
                  <button
                    className="flex items-center justify-between w-full text-left"
                    onClick={() =>
                      setExpandedRecipe(expandedRecipe === recipe.name ? null : recipe.name)
                    }
                  >
                    <div className="font-semibold text-surface-ink">{recipe.name}</div>
                    <span className="text-surface-muted text-sm">
                      {expandedRecipe === recipe.name ? '▲' : '▼'}
                    </span>
                  </button>
                  {expandedRecipe === recipe.name && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <div className="text-xs font-semibold text-surface-muted uppercase tracking-wide mb-1">
                          Ingredients
                        </div>
                        <ul className="space-y-0.5">
                          {recipe.ingredients.map((ing, j) => (
                            <li key={j} className="text-sm text-surface-ink flex gap-2">
                              <span className="text-brand-indigo">•</span>
                              {ing}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-surface-muted uppercase tracking-wide mb-1">
                          Instructions
                        </div>
                        <p className="text-sm text-surface-ink leading-relaxed">
                          {recipe.instructions}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
