'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Promotion, Product } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import Modal from '@/components/ui/Modal';
import { Plus, Pencil, Trash2, Percent } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PromotionsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState({ name: '', type: 'order', conditionProduct: '', conditionQty: '', conditionOrderValue: '', discountType: 'percentage', discountValue: '', isActive: true });

  const { data: promotions = [] } = useQuery<Promotion[]>({ queryKey: ['promotions'], queryFn: () => api.get('/promotions').then(r => r.data) });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ['products'], queryFn: () => api.get('/products').then(r => r.data) });

  const openCreate = () => { setEditing(null); setForm({ name: '', type: 'order', conditionProduct: '', conditionQty: '', conditionOrderValue: '', discountType: 'percentage', discountValue: '', isActive: true }); setModal(true); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: form.name, type: form.type,
      discountType: form.discountType, discountValue: parseFloat(form.discountValue),
      isActive: form.isActive,
    };
    if (form.type === 'product') { payload.conditionProduct = form.conditionProduct; payload.conditionQty = parseInt(form.conditionQty); }
    else { payload.conditionOrderValue = parseFloat(form.conditionOrderValue); }
    try {
      if (editing) await api.put(`/promotions/${editing._id}`, payload);
      else await api.post('/promotions', payload);
      qc.invalidateQueries({ queryKey: ['promotions'] });
      setModal(false);
      toast.success(editing ? 'Updated' : 'Created');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  return (
    <PageLayout title="Promotions" actions={<button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={16} />Add Promotion</button>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {promotions.map(p => (
          <div key={p._id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-900">{p.name}</h3>
                <span className={`badge mt-1 ${p.type === 'product' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{p.type === 'product' ? 'Product-based' : 'Order-based'}</span>
              </div>
              <span className={`badge ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.isActive ? 'Active' : 'Off'}</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {p.type === 'product' ? `Buy ${p.conditionQty}+ of ${(p.conditionProduct as Product)?.name}` : `Order ≥ ₹${p.conditionOrderValue}`} → {p.discountType === 'percentage' ? `${p.discountValue}%` : `₹${p.discountValue}`} off
            </p>
            <div className="flex gap-2 mt-3 justify-end">
              <button onClick={() => { setEditing(p); setForm({ name: p.name, type: p.type, conditionProduct: (p.conditionProduct as Product)?._id || '', conditionQty: String(p.conditionQty || ''), conditionOrderValue: String(p.conditionOrderValue || ''), discountType: p.discountType, discountValue: String(p.discountValue), isActive: p.isActive }); setModal(true); }} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600"><Pencil size={14} /></button>
              <button onClick={async () => { await api.delete(`/promotions/${p._id}`); qc.invalidateQueries({ queryKey: ['promotions'] }); toast.success('Deleted'); }} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Promotion' : 'Add Promotion'}>
        <form onSubmit={submit} className="space-y-3">
          <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Promotion name" className="input" />
          <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="input">
            <option value="order">Order-based (min order value)</option>
            <option value="product">Product-based (min quantity)</option>
          </select>
          {form.type === 'order' ? (
            <input required type="number" min="0" value={form.conditionOrderValue} onChange={e => setForm(p => ({ ...p, conditionOrderValue: e.target.value }))} placeholder="Minimum order value (₹)" className="input" />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <select required value={form.conditionProduct} onChange={e => setForm(p => ({ ...p, conditionProduct: e.target.value }))} className="input">
                <option value="">Select product</option>
                {products.map(pr => <option key={pr._id} value={pr._id}>{pr.name}</option>)}
              </select>
              <input required type="number" min="1" value={form.conditionQty} onChange={e => setForm(p => ({ ...p, conditionQty: e.target.value }))} placeholder="Min qty" className="input" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <select value={form.discountType} onChange={e => setForm(p => ({ ...p, discountType: e.target.value }))} className="input">
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed (₹)</option>
            </select>
            <input required type="number" min="0" value={form.discountValue} onChange={e => setForm(p => ({ ...p, discountValue: e.target.value }))} placeholder="Discount value" className="input" />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
            Active
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
