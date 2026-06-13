'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Coupon } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import Modal from '@/components/ui/Modal';
import { Plus, Pencil, Trash2, TicketPercent, LayoutList, LayoutGrid } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CouponsPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<'list'|'grid'>(() => (typeof window !== 'undefined' && (localStorage.getItem('coupon-view') as any)) || 'list');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState({ code: '', discountType: 'PERCENTAGE', discountValue: '', active: true });

  const { data: coupons = [] } = useQuery<Coupon[]>({ queryKey: ['coupons'], queryFn: () => api.get('/coupons').then(r => r.data) });

  const setViewPref = (v: 'list'|'grid') => { setView(v); localStorage.setItem('coupon-view', v); };
  const openCreate = () => { setEditing(null); setForm({ code: '', discountType: 'PERCENTAGE', discountValue: '', active: true }); setModal(true); };
  const openEdit = (c: Coupon) => { setEditing(c); setForm({ code: c.code, discountType: c.discountType, discountValue: String(c.discountValue), active: c.active }); setModal(true); };
  const del = async (id: string) => { await api.delete(`/coupons/${id}`); qc.invalidateQueries({ queryKey: ['coupons'] }); toast.success('Deleted'); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { code: form.code, discountType: form.discountType, discountValue: parseFloat(form.discountValue), active: form.active };
    try {
      if (editing) await api.put(`/coupons/${editing.id}`, payload);
      else await api.post('/coupons', payload);
      qc.invalidateQueries({ queryKey: ['coupons'] });
      setModal(false);
      toast.success(editing ? 'Coupon updated' : 'Coupon created');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  return (
    <PageLayout title="Coupons" actions={
      <div className="flex items-center gap-2">
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          <button onClick={() => setViewPref('list')} className={`p-2 transition-colors ${view === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><LayoutList size={16} /></button>
          <button onClick={() => setViewPref('grid')} className={`p-2 transition-colors ${view === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><LayoutGrid size={16} /></button>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={16} />Add Coupon</button>
      </div>
    }>
      {coupons.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><p className="text-lg font-medium">No coupons yet</p><p className="text-sm mt-1">Create your first coupon.</p></div>
      ) : view === 'list' ? (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Code</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Value</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {coupons.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold tracking-wider text-indigo-700">{c.code}</td>
                  <td className="px-4 py-3 text-gray-500">{c.discountType === 'PERCENTAGE' ? 'Percentage' : 'Fixed'}</td>
                  <td className="px-4 py-3 font-semibold">{c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `₹${c.discountValue}`}</td>
                  <td className="px-4 py-3"><span className={`badge ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.active ? 'Active' : 'Inactive'}</span></td>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map(c => (
            <div key={c.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-xl"><TicketPercent size={20} /></div>
                  <div>
                    <p className="font-bold text-lg tracking-wider">{c.code}</p>
                    <p className="text-sm text-gray-500">{c.discountType === 'PERCENTAGE' ? `${c.discountValue}% off` : `₹${c.discountValue} off`}</p>
                  </div>
                </div>
                <span className={`badge ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex gap-2 mt-4 justify-end">
                <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600"><Pencil size={14} /></button>
                <button onClick={() => del(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Coupon' : 'Add Coupon'} size="sm">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Coupon Code *</label>
            <input required value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="SAVE10" className="input uppercase font-bold tracking-wider" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Discount Type</label>
            <select value={form.discountType} onChange={e => setForm(p => ({ ...p, discountType: e.target.value }))} className="input">
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED">Fixed Amount (₹)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Discount Value *</label>
            <input required type="number" min="0" value={form.discountValue} onChange={e => setForm(p => ({ ...p, discountValue: e.target.value }))} className="input" />
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
