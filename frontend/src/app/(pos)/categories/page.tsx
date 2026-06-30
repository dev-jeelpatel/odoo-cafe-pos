'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Category, Product } from '@/types';
import api from '@/lib/api';
import { SkeletonCardGrid } from '@/components/ui/Skeleton';
import PageLayout from '@/components/ui/PageLayout';
import Modal from '@/components/ui/Modal';
import { Plus, Pencil, Trash2, LayoutList, LayoutGrid, Search, Tag, Package, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import clsx from 'clsx';
import { getProductEmoji } from '@/lib/productVisuals';

const PRESET_COLORS = ['#6366f1','#ef4444','#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6','#14b8a6','#f97316','#06b6d4','#84cc16','#64748b'];

interface CategoryWithCount extends Category { _count?: { products: number }; createdAt?: string; }

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<'list'|'grid'>(() => (typeof window !== 'undefined' && (localStorage.getItem('cat-view') as any)) || 'list');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<CategoryWithCount | null>(null);
  const [form, setForm] = useState({ name: '', color: '#6366f1' });
  const [saving, setSaving] = useState(false);

  const { data: categories = [], isLoading } = useQuery<CategoryWithCount[]>({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ['products'], queryFn: () => api.get('/products').then(r => r.data) });

  const productCount = (catId: string) => products.filter(p => p.categoryId === catId).length;

  const filtered = categories
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const emptyCount = categories.filter(c => productCount(c.id) === 0).length;

  const setViewPref = (v: 'list'|'grid') => { setView(v); localStorage.setItem('cat-view', v); };

  const openCreate = () => { setEditing(null); setForm({ name: '', color: '#6366f1' }); setModal(true); };
  const openEdit = (c: CategoryWithCount) => { setEditing(c); setForm({ name: c.name, color: c.color }); setModal(true); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) { toast.error('Category name is required'); return; }
    setSaving(true);
    try {
      if (editing) await api.put(`/categories/${editing.id}`, { ...form, name });
      else await api.post('/categories', { ...form, name });
      qc.invalidateQueries({ queryKey: ['categories'] });
      setModal(false);
      toast.success(editing ? 'Category updated' : 'Category created');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error saving category'); }
    finally { setSaving(false); }
  };

  const del = async (c: CategoryWithCount) => {
    const count = productCount(c.id);
    if (count > 0) {
      toast.error(`Can't delete "${c.name}" — ${count} product${count !== 1 ? 's' : ''} still use this category.`);
      return;
    }
    if (!confirm(`Delete category "${c.name}"?`)) return;
    try {
      await api.delete(`/categories/${c.id}`);
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error deleting category'); }
  };

  return (
    <PageLayout title="Categories" actions={
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search categories..." className="input pl-8 py-2 text-sm w-48" />
        </div>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          <button onClick={() => setViewPref('list')} className={`p-2 transition-colors ${view === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><LayoutList size={16} /></button>
          <button onClick={() => setViewPref('grid')} className={`p-2 transition-colors ${view === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><LayoutGrid size={16} /></button>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={16} />Add Category</button>
      </div>
    }>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl"><Tag size={20} /></div>
          <div>
            <p className="text-xs text-gray-500">Total Categories</p>
            <p className="text-xl font-bold text-gray-900">{categories.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-green-50 text-green-600 p-2.5 rounded-xl"><Package size={20} /></div>
          <div>
            <p className="text-xs text-gray-500">Total Products</p>
            <p className="text-xl font-bold text-gray-900">{products.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 py-4 col-span-2 sm:col-span-1 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-amber-50 text-amber-600 p-2.5 rounded-xl"><Tag size={20} /></div>
          <div>
            <p className="text-xs text-gray-500">Empty Categories</p>
            <p className="text-xl font-bold text-gray-900">{emptyCount}</p>
          </div>
        </div>
      </div>

      {isLoading ? <SkeletonCardGrid count={8} /> :
       filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Tag size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">{search ? 'No categories match your search' : 'No categories found'}</p>
          <p className="text-sm mt-1 mb-4">{search ? 'Try a different search term.' : 'Create your first category to start organizing products.'}</p>
          {!search && (
            <button onClick={openCreate} className="btn-primary inline-flex items-center gap-2"><Plus size={16} />Add Category</button>
          )}
        </div>
      ) : view === 'list' ? (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Products</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Color</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Created</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => {
                const count = productCount(c.id);
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shadow-sm transition-transform group-hover:scale-110" style={{ backgroundColor: c.color + '1a' }}>{getProductEmoji(c.name, c.name)}</div>
                        <span className="font-medium text-gray-800 group-hover:text-indigo-700 transition-colors">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('text-xs font-medium px-2 py-1 rounded-full transition-colors', count > 0 ? 'bg-indigo-50 text-indigo-700 group-hover:bg-indigo-100' : 'bg-gray-100 text-gray-400')}>
                        {count} product{count !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <span className="w-3.5 h-3.5 rounded-full border border-gray-200 transition-transform group-hover:scale-125" style={{ backgroundColor: c.color }} />
                        {c.color}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.createdAt ? format(new Date(c.createdAt), 'dd MMM yyyy') : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-indigo-50 hover:scale-110 rounded-lg text-indigo-600 transition-all" title="Edit"><Pencil size={14} /></button>
                        <button onClick={() => del(c)} className={clsx('p-1.5 rounded-lg transition-all', count > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50 hover:scale-110')} title={count > 0 ? 'Reassign products before deleting' : 'Delete'}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filtered.map(c => {
            const count = productCount(c.id);
            return (
              <div key={c.id} className="card flex flex-col items-center gap-3 py-5 hover:shadow-lg hover:-translate-y-1 hover:border-indigo-200 transition-all group relative cursor-pointer" onClick={() => openEdit(c)}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-md transition-transform group-hover:scale-110 group-hover:rotate-3" style={{ backgroundColor: c.color + '1a' }}>{getProductEmoji(c.name, c.name)}</div>
                <p className="font-semibold text-gray-800 text-center text-sm group-hover:text-indigo-700 transition-colors">{c.name}</p>
                <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full transition-colors', count > 0 ? 'bg-indigo-50 text-indigo-700 group-hover:bg-indigo-100' : 'bg-gray-100 text-gray-400')}>
                  {count} product{count !== 1 ? 's' : ''}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => { e.stopPropagation(); openEdit(c); }} className="p-1.5 hover:bg-indigo-50 hover:scale-110 rounded-lg text-indigo-600 transition-all" title="Edit"><Pencil size={14} /></button>
                  <button onClick={e => { e.stopPropagation(); del(c); }} className={clsx('p-1.5 rounded-lg transition-all', count > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50 hover:scale-110')} title={count > 0 ? 'Reassign products before deleting' : 'Delete'}><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={submit} className="space-y-5">
          {/* Live preview */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-md flex-shrink-0" style={{ backgroundColor: form.color + '1a' }}>
              {getProductEmoji(form.name.trim(), form.name.trim())}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400">Preview</p>
              <p className="font-semibold text-gray-800 truncate">{form.name.trim() || 'Category name'}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              required
              maxLength={40}
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="input"
              placeholder="e.g. Pizza, Burgers"
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{form.name.length}/40</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Color</label>
            <div className="flex flex-wrap gap-2.5 mb-3">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, color }))}
                  className={clsx(
                    'w-9 h-9 rounded-full transition-all flex items-center justify-center hover:shadow-md',
                    form.color.toLowerCase() === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'
                  )}
                  style={{ backgroundColor: color }}
                >
                  {form.color.toLowerCase() === color && <Check size={16} className="text-white" />}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer p-1" />
              <input
                value={form.color}
                onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                className="input flex-1 font-mono text-sm uppercase"
                placeholder="#6366F1"
                maxLength={7}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
}
