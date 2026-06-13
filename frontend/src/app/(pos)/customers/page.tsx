'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Customer } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import Modal from '@/components/ui/Modal';
import { Plus, Pencil, Trash2, Search, Mail, Phone, MoreVertical, LayoutList, LayoutGrid } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function CustomersPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<'list' | 'grid'>(() => (typeof window !== 'undefined' && (localStorage.getItem('cust-view') as any)) || 'list');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ['customers', search], queryFn: () => api.get('/customers', { params: { search } }).then(r => r.data) });

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const setViewPref = (v: 'list' | 'grid') => { setView(v); localStorage.setItem('cust-view', v); };

  const openCreate = () => { setEditing(null); setForm({ name: '', email: '', phone: '' }); setModal(true); };
  const openEdit = (c: Customer) => { setEditing(c); setForm({ name: c.name, email: c.email, phone: c.phone }); setModal(true); };

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

  const del = async (id: string) => {
    if (!confirm('Delete?')) return;
    await api.delete(`/customers/${id}`);
    qc.invalidateQueries({ queryKey: ['customers'] });
    toast.success('Deleted');
  };

  return (
    <PageLayout title="Customers" actions={
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..." className="input pl-8 py-2 text-sm w-52" />
        </div>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          <button onClick={() => setViewPref('list')} className={clsx('p-2 transition-colors', view === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50')}><LayoutList size={16} /></button>
          <button onClick={() => setViewPref('grid')} className={clsx('p-2 transition-colors', view === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50')}><LayoutGrid size={16} /></button>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={16} />Add Customer</button>
      </div>
    }>
      {customers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No customers found</p>
          <p className="text-sm mt-1">Add your first customer to get started.</p>
        </div>
      ) : view === 'list' ? (
        <div className="card p-0 overflow-hidden divide-y divide-gray-100">
          {customers.map(c => (
            <div key={c.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50">
              <div className="flex items-center gap-3 w-56 min-w-0 flex-shrink-0">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold flex-shrink-0">{c.name[0].toUpperCase()}</div>
                <p className="font-semibold truncate">{c.name}</p>
              </div>
              <div className="flex-1 flex items-center gap-8 text-sm text-gray-500 min-w-0">
                <div className="flex items-center gap-2 w-56 min-w-0"><Mail size={14} className="text-gray-400 flex-shrink-0" /><span className="truncate">{c.email || '—'}</span></div>
                <div className="flex items-center gap-2 flex-shrink-0"><Phone size={14} className="text-gray-400" />{c.phone || '—'}</div>
              </div>
              <div className="relative flex-shrink-0">
                <button onClick={() => setMenuOpen(menuOpen === c.id ? null : c.id)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><MoreVertical size={16} /></button>
                {menuOpen === c.id && (
                  <div ref={menuRef} className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                    <button onClick={() => { openEdit(c); setMenuOpen(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 text-gray-700"><Pencil size={14} />Edit</button>
                    <button onClick={() => { del(c.id); setMenuOpen(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-red-50 text-red-500"><Trash2 size={14} />Delete</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
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
                <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600"><Pencil size={14} /></button>
                <button onClick={() => del(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

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
