'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Category } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import Modal from '@/components/ui/Modal';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const PRESET_COLORS = ['#6366f1','#ef4444','#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6','#14b8a6','#f97316','#06b6d4'];

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', color: '#6366f1' });

  const { data: categories = [], isLoading } = useQuery<Category[]>({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) });

  const openCreate = () => { setEditing(null); setForm({ name: '', color: '#6366f1' }); setModal(true); };
  const openEdit = (c: Category) => { setEditing(c); setForm({ name: c.name, color: c.color }); setModal(true); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/categories/${editing._id}`, form);
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
    toast.success('Category deleted');
  };

  return (
    <PageLayout title="Categories" actions={<button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={16} />Add Category</button>}>
      {isLoading ? <p className="text-center text-gray-400 py-12">Loading...</p> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {categories.map(c => (
            <div key={c._id} className="card flex flex-col items-center gap-3 py-5 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-md" style={{ backgroundColor: c.color }}>
                {c.name[0].toUpperCase()}
              </div>
              <p className="font-semibold text-gray-800 text-center">{c.name}</p>
              <div className="flex gap-1">
                <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600"><Pencil size={14} /></button>
                <button onClick={() => del(c._id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>
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
