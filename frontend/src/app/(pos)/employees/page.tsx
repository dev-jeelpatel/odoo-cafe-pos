'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import Modal from '@/components/ui/Modal';
import { Plus, Pencil, Trash2, Archive, ArchiveRestore, Key, LayoutList, LayoutGrid, Search, Users, ShieldCheck, UserCog, Eye, EyeOff, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';
import { avatarUrl } from '@/lib/avatar';

const ROLE_META: Record<string, { label: string; classes: string; icon: typeof ShieldCheck; avatar: string }> = {
  ADMIN: { label: 'Admin', classes: 'bg-red-100 text-red-700', icon: ShieldCheck, avatar: 'bg-red-500' },
  EMPLOYEE: { label: 'Employee', classes: 'bg-blue-100 text-blue-700', icon: UserCog, avatar: 'bg-blue-500' },
};

function Avatar({ seed, archived, size = 36 }: { seed: string; archived: boolean; size?: number }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={avatarUrl(seed)} alt={seed} className="w-full h-full rounded-full object-cover bg-gray-100 transition-transform group-hover:scale-110" />
      <span className={clsx(
        'absolute bottom-0 right-0 block rounded-full ring-2 ring-white',
        archived ? 'bg-gray-400' : 'bg-green-500'
      )} style={{ width: size * 0.3, height: size * 0.3 }} />
    </div>
  );
}

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
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const { data: users = [] } = useQuery<User[]>({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) });

  const filtered = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const setViewPref = (v: 'list' | 'grid') => {
    setView(v); localStorage.setItem('emp-view', v);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.put(`/users/${editing.id}`, { name: form.name, email: form.email, role: form.role });
      else await api.post('/users', form);
      qc.invalidateQueries({ queryKey: ['users'] });
      setModal(false);
      toast.success(editing ? 'Employee updated' : 'Employee created');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const changePw = async () => {
    if (!newPw || newPw.length < 6) { toast.error('Min 6 characters'); return; }
    await api.put(`/users/${pwModal}/password`, { password: newPw });
    setPwModal(null); setNewPw(''); setShowPw(false); toast.success('Password updated');
  };

  const toggleArchive = async (u: User) => {
    await api.put(`/users/${u.id}/archive`);
    qc.invalidateQueries({ queryKey: ['users'] });
    toast.success(u.archived ? 'Employee restored' : 'Employee archived');
  };
  const del = async (id: string) => {
    if (!confirm('Delete this employee?')) return;
    await api.delete(`/users/${id}`);
    qc.invalidateQueries({ queryKey: ['users'] });
    toast.success('Deleted');
  };

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'ADMIN').length,
    active: users.filter(u => !u.archived).length,
    archived: users.filter(u => u.archived).length,
  };

  const ActionButtons = ({ u }: { u: User }) => (
    <div className="flex items-center gap-1 justify-end">
      <button title="Edit" onClick={() => { setEditing(u); setForm({ name: u.name, email: u.email, password: '', role: u.role }); setModal(true); }} className="p-1.5 hover:bg-indigo-50 hover:scale-110 rounded-lg text-indigo-600 transition-all"><Pencil size={14} /></button>
      <div className="relative">
        <button title="More actions" onClick={() => setMenuOpen(menuOpen === u.id ? null : u.id)} className="p-1.5 hover:bg-gray-100 hover:scale-110 rounded-lg text-gray-500 transition-all"><MoreVertical size={14} /></button>
        {menuOpen === u.id && (
          <div ref={menuRef} className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
            <button onClick={() => { setPwModal(u.id); setMenuOpen(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-yellow-50 text-gray-700"><Key size={14} className="text-yellow-600" />Change Password</button>
            <button onClick={() => { toggleArchive(u); setMenuOpen(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-orange-50 text-gray-700">
              {u.archived ? <ArchiveRestore size={14} className="text-orange-500" /> : <Archive size={14} className="text-orange-500" />}
              {u.archived ? 'Restore' : 'Archive'}
            </button>
            <button onClick={() => { del(u.id); setMenuOpen(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-red-50 text-red-500 border-t border-gray-100"><Trash2 size={14} />Delete</button>
          </div>
        )}
      </div>
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
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl"><Users size={20} /></div>
          <div><p className="text-xs text-gray-500">Total Employees</p><p className="text-xl font-bold text-gray-900">{stats.total}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-red-50 text-red-600 p-2.5 rounded-xl"><ShieldCheck size={20} /></div>
          <div><p className="text-xs text-gray-500">Admins</p><p className="text-xl font-bold text-gray-900">{stats.admins}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-green-50 text-green-600 p-2.5 rounded-xl"><Users size={20} /></div>
          <div><p className="text-xs text-gray-500">Active</p><p className="text-xl font-bold text-gray-900">{stats.active}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-gray-100 text-gray-500 p-2.5 rounded-xl"><Archive size={20} /></div>
          <div><p className="text-xs text-gray-500">Archived</p><p className="text-xl font-bold text-gray-900">{stats.archived}</p></div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">{search ? 'No employees match your search' : 'No employees found'}</p>
          <p className="text-sm mt-1 mb-4">{search ? 'Try a different search term.' : 'Add your first employee to get started.'}</p>
          {!search && (
            <button onClick={() => { setEditing(null); setForm({ name: '', email: '', password: '', role: 'EMPLOYEE' }); setModal(true); }} className="btn-primary inline-flex items-center gap-2"><Plus size={16} />Add Employee</button>
          )}
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
              {filtered.map(u => {
                const meta = ROLE_META[u.role] || ROLE_META.EMPLOYEE;
                const RoleIcon = meta.icon;
                return (
                  <tr key={u.id} className={clsx('hover:bg-gray-50 transition-colors group', u.archived && 'opacity-60')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar seed={u.id} archived={u.archived} size={36} />
                        <span className="font-medium text-gray-800 group-hover:text-indigo-700 transition-colors">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3"><span className={clsx('badge inline-flex items-center gap-1.5 transition-transform group-hover:scale-105', meta.classes)}><RoleIcon size={11} />{meta.label}</span></td>
                    <td className="px-4 py-3">
                      {u.archived ? <span className="badge bg-gray-100 text-gray-500">Archived</span> : <span className="badge bg-green-100 text-green-700">Active</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{u.createdAt ? format(new Date(u.createdAt), 'dd MMM yyyy') : '—'}</td>
                    <td className="px-4 py-3"><ActionButtons u={u} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(u => {
            const meta = ROLE_META[u.role] || ROLE_META.EMPLOYEE;
            const RoleIcon = meta.icon;
            return (
              <div key={u.id} className={clsx('card hover:shadow-lg hover:-translate-y-1 transition-all group', u.archived && 'opacity-60')}>
                <div className="flex items-start gap-3">
                  <Avatar seed={u.id} archived={u.archived} size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate group-hover:text-indigo-700 transition-colors">{u.name}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={clsx('badge inline-flex items-center gap-1.5', meta.classes)}><RoleIcon size={11} />{meta.label}</span>
                      {u.archived && <span className="badge bg-gray-100 text-gray-500">Archived</span>}
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-gray-50"><ActionButtons u={u} /></div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Employee' : 'Add Employee'} size="sm">
        <form onSubmit={submit} className="space-y-3">
          {/* Live preview */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
            <Avatar seed={editing?.id || form.name.trim() || 'new-employee'} archived={false} size={48} />
            <div className="min-w-0">
              <p className="text-xs text-gray-400">Preview</p>
              <p className="font-semibold text-gray-800 truncate">{form.name.trim() || 'Employee name'}</p>
              <span className={clsx('badge inline-flex items-center gap-1.5 mt-0.5', (ROLE_META[form.role] || ROLE_META.EMPLOYEE).classes)}>
                {(() => { const Icon = (ROLE_META[form.role] || ROLE_META.EMPLOYEE).icon; return <Icon size={11} />; })()}
                {(ROLE_META[form.role] || ROLE_META.EMPLOYEE).label}
              </span>
            </div>
          </div>

          <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name" className="input" autoFocus />
          <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email" className="input" />
          {!editing && <input required type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Password (min 6)" className="input" minLength={6} />}

          <div>
            <label className="block text-sm font-medium mb-1.5">Role</label>
            <div className="grid grid-cols-3 gap-2">
              {(['ADMIN', 'EMPLOYEE'] as const).map(role => {
                const meta = ROLE_META[role];
                const Icon = meta.icon;
                const active = form.role === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, role }))}
                    className={clsx(
                      'flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-lg border text-xs font-medium transition-all',
                      active ? clsx(meta.classes, 'border-current scale-[1.02]') : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    )}
                  >
                    <Icon size={16} /> {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!pwModal} onClose={() => { setPwModal(null); setShowPw(false); }} title="Change Password" size="sm">
        <div className="space-y-3">
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password (min 6)" className="input pr-9" minLength={6} />
            <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setPwModal(null); setShowPw(false); }} className="btn-secondary flex-1">Cancel</button>
            <button onClick={changePw} className="btn-primary flex-1">Update Password</button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
}
