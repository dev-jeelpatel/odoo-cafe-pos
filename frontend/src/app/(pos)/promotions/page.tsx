'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Promotion, Product } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import Modal from '@/components/ui/Modal';
import { Plus, Pencil, Trash2, LayoutList, LayoutGrid } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PromotionsPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<'list'|'grid'>(() => (typeof window !== 'undefined' && (localStorage.getItem('promo-view') as any)) || 'list');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState({ name: '', promotionType: 'ORDER', productId: '', minQuantity: '', minOrderAmount: '', discountType: 'PERCENTAGE', discountValue: '', active: true });

  const { data: promotions = [] } = useQuery<Promotion[]>({ queryKey: ['promotions'], queryFn: () => api.get('/promotions').then(r => r.data) });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ['products'], queryFn: () => api.get('/products').then(r => r.data) });

  const setViewPref = (v: 'list'|'grid') => { setView(v); localStorage.setItem('promo-view', v); };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', promotionType: 'ORDER', productId: '', minQuantity: '', minOrderAmount: '', discountType: 'PERCENTAGE', discountValue: '', active: true });
    setModal(true);
  };

  const openEdit = (p: Promotion) => {
    setEditing(p);
    setForm({
      name: p.name, promotionType: p.promotionType,
      productId: (p.conditionProduct as Product)?.id || '',
      minQuantity: String(p.minQuantity || ''), minOrderAmount: String(p.minOrderAmount || ''),
      discountType: p.discountType, discountValue: String(p.discountValue), active: p.active,
    });
    setModal(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { name: form.name, promotionType: form.promotionType, discountType: form.discountType, discountValue: parseFloat(form.discountValue), active: form.active };
    if (form.promotionType === 'PRODUCT') { payload.productId = form.productId; payload.minQuantity = parseInt(form.minQuantity); }
    else { payload.minOrderAmount = parseFloat(form.minOrderAmount); }
    try {
      if (editing) await api.put(`/promotions/${editing.id}`, payload);
      else await api.post('/promotions', payload);
      qc.invalidateQueries({ queryKey: ['promotions'] });
      setModal(false);
      toast.success(editing ? 'Updated' : 'Created');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const del = async (id: string) => { await api.delete(`/promotions/${id}`); qc.invalidateQueries({ queryKey: ['promotions'] }); toast.success('Deleted'); };

  const describePromo = (p: Promotion) =>
    p.promotionType === 'PRODUCT'
      ? `Buy ${p.minQuantity}+ of ${(p.conditionProduct as Product)?.name || 'product'}`
      : `Order ≥ ₹${p.minOrderAmount}`;

  const describeDiscount = (p: Promotion) =>
    p.discountType === 'PERCENTAGE' ? `${p.discountValue}% off` : `₹${p.discountValue} off`;

  return (
    <PageLayout title="Promotions" actions={
      <div className="flex items-center gap-2">
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          <button onClick={() => setViewPref('list')} className={`p-2 transition-colors ${view === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><LayoutList size={16} /></button>
          <button onClick={() => setViewPref('grid')} className={`p-2 transition-colors ${view === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><LayoutGrid size={16} /></button>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={16} />Add Promotion</button>
      </div>
    }>
      {promotions.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><p className="text-lg font-medium">No promotions yet</p><p className="text-sm mt-1">Create your first promotion.</p></div>
      ) : view === 'list' ? (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Condition</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Discount</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {promotions.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold">{p.name}</td>
                  <td className="px-4 py-3"><span className={`badge ${p.promotionType === 'PRODUCT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{p.promotionType === 'PRODUCT' ? 'Product' : 'Order'}</span></td>
                  <td className="px-4 py-3 text-gray-500">{describePromo(p)}</td>
                  <td className="px-4 py-3 font-semibold text-indigo-700">{describeDiscount(p)}</td>
                  <td className="px-4 py-3"><span className={`badge ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.active ? 'Active' : 'Off'}</span></td>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {promotions.map(p => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{p.name}</h3>
                  <span className={`badge mt-1 ${p.promotionType === 'PRODUCT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {p.promotionType === 'PRODUCT' ? 'Product-based' : 'Order-based'}
                  </span>
                </div>
                <span className={`badge ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.active ? 'Active' : 'Off'}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">{describePromo(p)} → {describeDiscount(p)}</p>
              <div className="flex gap-2 mt-3 justify-end">
                <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600"><Pencil size={14} /></button>
                <button onClick={() => del(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Promotion' : 'Add Promotion'}>
        <form onSubmit={submit} className="space-y-3">
          <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Promotion name" className="input" />
          <select value={form.promotionType} onChange={e => setForm(p => ({ ...p, promotionType: e.target.value }))} className="input">
            <option value="ORDER">Order-based (min order value)</option>
            <option value="PRODUCT">Product-based (min quantity)</option>
          </select>
          {form.promotionType === 'ORDER' ? (
            <input required type="number" min="0" value={form.minOrderAmount} onChange={e => setForm(p => ({ ...p, minOrderAmount: e.target.value }))} placeholder="Minimum order value (₹)" className="input" />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <select required value={form.productId} onChange={e => setForm(p => ({ ...p, productId: e.target.value }))} className="input">
                <option value="">Select product</option>
                {products.map(pr => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
              </select>
              <input required type="number" min="1" value={form.minQuantity} onChange={e => setForm(p => ({ ...p, minQuantity: e.target.value }))} placeholder="Min qty" className="input" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <select value={form.discountType} onChange={e => setForm(p => ({ ...p, discountType: e.target.value }))} className="input">
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED">Fixed (₹)</option>
            </select>
            <input required type="number" min="0" value={form.discountValue} onChange={e => setForm(p => ({ ...p, discountValue: e.target.value }))} placeholder="Discount value" className="input" />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} className="w-4 h-4 accent-indigo-600" /> Active
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
