'use client';
import { useQuery } from '@tanstack/react-query';
import { AuditLog } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import { format } from 'date-fns';
import clsx from 'clsx';

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-indigo-100 text-indigo-700',
  LOGOUT: 'bg-gray-100 text-gray-600',
  PAYMENT: 'bg-yellow-100 text-yellow-700',
  SESSION_OPEN: 'bg-emerald-100 text-emerald-700',
  SESSION_CLOSE: 'bg-orange-100 text-orange-700',
};

export default function AuditLogsPage() {
  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ['audit-logs'],
    queryFn: () => api.get('/reports/audit-logs').then(r => r.data),
    refetchInterval: 30000,
  });

  return (
    <PageLayout title="Audit Logs">
      {isLoading ? <p className="text-center text-gray-400 py-12">Loading...</p> : (
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
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">{format(new Date(log.createdAt), 'dd MMM, HH:mm:ss')}</td>
                    <td className="px-4 py-2.5 font-medium">{log.user?.name || '—'}</td>
                    <td className="px-4 py-2.5"><span className={clsx('badge', actionColors[log.action] || 'bg-gray-100 text-gray-600')}>{log.action.replace('_', ' ')}</span></td>
                    <td className="px-4 py-2.5 text-gray-500">{log.entityType}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{log.details ? JSON.stringify(log.details).substring(0, 80) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && <p className="text-center text-gray-400 py-12">No audit logs</p>}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
