'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Sidebar from '@/components/ui/Sidebar';
import { useSidebar } from '@/contexts/SidebarContext';
import api from '@/lib/api';
import clsx from 'clsx';
import { Plus, Edit2, Trash2, Phone, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

function SupplierModal({ supplier, onClose, onSaved }: any) {
  const [form, setForm] = useState(supplier ?? { name: '', contactPerson: '', phone: '', email: '', address: '', gstNumber: '', paymentTerms: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name) return toast.error('Supplier name is required');
    setSaving(true);
    try {
      if (supplier) await api.put(`/suppliers/${supplier.id}`, form);
      else await api.post('/suppliers', form);
      toast.success(supplier ? 'Supplier updated' : 'Supplier added');
      onSaved();
    } catch (e: any) { toast.error(e.response?.data?.message ?? 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b"><h2 className="text-lg font-bold">{supplier ? 'Edit Supplier' : 'Add Supplier'}</h2></div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="label">Supplier Name *</label><input className="input" value={form.name} onChange={e => f('name', e.target.value)} /></div>
          <div><label className="label">Contact Person</label><input className="input" value={form.contactPerson} onChange={e => f('contactPerson', e.target.value)} /></div>
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => f('phone', e.target.value)} /></div>
          <div><label className="label">Email</label><input className="input" value={form.email} onChange={e => f('email', e.target.value)} /></div>
          <div><label className="label">GST Number</label><input className="input" value={form.gstNumber} onChange={e => f('gstNumber', e.target.value)} /></div>
          <div className="col-span-2"><label className="label">Address</label><textarea className="input resize-none" rows={2} value={form.address} onChange={e => f('address', e.target.value)} /></div>
          <div><label className="label">Payment Terms</label><input className="input" value={form.paymentTerms} onChange={e => f('paymentTerms', e.target.value)} placeholder="e.g. Net 30" /></div>
          <div><label className="label">Notes</label><input className="input" value={form.notes} onChange={e => f('notes', e.target.value)} /></div>
        </div>
        <div className="p-5 border-t flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { collapsed } = useSidebar();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [adding, setAdding] = useState(false);

  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get('/suppliers').then(r => r.data) });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('Supplier removed'); },
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setAdding(false); setEditing(null); };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={clsx('flex-1 flex flex-col min-w-0 transition-all duration-300', collapsed ? 'lg:ml-20' : 'lg:ml-64')}>
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Suppliers</h1>
          <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Supplier</button>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {suppliers?.map((s: any) => (
              <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{s.name}</h3>
                    {s.contactPerson && <p className="text-sm text-gray-500 mt-0.5">{s.contactPerson}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(s)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400"><Edit2 size={14} /></button>
                    <button onClick={() => { if (confirm('Remove supplier?')) del.mutate(s.id); }} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  {s.phone && <p className="text-sm text-gray-600 flex items-center gap-2"><Phone size={13} className="text-gray-400" />{s.phone}</p>}
                  {s.email && <p className="text-sm text-gray-600 flex items-center gap-2"><Mail size={13} className="text-gray-400" />{s.email}</p>}
                  {s.paymentTerms && <p className="text-xs text-gray-400 mt-2">Payment: {s.paymentTerms}</p>}
                  {s.gstNumber && <p className="text-xs text-gray-400">GST: {s.gstNumber}</p>}
                </div>
              </div>
            ))}
            {(!suppliers || suppliers.length === 0) && (
              <div className="col-span-3 text-center py-16 text-gray-400">No suppliers yet. Add your first supplier.</div>
            )}
          </div>
        </div>
      </div>
      {(adding || editing) && <SupplierModal supplier={editing} onClose={() => { setAdding(false); setEditing(null); }} onSaved={refresh} />}
    </div>
  );
}
