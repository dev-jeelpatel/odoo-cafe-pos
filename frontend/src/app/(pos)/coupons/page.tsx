'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Coupon } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import Modal from '@/components/ui/Modal';
import { Plus, Pencil, Trash2, TicketPercent, LayoutList, LayoutGrid, Percent, IndianRupee, CheckCircle2, XCircle, Calendar, Copy, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, isPast } from 'date-fns';
import clsx from 'clsx';

export default function CouponsPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<'list'|'grid'>(() => (typeof window !== 'undefined' && (localStorage.getItem('coupon-view') as any)) || 'list');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState({ code: '', discountType: 'PERCENTAGE', discountValue: '', active: true, expiryDate: '' });
  const [saving, setSaving] = useState(false);

  const { data: coupons = [] } = useQuery<Coupon[]>({ queryKey: ['coupons'], queryFn: () => api.get('/coupons').then(r => r.data) });

  const setViewPref = (v: 'list'|'grid') => { setView(v); localStorage.setItem('coupon-view', v); };
  const openCreate = () => { setEditing(null); setForm({ code: '', discountType: 'PERCENTAGE', discountValue: '', active: true, expiryDate: '' }); setModal(true); };
  const openEdit = (c: Coupon) => { setEditing(c); setForm({ code: c.code, discountType: c.discountType, discountValue: String(c.discountValue), active: c.active, expiryDate: c.expiryDate ? c.expiryDate.slice(0, 10) : '' }); setModal(true); };
  const del = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    await api.delete(`/coupons/${id}`);
    qc.invalidateQueries({ queryKey: ['coupons'] });
    toast.success('Coupon deleted');
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied "${code}"`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      code: form.code,
      discountType: form.discountType,
      discountValue: parseFloat(form.discountValue),
      active: form.active,
      expiryDate: form.expiryDate || null,
    };
    setSaving(true);
    try {
      if (editing) await api.put(`/coupons/${editing.id}`, payload);
      else await api.post('/coupons', payload);
      qc.invalidateQueries({ queryKey: ['coupons'] });
      setModal(false);
      toast.success(editing ? 'Coupon updated' : 'Coupon created');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const isExpired = (c: Coupon) => !!c.expiryDate && isPast(new Date(c.expiryDate));

  const stats = {
    total: coupons.length,
    active: coupons.filter(c => c.active && !isExpired(c)).length,
    expired: coupons.filter(isExpired).length,
    percentBased: coupons.filter(c => c.discountType === 'PERCENTAGE').length,
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
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl"><TicketPercent size={20} /></div>
          <div><p className="text-xs text-gray-500">Total Coupons</p><p className="text-xl font-bold text-gray-900">{stats.total}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-green-50 text-green-600 p-2.5 rounded-xl"><CheckCircle2 size={20} /></div>
          <div><p className="text-xs text-gray-500">Active</p><p className="text-xl font-bold text-gray-900">{stats.active}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-red-50 text-red-600 p-2.5 rounded-xl"><XCircle size={20} /></div>
          <div><p className="text-xs text-gray-500">Expired</p><p className="text-xl font-bold text-gray-900">{stats.expired}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-purple-50 text-purple-600 p-2.5 rounded-xl"><Percent size={20} /></div>
          <div><p className="text-xs text-gray-500">Percentage Based</p><p className="text-xl font-bold text-gray-900">{stats.percentBased}</p></div>
        </div>
      </div>

      {coupons.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <TicketPercent size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No coupons yet</p>
          <p className="text-sm mt-1 mb-4">Create your first coupon to offer discounts.</p>
          <button onClick={openCreate} className="btn-primary inline-flex items-center gap-2"><Plus size={16} />Add Coupon</button>
        </div>
      ) : view === 'list' ? (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Code</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Value</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Expiry</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {coupons.map(c => {
                const expired = isExpired(c);
                const PctIcon = c.discountType === 'PERCENTAGE' ? Percent : IndianRupee;
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <button onClick={() => copyCode(c.code)} className="flex items-center gap-2 font-bold tracking-wider text-indigo-700 hover:text-indigo-900 transition-colors" title="Click to copy">
                        {c.code} <Copy size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      <span className="flex items-center gap-1.5"><PctIcon size={13} className="text-gray-400" />{c.discountType === 'PERCENTAGE' ? 'Percentage' : 'Fixed'}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-700">{c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `₹${c.discountValue}`}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {c.expiryDate ? (
                        <span className={clsx('flex items-center gap-1.5', expired && 'text-red-500')}><Calendar size={12} />{format(new Date(c.expiryDate), 'dd MMM yyyy')}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('badge transition-transform group-hover:scale-105', expired ? 'bg-red-100 text-red-600' : c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                        {expired ? 'Expired' : c.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-indigo-50 hover:scale-110 rounded-lg text-indigo-600 transition-all"><Pencil size={14} /></button>
                        <button onClick={() => del(c.id)} className="p-1.5 hover:bg-red-50 hover:scale-110 rounded-lg text-red-500 transition-all"><Trash2 size={14} /></button>
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
          {coupons.map(c => {
            const expired = isExpired(c);
            const PctIcon = c.discountType === 'PERCENTAGE' ? Percent : IndianRupee;
            return (
              <div key={c.id} className={clsx('card hover:shadow-lg hover:-translate-y-1 transition-all group relative overflow-hidden', (expired || !c.active) && 'opacity-70')}>
                <div className={clsx('h-1 -mx-4 -mt-4 mb-3 bg-gradient-to-r', expired ? 'from-red-400 to-red-500' : c.active ? 'from-indigo-500 to-purple-500' : 'from-gray-300 to-gray-400')} />
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={clsx('p-2.5 rounded-xl transition-transform group-hover:scale-110 group-hover:rotate-3', expired ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-600')}><TicketPercent size={20} /></div>
                    <div className="min-w-0">
                      <button onClick={() => copyCode(c.code)} className="flex items-center gap-1.5 font-bold text-lg tracking-wider hover:text-indigo-700 transition-colors" title="Click to copy">
                        {c.code} <Copy size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                      <p className="text-sm text-gray-500 flex items-center gap-1.5"><PctIcon size={12} />{c.discountType === 'PERCENTAGE' ? `${c.discountValue}% off` : `₹${c.discountValue} off`}</p>
                    </div>
                  </div>
                  <span className={clsx('badge text-xs flex-shrink-0', expired ? 'bg-red-100 text-red-600' : c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                    {expired ? 'Expired' : c.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {c.expiryDate && (
                  <p className={clsx('text-xs mt-3 flex items-center gap-1.5', expired ? 'text-red-500' : 'text-gray-400')}>
                    <Calendar size={12} />{expired ? 'Expired on' : 'Valid until'} {format(new Date(c.expiryDate), 'dd MMM yyyy')}
                  </p>
                )}
                <div className="flex gap-1 mt-3 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-indigo-50 hover:scale-110 rounded-lg text-indigo-600 transition-all"><Pencil size={14} /></button>
                  <button onClick={() => del(c.id)} className="p-1.5 hover:bg-red-50 hover:scale-110 rounded-lg text-red-500 transition-all"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Coupon' : 'Add Coupon'} size="sm">
        <form onSubmit={submit} className="space-y-3">
          {/* Live preview */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl flex-shrink-0"><TicketPercent size={20} /></div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400">Preview</p>
              <p className="font-bold text-gray-800 tracking-wider truncate">{form.code.trim() || 'CODE'}</p>
              <p className="text-xs text-gray-500">{form.discountValue ? (form.discountType === 'PERCENTAGE' ? `${form.discountValue}% off` : `₹${form.discountValue} off`) : 'Set a discount value'}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Coupon Code *</label>
            <div className="relative">
              <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input required value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="SAVE10" className="input uppercase font-bold tracking-wider pl-8" autoFocus />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
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
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Expiry Date (optional)</label>
            <input type="date" value={form.expiryDate} onChange={e => setForm(p => ({ ...p, expiryDate: e.target.value }))} className="input" />
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
