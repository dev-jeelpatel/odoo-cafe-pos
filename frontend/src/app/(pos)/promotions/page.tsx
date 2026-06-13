'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Promotion, Product } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import Modal from '@/components/ui/Modal';
import { Plus, Pencil, Trash2, LayoutList, LayoutGrid, Megaphone, ShoppingBag, Receipt, CheckCircle2, Percent, IndianRupee, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function PromotionsPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<'list'|'grid'>(() => (typeof window !== 'undefined' && (localStorage.getItem('promo-view') as any)) || 'list');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState({ name: '', promotionType: 'ORDER', productId: '', minQuantity: '', minOrderAmount: '', discountType: 'PERCENTAGE', discountValue: '', active: true });
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    try {
      if (editing) await api.put(`/promotions/${editing.id}`, payload);
      else await api.post('/promotions', payload);
      qc.invalidateQueries({ queryKey: ['promotions'] });
      setModal(false);
      toast.success(editing ? 'Promotion updated' : 'Promotion created');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this promotion?')) return;
    await api.delete(`/promotions/${id}`);
    qc.invalidateQueries({ queryKey: ['promotions'] });
    toast.success('Promotion deleted');
  };

  const describePromo = (p: Promotion) =>
    p.promotionType === 'PRODUCT'
      ? `Buy ${p.minQuantity || 0}+ of ${(p.conditionProduct as Product)?.name || 'product'}`
      : `Order ≥ ₹${p.minOrderAmount || 0}`;

  const describeDiscount = (p: Promotion) =>
    p.discountType === 'PERCENTAGE' ? `${p.discountValue}% off` : `₹${p.discountValue} off`;

  const stats = {
    total: promotions.length,
    active: promotions.filter(p => p.active).length,
    productBased: promotions.filter(p => p.promotionType === 'PRODUCT').length,
    orderBased: promotions.filter(p => p.promotionType === 'ORDER').length,
  };

  const previewSelectedProduct = products.find(pr => pr.id === form.productId);

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
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl"><Megaphone size={20} /></div>
          <div><p className="text-xs text-gray-500">Total Promotions</p><p className="text-xl font-bold text-gray-900">{stats.total}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-green-50 text-green-600 p-2.5 rounded-xl"><CheckCircle2 size={20} /></div>
          <div><p className="text-xs text-gray-500">Active</p><p className="text-xl font-bold text-gray-900">{stats.active}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl"><ShoppingBag size={20} /></div>
          <div><p className="text-xs text-gray-500">Product-based</p><p className="text-xl font-bold text-gray-900">{stats.productBased}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-purple-50 text-purple-600 p-2.5 rounded-xl"><Receipt size={20} /></div>
          <div><p className="text-xs text-gray-500">Order-based</p><p className="text-xl font-bold text-gray-900">{stats.orderBased}</p></div>
        </div>
      </div>

      {promotions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Megaphone size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No promotions yet</p>
          <p className="text-sm mt-1 mb-4">Create automatic discounts for orders or products.</p>
          <button onClick={openCreate} className="btn-primary inline-flex items-center gap-2"><Plus size={16} />Add Promotion</button>
        </div>
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
              {promotions.map(p => {
                const TypeIcon = p.promotionType === 'PRODUCT' ? ShoppingBag : Receipt;
                const DiscIcon = p.discountType === 'PERCENTAGE' ? Percent : IndianRupee;
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3 font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors">{p.name}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('badge inline-flex items-center gap-1.5 transition-transform group-hover:scale-105', p.promotionType === 'PRODUCT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>
                        <TypeIcon size={11} />{p.promotionType === 'PRODUCT' ? 'Product' : 'Order'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{describePromo(p)}</td>
                    <td className="px-4 py-3 font-semibold text-indigo-700">
                      <span className="flex items-center gap-1.5"><DiscIcon size={13} />{describeDiscount(p)}</span>
                    </td>
                    <td className="px-4 py-3"><span className={clsx('badge transition-transform group-hover:scale-105', p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>{p.active ? 'Active' : 'Off'}</span></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-indigo-50 hover:scale-110 rounded-lg text-indigo-600 transition-all"><Pencil size={14} /></button>
                        <button onClick={() => del(p.id)} className="p-1.5 hover:bg-red-50 hover:scale-110 rounded-lg text-red-500 transition-all"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {promotions.map(p => {
            const TypeIcon = p.promotionType === 'PRODUCT' ? ShoppingBag : Receipt;
            return (
              <div key={p.id} className={clsx('card hover:shadow-lg hover:-translate-y-1 transition-all group relative overflow-hidden', !p.active && 'opacity-70')}>
                <div className={clsx('h-1 -mx-4 -mt-4 mb-3 bg-gradient-to-r', p.active ? (p.promotionType === 'PRODUCT' ? 'from-blue-500 to-blue-600' : 'from-purple-500 to-purple-600') : 'from-gray-300 to-gray-400')} />
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={clsx('p-2.5 rounded-xl flex-shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-3', p.promotionType === 'PRODUCT' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600')}><TypeIcon size={20} /></div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 truncate group-hover:text-indigo-700 transition-colors">{p.name}</h3>
                      <span className={clsx('badge text-[10px] mt-0.5', p.promotionType === 'PRODUCT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>
                        {p.promotionType === 'PRODUCT' ? 'Product-based' : 'Order-based'}
                      </span>
                    </div>
                  </div>
                  <span className={clsx('badge text-xs flex-shrink-0', p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>{p.active ? 'Active' : 'Off'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm mt-3 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-600 truncate">{describePromo(p)}</span>
                  <ArrowRight size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="font-bold text-indigo-700 flex-shrink-0">{describeDiscount(p)}</span>
                </div>
                <div className="flex gap-1 mt-3 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-indigo-50 hover:scale-110 rounded-lg text-indigo-600 transition-all"><Pencil size={14} /></button>
                  <button onClick={() => del(p.id)} className="p-1.5 hover:bg-red-50 hover:scale-110 rounded-lg text-red-500 transition-all"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Promotion' : 'Add Promotion'}>
        <form onSubmit={submit} className="space-y-3">
          {/* Live preview */}
          <div className="flex items-center gap-2 text-sm bg-gray-50 rounded-xl px-3 py-3 border border-gray-100">
            <Megaphone size={16} className="text-indigo-600 flex-shrink-0" />
            <span className="text-gray-600 truncate flex-1">
              {form.promotionType === 'PRODUCT'
                ? `Buy ${form.minQuantity || '?'}+ of ${previewSelectedProduct?.name || 'a product'}`
                : `Order ≥ ₹${form.minOrderAmount || '0'}`}
            </span>
            <ArrowRight size={14} className="text-gray-400 flex-shrink-0" />
            <span className="font-bold text-indigo-700 flex-shrink-0">
              {form.discountValue ? (form.discountType === 'PERCENTAGE' ? `${form.discountValue}% off` : `₹${form.discountValue} off`) : '— off'}
            </span>
          </div>

          <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Promotion name" className="input" autoFocus />

          <div className="grid grid-cols-2 gap-2">
            {(['ORDER', 'PRODUCT'] as const).map(t => {
              const TypeIcon = t === 'PRODUCT' ? ShoppingBag : Receipt;
              const active = form.promotionType === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, promotionType: t }))}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all',
                    active ? 'border-indigo-500 bg-indigo-50 text-indigo-700 scale-[1.02]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  )}
                >
                  <TypeIcon size={15} /> {t === 'PRODUCT' ? 'Product-based' : 'Order-based'}
                </button>
              );
            })}
          </div>

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
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
}
