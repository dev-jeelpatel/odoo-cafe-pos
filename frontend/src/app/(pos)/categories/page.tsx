'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Category, Product } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import Modal from '@/components/ui/Modal';
import { Plus, Pencil, Trash2, LayoutList, LayoutGrid, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const PRESET_COLORS = ['#6366f1','#ef4444','#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6','#14b8a6','#f97316','#06b6d4'];

interface CategoryWithCount extends Category { _count?: { products: number }; createdAt?: string; }

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<'list'|'grid'>(() => (typeof window !== 'undefined' && (localStorage.getItem('cat-view') as any)) || 'list');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<CategoryWithCount | null>(null);
  const [form, setForm] = useState({ name: '', color: '#6366f1' });

  const { data: categories = [], isLoading } = useQuery<CategoryWithCount[]>({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ['products'], queryFn: () => api.get('/products').then(r => r.data) });

  const productCount = (catId: string) => products.filter(p => p.categoryId === catId).length;

  const filtered = categories.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  const setViewPref = (v: 'list'|'grid') => { setView(v); localStorage.setItem('cat-view', v); };

  const openCreate = () => { setEditing(null); setForm({ name: '', color: '#6366f1' }); setModal(true); };
  const openEdit = (c: CategoryWithCount) => { setEditing(c); setForm({ name: c.name, color: c.color }); setModal(true); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/categories/${editing.id}`, form);
      else await api.post('/categories', form);
      qc.invalidateQueries({ queryKey: ['categories'] });
      setModal(false);
      toast.success(editing ? 'Category updated' : 'Category created');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    await api.delete(`/categories/${id}`);
    qc.invalidateQueries({ queryKey: ['categories'] });
    toast.success('Deleted');
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
      {isLoading ? <p className="text-center text-gray-400 py-12">Loading...</p> :
       filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No categories found</p>
          <p className="text-sm mt-1">Create your first category.</p>
        </div>
      ) : view === 'list' ? (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Color</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Products</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: c.color }}>{c.name[0].toUpperCase()}</div>
                  </td>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{productCount(c.id)} products</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600"><Pencil size={14} /></button>
                      <button onClick={() => del(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="card flex flex-col items-center gap-3 py-5 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-md" style={{ backgroundColor: c.color }}>{c.name[0].toUpperCase()}</div>
              <p className="font-semibold text-gray-800 text-center text-sm">{c.name}</p>
              <p className="text-xs text-gray-400">{productCount(c.id)} products</p>
              <div className="flex gap-1">
                <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600"><Pencil size={14} /></button>
                <button onClick={() => del(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input" placeholder="e.g. Pizza, Burgers" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Color</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_COLORS.map(color => (
                <button key={color} type="button" onClick={() => setForm(p => ({ ...p, color }))} className={`w-8 h-8 rounded-full transition-transform ${form.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: color }} />
              ))}
            </div>
            <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
}
