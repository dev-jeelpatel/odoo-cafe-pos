'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuditLog } from '@/types';
import api from '@/lib/api';
import { SkeletonTable } from '@/components/ui/Skeleton';
import PageLayout from '@/components/ui/PageLayout';
import { format, isToday } from 'date-fns';
import clsx from 'clsx';
import {
  Search, History, Plus, Pencil, Trash2, LogIn, LogOut, CreditCard,
  PlayCircle, StopCircle, Activity, User as UserIcon, Database,
} from 'lucide-react';

const ACTION_META: Record<string, { label: string; classes: string; icon: any }> = {
  CREATE: { label: 'Create', classes: 'bg-green-100 text-green-700', icon: Plus },
  UPDATE: { label: 'Update', classes: 'bg-blue-100 text-blue-700', icon: Pencil },
  DELETE: { label: 'Delete', classes: 'bg-red-100 text-red-700', icon: Trash2 },
  LOGIN: { label: 'Login', classes: 'bg-indigo-100 text-indigo-700', icon: LogIn },
  LOGOUT: { label: 'Logout', classes: 'bg-gray-100 text-gray-600', icon: LogOut },
  PAYMENT: { label: 'Payment', classes: 'bg-yellow-100 text-yellow-700', icon: CreditCard },
  SESSION_OPEN: { label: 'Session Open', classes: 'bg-emerald-100 text-emerald-700', icon: PlayCircle },
  SESSION_CLOSE: { label: 'Session Close', classes: 'bg-orange-100 text-orange-700', icon: StopCircle },
};

const getMeta = (action: string) => ACTION_META[action] || { label: action.replace(/_/g, ' '), classes: 'bg-gray-100 text-gray-600', icon: Activity };

export default function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ['audit-logs'],
    queryFn: () => api.get('/reports/audit-logs').then(r => r.data),
    refetchInterval: 30000,
  });

  const actionTypes = useMemo(() => Array.from(new Set(logs.map(l => l.action))), [logs]);

  const filtered = useMemo(() => logs.filter(log => {
    if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (log.user?.name || '').toLowerCase().includes(q) || log.entityType.toLowerCase().includes(q) || log.action.toLowerCase().includes(q);
  }), [logs, actionFilter, search]);

  const stats = useMemo(() => ({
    total: logs.length,
    today: logs.filter(l => isToday(new Date(l.createdAt))).length,
    deletes: logs.filter(l => l.action === 'DELETE').length,
    users: new Set(logs.map(l => l.user?.name).filter(Boolean)).size,
  }), [logs]);

  return (
    <PageLayout title="Audit Logs" actions={
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search user, entity, action..." className="input pl-8 py-2 text-sm w-64" />
      </div>
    }>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl"><History size={20} /></div>
          <div><p className="text-xs text-gray-500">Total Events</p><p className="text-xl font-bold text-gray-900">{stats.total}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-green-50 text-green-600 p-2.5 rounded-xl"><Activity size={20} /></div>
          <div><p className="text-xs text-gray-500">Today</p><p className="text-xl font-bold text-gray-900">{stats.today}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-red-50 text-red-600 p-2.5 rounded-xl"><Trash2 size={20} /></div>
          <div><p className="text-xs text-gray-500">Deletions</p><p className="text-xl font-bold text-gray-900">{stats.deletes}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-purple-50 text-purple-600 p-2.5 rounded-xl"><UserIcon size={20} /></div>
          <div><p className="text-xs text-gray-500">Active Users</p><p className="text-xl font-bold text-gray-900">{stats.users}</p></div>
        </div>
      </div>

      {/* Action filter pills */}
      {actionTypes.length > 0 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={() => setActionFilter('ALL')} className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors', actionFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300')}>
            All
          </button>
          {actionTypes.map(a => {
            const meta = getMeta(a);
            const Icon = meta.icon;
            const active = actionFilter === a;
            return (
              <button key={a} onClick={() => setActionFilter(a)} className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-colors', active ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300')}>
                <Icon size={12} />{meta.label}
              </button>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full"><tbody><SkeletonTable rows={10} cols={5} /></tbody></table>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <History size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No audit logs found</p>
          <p className="text-sm mt-1">{search || actionFilter !== 'ALL' ? 'Try a different filter.' : 'Activity will appear here as it happens.'}</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Time</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">User</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Action</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Entity</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(log => {
                  const meta = getMeta(log.action);
                  const Icon = meta.icon;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        <div className="font-medium text-gray-600">{format(new Date(log.createdAt), 'dd MMM yyyy')}</div>
                        <div className="font-mono">{format(new Date(log.createdAt), 'HH:mm:ss')}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {(log.user?.name || '?')[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-700">{log.user?.name || 'System'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('badge inline-flex items-center gap-1.5 transition-transform group-hover:scale-105', meta.classes)}>
                          <Icon size={11} />{meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        <span className="inline-flex items-center gap-1.5"><Database size={12} className="text-gray-400" />{log.entityType}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        <code className="bg-gray-50 px-1.5 py-0.5 rounded font-mono">{log.details ? JSON.stringify(log.details).substring(0, 80) : '—'}</code>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
