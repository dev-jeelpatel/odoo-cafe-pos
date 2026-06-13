'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Customer } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import Modal from '@/components/ui/Modal';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ['customers', search], queryFn: () => api.get('/customers', { params: { search } }).then(r => r.data) });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/customers/${editing.id}`, form);
      else await api.post('/customers', form);
      qc.invalidateQueries({ queryKey: ['customers'] });
      setModal(false);
      toast.success(editing ? 'Updated' : 'Customer created');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  return (
    <PageLayout title="Customers" actions={<button onClick={() => { setEditing(null); setForm({ name: '', email: '', phone: '' }); setModal(true); }} className="btn-primary flex items-center gap-2"><Plus size={16} />Add Customer</button>}>
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..." className="input pl-9" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map(c => (
          <div key={c.id} className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold">{c.name[0].toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{c.name}</p>
                <p className="text-xs text-gray-500">{c.phone}</p>
                <p className="text-xs text-gray-400 truncate">{c.email}</p>
              </div>
            </div>
            <div className="flex gap-1 mt-3 justify-end">
              <button onClick={() => { setEditing(c); setForm({ name: c.name, email: c.email, phone: c.phone }); setModal(true); }} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600"><Pencil size={14} /></button>
              <button onClick={async () => { if (!confirm('Delete?')) return; await api.delete(`/customers/${c.id}`); qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Deleted'); }} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Customer' : 'Add Customer'} size="sm">
        <form onSubmit={submit} className="space-y-3">
          <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name" className="input" />
          <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone number" className="input" />
          <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email (optional)" className="input" />
          <div className="flex gap-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
}
