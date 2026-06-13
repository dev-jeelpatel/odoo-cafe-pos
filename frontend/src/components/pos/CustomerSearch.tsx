'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Customer } from '@/types';
import api from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { Search, Plus, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props { onClose: () => void; }

export default function CustomerSearch({ onClose }: Props) {
  const { setSelectedCustomer } = useCart();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers', search],
    queryFn: () => api.get('/customers', { params: { search } }).then(r => r.data),
  });

  const select = (c: Customer) => { setSelectedCustomer(c); onClose(); };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/customers', form);
      qc.invalidateQueries({ queryKey: ['customers'] });
      select(data);
    } catch {
      toast.error('Failed to create customer');
    }
  };

  return (
    <div className="space-y-4">
      {!creating ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone" className="input pl-9" />
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {customers.map(c => (
              <button key={c._id} onClick={() => select(c)} className="w-full text-left p-3 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-3">
                <UserCheck size={16} className="text-indigo-600" />
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.phone || c.email}</p>
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => setCreating(true)} className="w-full btn-secondary flex items-center gap-2 justify-center">
            <Plus size={16} /> New Customer
          </button>
        </>
      ) : (
        <form onSubmit={create} className="space-y-3">
          <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Customer name *" className="input" />
          <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone number" className="input" />
          <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email" className="input" />
          <div className="flex gap-2">
            <button type="button" onClick={() => setCreating(false)} className="btn-secondary flex-1">Back</button>
            <button type="submit" className="btn-primary flex-1">Create & Select</button>
          </div>
        </form>
      )}
    </div>
  );
}
