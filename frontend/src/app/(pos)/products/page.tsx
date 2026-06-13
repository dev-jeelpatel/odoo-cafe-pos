'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Product, Category } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import Modal from '@/components/ui/Modal';
import { Plus, Pencil, Trash2, LayoutList, LayoutGrid, Search, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const UNITS = ['PIECE', 'KG', 'LITER'] as const;
const PRESET_COLORS = ['#6366f1','#ef4444','#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6','#14b8a6','#f97316','#06b6d4'];

export default function ProductsPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<'list'|'grid'>(() => (typeof window !== 'undefined' && (localStorage.getItem('prod-view') as any)) || 'list');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', categoryId: '', price: '', tax: '5', unit: 'PIECE', description: '', active: true });
  const [catInput, setCatInput] = useState('');
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [newCatColor, setNewCatColor] = useState('#6366f1');
  const [creatingCat, setCreatingCat] = useState(false);

  const { data: products = [], isLoading } = useQuery<Product[]>({ queryKey: ['products'], queryFn: () => api.get('/products').then(r => r.data) });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) });

  const setViewPref = (v: 'list'|'grid') => { setView(v); localStorage.setItem('prod-view', v); };

  const filtered = products.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.category?.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', categoryId: '', price: '', tax: '5', unit: 'PIECE', description: '', active: true });
    setCatInput(''); setShowCatDropdown(false); setNewCatColor('#6366f1');
    setModal(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, categoryId: p.categoryId, price: String(p.price), tax: String(p.tax), unit: p.unit, description: p.description, active: p.active });
    const cat = categories.find(c => c.id === p.categoryId);
    setCatInput(cat?.name || '');
    setShowCatDropdown(false);
    setModal(true);
  };

  const quickCreateCategory = async () => {
    if (!catInput.trim()) return;
    setCreatingCat(true);
    try {
      const { data } = await api.post('/categories', { name: catInput.trim(), color: newCatColor });
      qc.invalidateQueries({ queryKey: ['categories'] });
      setForm(p => ({ ...p, categoryId: data.id }));
      setShowCatDropdown(false);
      toast.success(`Category "${data.name}" created & selected`);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setCreatingCat(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryId) { toast.error('Select or create a category'); return; }
    const payload = { ...form, price: parseFloat(form.price), tax: parseFloat(form.tax) };
    try {
      if (editing) await api.put(`/products/${editing.id}`, payload);
      else await api.post('/products', payload);
      qc.invalidateQueries({ queryKey: ['products'] });
      setModal(false);
      toast.success(editing ? 'Product updated' : 'Product created');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await api.delete(`/products/${id}`);
    qc.invalidateQueries({ queryKey: ['products'] });
    toast.success('Deleted');
  };

  const matchingCats = catInput ? categories.filter(c => c.name.toLowerCase().includes(catInput.toLowerCase())) : categories;
  const exactMatch = categories.find(c => c.name.toLowerCase() === catInput.toLowerCase());

  return (
    <PageLayout title="Products" actions={
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="input pl-8 py-2 text-sm w-56" />
        </div>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          <button onClick={() => setViewPref('list')} className={`p-2 transition-colors ${view === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><LayoutList size={16} /></button>
          <button onClick={() => setViewPref('grid')} className={`p-2 transition-colors ${view === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><LayoutGrid size={16} /></button>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={16} />Add Product</button>
      </div>
    }>
      {isLoading ? <p className="text-center text-gray-400 py-12">Loading...</p> :
       filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No products found</p>
          <p className="text-sm mt-1">{search ? 'Try a different search term.' : 'Create your first product.'}</p>
        </div>
      ) : view === 'list' ? (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Product</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Price</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Unit</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Tax</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => (
                <tr key={p.id} className={clsx('hover:bg-gray-50', !p.active && 'opacity-50')}>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">
                    {p.category && <span className="flex items-center gap-1.5 text-gray-600"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.category.color }} />{p.category.name}</span>}
                  </td>
                  <td className="px-4 py-3 font-semibold">₹{p.price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-500">{p.unit}</td>
                  <td className="px-4 py-3 text-gray-500">{p.tax}%</td>
                  <td className="px-4 py-3"><span className={`badge ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600"><Pencil size={14} /></button>
                      <button onClick={() => del(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(p => (
            <div key={p.id} className={clsx('card hover:shadow-md transition-shadow', !p.active && 'opacity-50')}>
              <div className="flex items-center justify-between mb-2">
                {p.category && <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.category.color }} />{p.category.name}</span>}
                <span className={`badge text-xs ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.active ? 'Active' : 'Off'}</span>
              </div>
              <p className="font-semibold text-gray-900 truncate">{p.name}</p>
              <p className="text-indigo-600 font-bold mt-1">₹{p.price.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{p.unit} · Tax {p.tax}%</p>
              <div className="flex gap-1 mt-3 justify-end">
                <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600"><Pencil size={14} /></button>
                <button onClick={() => del(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => { setModal(false); setShowCatDropdown(false); }} title={editing ? 'Edit Product' : 'Add Product'}>
        <form onSubmit={submit} className="space-y-3">
          <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Product name" className="input" />

          {/* Smart Category Field */}
          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <div className="relative">
              <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
              <input
                value={catInput}
                onChange={e => { setCatInput(e.target.value); setForm(p => ({ ...p, categoryId: '' })); setShowCatDropdown(true); }}
                onFocus={() => setShowCatDropdown(true)}
                onBlur={() => setTimeout(() => setShowCatDropdown(false), 200)}
                placeholder="Search or create category..."
                className="input pl-8"
                autoComplete="off"
              />
            </div>
            {showCatDropdown && (
              <div className="relative">
                <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto">
                  {matchingCats.map(c => (
                    <button key={c.id} type="button" onMouseDown={() => { setForm(p => ({ ...p, categoryId: c.id })); setCatInput(c.name); setShowCatDropdown(false); }}
                      className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 text-sm text-left">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />{c.name}
                    </button>
                  ))}
                  {catInput && !exactMatch && (
                    <div className="border-t border-gray-100 p-2 space-y-1.5">
                      <p className="text-xs text-gray-500 px-1">Create new category:</p>
                      <div className="flex flex-wrap gap-1 px-1">
                        {PRESET_COLORS.map(color => (
                          <button key={color} type="button" onMouseDown={() => setNewCatColor(color)} className={`w-5 h-5 rounded-full border-2 ${newCatColor === color ? 'border-gray-800 scale-110' : 'border-transparent'}`} style={{ backgroundColor: color }} />
                        ))}
                      </div>
                      <button type="button" onMouseDown={quickCreateCategory} disabled={creatingCat}
                        className="w-full text-left px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm rounded-lg font-medium flex items-center gap-2 disabled:opacity-50">
                        <Plus size={13} />{creatingCat ? 'Creating...' : `Create "${catInput}"`}
                      </button>
                    </div>
                  )}
                  {matchingCats.length === 0 && !catInput && <p className="text-center text-gray-400 text-sm py-3">No categories yet</p>}
                </div>
              </div>
            )}
            {form.categoryId && <p className="text-xs text-green-600 mt-1 flex items-center gap-1">✓ {catInput}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Price (₹) *</label>
              <input required type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="0.00" className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tax (%)</label>
              <input type="number" min="0" max="100" value={form.tax} onChange={e => setForm(p => ({ ...p, tax: e.target.value }))} className="input" />
            </div>
          </div>
          <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} className="input">
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional)" className="input resize-none h-20" />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} className="w-4 h-4 accent-indigo-600" /> Active (visible in POS)
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
}
