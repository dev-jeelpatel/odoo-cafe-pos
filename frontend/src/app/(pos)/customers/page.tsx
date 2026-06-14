'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Customer } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import Modal from '@/components/ui/Modal';
import { Plus, Pencil, Trash2, Search, Mail, Phone, MoreVertical, LayoutList, LayoutGrid, Users, UserPlus, Repeat, Wallet, ShoppingBag, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';
import { isValidEmail, isValidPhone, digitsOnly } from '@/lib/validation';

export default function CustomersPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<'list' | 'grid'>(() => (typeof window !== 'undefined' && (localStorage.getItem('cust-view') as any)) || 'list');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);
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
    if (form.phone && !isValidPhone(form.phone)) {
      toast.error('Enter a valid 10-digit phone number');
      return;
    }
    if (form.email && !isValidEmail(form.email)) {
      toast.error('Enter a valid email address');
      return;
    }
    setSaving(true);
    try {
      if (editing) await api.put(`/customers/${editing.id}`, form);
      else await api.post('/customers', form);
      qc.invalidateQueries({ queryKey: ['customers'] });
      setModal(false);
      toast.success(editing ? 'Customer updated' : 'Customer created');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const del = async (c: Customer) => {
    if ((c.orderCount || 0) > 0) {
      toast.error(`Can't delete "${c.name}" — they have ${c.orderCount} order${c.orderCount !== 1 ? 's' : ''} on record.`);
      return;
    }
    if (!confirm(`Delete customer "${c.name}"?`)) return;
    try {
      await api.delete(`/customers/${c.id}`);
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error deleting customer'); }
  };

  const now = new Date();
  const stats = {
    total: customers.length,
    newThisMonth: customers.filter(c => c.createdAt && new Date(c.createdAt).getMonth() === now.getMonth() && new Date(c.createdAt).getFullYear() === now.getFullYear()).length,
    repeat: customers.filter(c => (c.orderCount || 0) > 1).length,
    revenue: customers.reduce((s, c) => s + (c.totalSpent || 0), 0),
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
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl"><Users size={20} /></div>
          <div><p className="text-xs text-gray-500">Total Customers</p><p className="text-xl font-bold text-gray-900">{stats.total}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl"><UserPlus size={20} /></div>
          <div><p className="text-xs text-gray-500">New This Month</p><p className="text-xl font-bold text-gray-900">{stats.newThisMonth}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-purple-50 text-purple-600 p-2.5 rounded-xl"><Repeat size={20} /></div>
          <div><p className="text-xs text-gray-500">Repeat Customers</p><p className="text-xl font-bold text-gray-900">{stats.repeat}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-green-50 text-green-600 p-2.5 rounded-xl"><Wallet size={20} /></div>
          <div><p className="text-xs text-gray-500">Total Revenue</p><p className="text-xl font-bold text-gray-900">₹{stats.revenue.toFixed(2)}</p></div>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">{search ? 'No customers match your search' : 'No customers found'}</p>
          <p className="text-sm mt-1 mb-4">{search ? 'Try a different search term.' : 'Add your first customer to get started.'}</p>
          {!search && (
            <button onClick={openCreate} className="btn-primary inline-flex items-center gap-2"><Plus size={16} />Add Customer</button>
          )}
        </div>
      ) : view === 'list' ? (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Contact</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Orders</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Total Spent</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Last Visit</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 transition-transform group-hover:scale-110">{c.name[0].toUpperCase()}</div>
                      <span className="font-medium text-gray-800 group-hover:text-indigo-700 transition-colors truncate">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    <div className="flex items-center gap-2"><Mail size={13} className="text-gray-400 flex-shrink-0" /><span className="truncate">{c.email || '—'}</span></div>
                    <div className="flex items-center gap-2 mt-0.5"><Phone size={13} className="text-gray-400 flex-shrink-0" />{c.phone || '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs font-medium px-2 py-1 rounded-full inline-flex items-center gap-1 transition-colors', (c.orderCount || 0) > 0 ? 'bg-indigo-50 text-indigo-700 group-hover:bg-indigo-100' : 'bg-gray-100 text-gray-400')}>
                      <ShoppingBag size={11} /> {c.orderCount || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-700">₹{(c.totalSpent || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {c.lastVisit ? (
                      <span className="flex items-center gap-1.5"><Clock size={12} />{format(new Date(c.lastVisit), 'dd MMM yyyy')}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative inline-block">
                      <button onClick={() => setMenuOpen(menuOpen === c.id ? null : c.id)} className="p-1.5 hover:bg-gray-100 hover:scale-110 rounded-lg text-gray-500 transition-all"><MoreVertical size={16} /></button>
                      {menuOpen === c.id && (
                        <div ref={menuRef} className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                          <button onClick={() => { openEdit(c); setMenuOpen(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 text-gray-700"><Pencil size={14} />Edit</button>
                          <button onClick={() => { del(c); setMenuOpen(null); }} className={clsx('flex items-center gap-2 w-full px-3 py-2 text-sm', (c.orderCount || 0) > 0 ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-red-50 text-red-500')}><Trash2 size={14} />Delete</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {customers.map(c => (
            <div key={c.id} className="card hover:shadow-lg hover:-translate-y-1 transition-all group relative">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center font-bold text-lg flex-shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-3">{c.name[0].toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate group-hover:text-indigo-700 transition-colors">{c.name}</p>
                  <p className="text-xs text-gray-500 truncate flex items-center gap-1.5 mt-0.5"><Phone size={11} />{c.phone || '—'}</p>
                  <p className="text-xs text-gray-400 truncate flex items-center gap-1.5 mt-0.5"><Mail size={11} />{c.email || '—'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 text-xs">
                <span className="flex items-center gap-1 text-gray-500"><ShoppingBag size={12} />{c.orderCount || 0} orders</span>
                <span className="font-bold text-gray-700">₹{(c.totalSpent || 0).toFixed(2)}</span>
              </div>
              <div className="flex gap-1 mt-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-indigo-50 hover:scale-110 rounded-lg text-indigo-600 transition-all"><Pencil size={14} /></button>
                <button onClick={() => del(c)} className={clsx('p-1.5 rounded-lg transition-all', (c.orderCount || 0) > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50 hover:scale-110')}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Customer' : 'Add Customer'} size="sm">
        <form onSubmit={submit} className="space-y-3">
          {/* Live preview */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center font-bold text-lg flex-shrink-0">
              {form.name.trim() ? form.name.trim()[0].toUpperCase() : '?'}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400">Preview</p>
              <p className="font-semibold text-gray-800 truncate">{form.name.trim() || 'Customer name'}</p>
            </div>
          </div>

          <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name" className="input" autoFocus />
          <input type="tel" inputMode="numeric" maxLength={10} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: digitsOnly(e.target.value) }))} placeholder="10-digit phone number" className="input" />
          <input type="email" maxLength={100} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email (optional)" className="input" />
          <div className="flex gap-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
}
