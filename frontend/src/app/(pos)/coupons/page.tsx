'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Coupon } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import Modal from '@/components/ui/Modal';
import { Plus, Pencil, Trash2, TicketPercent } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CouponsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState({ code: '', discountType: 'percentage', discountValue: '', isActive: true });

  const { data: coupons = [] } = useQuery<Coupon[]>({ queryKey: ['coupons'], queryFn: () => api.get('/coupons').then(r => r.data) });

  const openCreate = () => { setEditing(null); setForm({ code: '', discountType: 'percentage', discountValue: '', isActive: true }); setModal(true); };
  const openEdit = (c: Coupon) => { setEditing(c); setForm({ code: c.code, discountType: c.discountType, discountValue: String(c.discountValue), isActive: c.isActive }); setModal(true); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, discountValue: parseFloat(form.discountValue) };
    try {
      if (editing) await api.put(`/coupons/${editing._id}`, payload);
      else await api.post('/coupons', payload);
      qc.invalidateQueries({ queryKey: ['coupons'] });
      setModal(false);
      toast.success(editing ? 'Coupon updated' : 'Coupon created');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  return (
    <PageLayout title="Coupons" actions={<button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={16} />Add Coupon</button>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map(c => (
          <div key={c._id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-xl"><TicketPercent size={20} /></div>
                <div>
                  <p className="font-bold text-lg tracking-wider">{c.code}</p>
                  <p className="text-sm text-gray-500">{c.discountType === 'percentage' ? `${c.discountValue}% off` : `₹${c.discountValue} off`}</p>
                </div>
              </div>
              <span className={`badge ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.isActive ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600"><Pencil size={14} /></button>
              <button onClick={async () => { await api.delete(`/coupons/${c._id}`); qc.invalidateQueries({ queryKey: ['coupons'] }); toast.success('Deleted'); }} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Coupon' : 'Add Coupon'} size="sm">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Coupon Code *</label>
            <input required value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="SAVE10" className="input uppercase font-bold tracking-wider" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Discount Type</label>
            <select value={form.discountType} onChange={e => setForm(p => ({ ...p, discountType: e.target.value }))} className="input">
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (₹)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Discount Value *</label>
            <input required type="number" min="0" value={form.discountValue} onChange={e => setForm(p => ({ ...p, discountValue: e.target.value }))} className="input" />
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
