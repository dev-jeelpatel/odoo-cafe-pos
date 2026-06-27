'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Sidebar from '@/components/ui/Sidebar';
import { useSidebar } from '@/contexts/SidebarContext';
import api from '@/lib/api';
import clsx from 'clsx';
import { Plus, Edit2, Trash2, ChefHat } from 'lucide-react';
import toast from 'react-hot-toast';

function RecipeModal({ product, onClose, onSaved }: any) {
  const [ingredients, setIngredients] = useState<any[]>(product.recipe?.ingredients?.map((i: any) => ({ inventoryItemId: i.inventoryItemId, quantity: i.quantity, unit: i.unit, notes: i.notes })) ?? [{ inventoryItemId: '', quantity: 1, unit: 'G', notes: '' }]);
  const [saving, setSaving] = useState(false);
  const { data: itemsData } = useQuery({ queryKey: ['inventory-items'], queryFn: () => api.get('/inventory/items').then(r => r.data) });
  const items = itemsData?.items ?? [];

  const addLine = () => setIngredients(l => [...l, { inventoryItemId: '', quantity: 1, unit: 'G', notes: '' }]);
  const removeLine = (i: number) => setIngredients(l => l.filter((_, idx) => idx !== i));
  const setLine = (i: number, k: string, v: any) => setIngredients(l => l.map((line, idx) => idx === i ? { ...line, [k]: v } : line));

  const save = async () => {
    if (ingredients.some(i => !i.inventoryItemId)) return toast.error('All ingredients need an item selected');
    setSaving(true);
    try {
      await api.post('/recipes', { productId: product.id, name: `${product.name} Recipe`, yield: 1, ingredients });
      toast.success('Recipe saved');
      onSaved();
    } catch (e: any) { toast.error(e.response?.data?.message ?? 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex items-center gap-3">
          <ChefHat size={20} className="text-indigo-600" />
          <h2 className="text-lg font-bold">Recipe: {product.name}</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr><th className="text-left px-3 py-2 text-xs">Ingredient</th><th className="text-left px-3 py-2 text-xs">Quantity</th><th className="text-left px-3 py-2 text-xs">Unit</th><th className="text-left px-3 py-2 text-xs">Notes</th><th></th></tr>
              </thead>
              <tbody>
                {ingredients.map((ing, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-2 py-1.5">
                      <select className="input text-xs" value={ing.inventoryItemId} onChange={e => { const item = items.find((it: any) => it.id === e.target.value); setLine(i, 'inventoryItemId', e.target.value); if (item) setLine(i, 'unit', item.unit); }}>
                        <option value="">Select ingredient</option>
                        {items.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5"><input type="number" className="input text-xs w-20" value={ing.quantity} onChange={e => setLine(i, 'quantity', parseFloat(e.target.value) || 0)} /></td>
                    <td className="px-2 py-1.5"><input className="input text-xs w-16" value={ing.unit} onChange={e => setLine(i, 'unit', e.target.value)} /></td>
                    <td className="px-2 py-1.5"><input className="input text-xs" value={ing.notes} onChange={e => setLine(i, 'notes', e.target.value)} placeholder="optional" /></td>
                    <td className="px-2 py-1.5"><button onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={addLine} className="text-sm text-indigo-600 hover:underline flex items-center gap-1"><Plus size={14} /> Add Ingredient</button>
        </div>
        <div className="p-5 border-t flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save Recipe'}</button>
        </div>
      </div>
    </div>
  );
}

export default function RecipesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { collapsed } = useSidebar();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState('');

  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products').then(r => r.data) });
  const { data: recipes } = useQuery({ queryKey: ['recipes'], queryFn: () => api.get('/recipes').then(r => r.data) });

  const recipeMap = Object.fromEntries((recipes ?? []).map((r: any) => [r.productId, r]));

  const filtered = (products ?? [])
    .filter((p: any) => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a: any, b: any) => {
      const catA = a.category?.name ?? '';
      const catB = b.category?.name ?? '';
      if (catA !== catB) return catA.localeCompare(catB);
      return a.name.localeCompare(b.name);
    });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['recipes'] }); setEditing(null); };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={clsx('flex-1 flex flex-col min-w-0 transition-all duration-300', collapsed ? 'lg:ml-20' : 'lg:ml-64')}>
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Recipe Management</h1>
            <p className="text-sm text-gray-500">
              Link products to ingredients for automatic stock deduction
              {products && (
                <span className="ml-2 text-indigo-600 font-medium">
                  · {(products as any[]).filter(p => recipeMap[p.id]).length}/{(products as any[]).length} recipes set
                </span>
              )}
            </p>
          </div>
        </header>
        <div className="bg-white border-b border-gray-100 px-6 py-3">
          <input className="input w-64 text-sm" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>{['Product', 'Category', 'Price', 'Recipe Status', 'Ingredients', 'Action'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered?.map((p: any) => {
                  const recipe = recipeMap[p.id];
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500">{p.category?.name}</td>
                      <td className="px-4 py-3">₹{p.price}</td>
                      <td className="px-4 py-3">
                        {recipe ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Recipe Set</span>
                          : <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">No Recipe</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{recipe ? `${recipe.ingredients?.length} ingredients` : '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setEditing({ ...p, recipe })} className="btn-secondary text-xs py-1 px-3 flex items-center gap-1"><ChefHat size={12} />{recipe ? 'Edit Recipe' : 'Add Recipe'}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {editing && <RecipeModal product={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  );
}
