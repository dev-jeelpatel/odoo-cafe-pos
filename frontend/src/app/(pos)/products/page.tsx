'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Product, Category } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import Modal from '@/components/ui/Modal';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const UNITS = [{ value: 'PIECE', label: 'Per Piece' }, { value: 'KG', label: 'Per KG' }, { value: 'LITER', label: 'Per Liter' }];

export default function ProductsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', categoryId: '', price: '', unit: 'PIECE', tax: '0', description: '' });

  const { data: products = [], isLoading } = useQuery<Product[]>({ queryKey: ['products'], queryFn: () => api.get('/products', { params: { all: 'true' } }).then(r => r.data) });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) });

  const openCreate = () => { setEditing(null); setForm({ name: '', categoryId: '', price: '', unit: 'PIECE', tax: '0', description: '' }); setModal(true); };
  const openEdit = (p: Product) => { setEditing(p); setForm({ name: p.name, categoryId: p.categoryId, price: String(p.price), unit: p.unit, tax: String(p.tax), description: p.description }); setModal(true); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/products/${editing.id}`, form);
      else await api.post('/products', form);
      qc.invalidateQueries({ queryKey: ['products'] });
      setModal(false);
      toast.success(editing ? 'Product updated' : 'Product created');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const del = async (id: string) => {
    if (!confirm('Remove this product?')) return;
    await api.delete(`/products/${id}`);
    qc.invalidateQueries({ queryKey: ['products'] });
    toast.success('Product removed');
  };

  return (
    <PageLayout title="Products" actions={<button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={16} />Add Product</button>}>
      {isLoading ? <p className="text-center text-gray-400 py-12">Loading...</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(p => (
            <div key={p.id} className={`card hover:shadow-md transition-shadow ${!p.active ? 'opacity-50' : ''}`}>
              <div className="h-1.5 w-full rounded-full mb-3" style={{ backgroundColor: p.category?.color || '#6366f1' }} />
              <h3 className="font-semibold text-gray-900">{p.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{p.category?.name} · {p.unit.toLowerCase()}</p>
              <div className="flex items-center justify-between mt-3">
                <div>
                  <span className="text-indigo-600 font-bold text-lg">₹{p.price}</span>
                  {p.tax > 0 && <span className="text-xs text-gray-400 ml-1">+{p.tax}% tax</span>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600"><Pencil size={14} /></button>
                  <button onClick={() => del(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Product' : 'Add Product'}>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <select required value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))} className="input">
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Price (₹) *</label>
              <input required type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tax (%)</label>
              <input type="number" min="0" max="100" value={form.tax} onChange={e => setForm(p => ({ ...p, tax: e.target.value }))} className="input" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Unit</label>
            <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} className="input">
              {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input resize-none" rows={2} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
}
