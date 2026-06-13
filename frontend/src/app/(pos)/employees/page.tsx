'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import Modal from '@/components/ui/Modal';
import { Plus, Pencil, Trash2, Archive, Key, LayoutList, LayoutGrid, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  EMPLOYEE: 'bg-blue-100 text-blue-700',
  CASHIER: 'bg-green-100 text-green-700',
};

export default function EmployeesPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<'list' | 'grid'>(() =>
    (typeof window !== 'undefined' && (localStorage.getItem('emp-view') as any)) || 'list'
  );
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [pwModal, setPwModal] = useState<string | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'EMPLOYEE' });
  const [newPw, setNewPw] = useState('');

  const { data: users = [] } = useQuery<User[]>({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) });

  const filtered = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const setViewPref = (v: 'list' | 'grid') => {
    setView(v); localStorage.setItem('emp-view', v);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/users/${editing.id}`, { name: form.name, email: form.email, role: form.role });
      else await api.post('/users', form);
      qc.invalidateQueries({ queryKey: ['users'] });
      setModal(false);
      toast.success(editing ? 'Updated' : 'User created');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const changePw = async () => {
    if (!newPw || newPw.length < 6) { toast.error('Min 6 characters'); return; }
    await api.put(`/users/${pwModal}/password`, { password: newPw });
    setPwModal(null); setNewPw(''); toast.success('Password updated');
  };

  const archive = async (id: string) => { await api.put(`/users/${id}/archive`); qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Archived'); };
  const del = async (id: string) => { if (!confirm('Delete?')) return; await api.delete(`/users/${id}`); qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Deleted'); };

  const ActionButtons = ({ u }: { u: User }) => (
    <div className="flex gap-1">
      <button title="Change password" onClick={() => setPwModal(u.id)} className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-600"><Key size={14} /></button>
      <button onClick={() => { setEditing(u); setForm({ name: u.name, email: u.email, password: '', role: u.role }); setModal(true); }} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600"><Pencil size={14} /></button>
      <button onClick={() => archive(u.id)} className="p-1.5 hover:bg-orange-50 rounded-lg text-orange-500"><Archive size={14} /></button>
      <button onClick={() => del(u.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>
    </div>
  );

  return (
    <PageLayout title="Employees" actions={
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..." className="input pl-8 py-2 text-sm w-52" />
        </div>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          <button onClick={() => setViewPref('list')} className={clsx('p-2 transition-colors', view === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50')}><LayoutList size={16} /></button>
          <button onClick={() => setViewPref('grid')} className={clsx('p-2 transition-colors', view === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50')}><LayoutGrid size={16} /></button>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: '', email: '', password: '', role: 'EMPLOYEE' }); setModal(true); }} className="btn-primary flex items-center gap-2"><Plus size={16} />Add Employee</button>
      </div>
    }>
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No employees found</p>
          <p className="text-sm mt-1">Add your first employee to get started.</p>
        </div>
      ) : view === 'list' ? (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Created</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => (
                <tr key={u.id} className={clsx('hover:bg-gray-50', u.isArchived && 'opacity-60')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">{u.name[0].toUpperCase()}</div>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3"><span className={clsx('badge', roleColors[u.role])}>{u.role}</span></td>
                  <td className="px-4 py-3">
                    {u.isArchived ? <span className="badge bg-gray-100 text-gray-500">Archived</span> : <span className="badge bg-green-100 text-green-700">Active</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{u.createdAt ? format(new Date(u.createdAt), 'dd MMM yyyy') : '—'}</td>
                  <td className="px-4 py-3 text-right"><ActionButtons u={u} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(u => (
            <div key={u.id} className={clsx('card', u.isArchived && 'opacity-60')}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">{u.name[0].toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{u.name}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={clsx('badge', roleColors[u.role])}>{u.role}</span>
                    {u.isArchived && <span className="badge bg-gray-100 text-gray-500">Archived</span>}
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-3"><ActionButtons u={u} /></div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Employee' : 'Add Employee'} size="sm">
        <form onSubmit={submit} className="space-y-3">
          <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name" className="input" />
          <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email" className="input" />
          {!editing && <input required type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Password (min 6)" className="input" minLength={6} />}
          <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="input">
            <option value="ADMIN">Admin</option>
            <option value="EMPLOYEE">Employee</option>
            <option value="CASHIER">Cashier</option>
          </select>
          <div className="flex gap-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!pwModal} onClose={() => setPwModal(null)} title="Change Password" size="sm">
        <div className="space-y-3">
          <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password (min 6)" className="input" minLength={6} />
          <div className="flex gap-2">
            <button onClick={() => setPwModal(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={changePw} className="btn-primary flex-1">Update Password</button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
}
