'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Session } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Power, PowerOff, Clock, DollarSign, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Modal from '@/components/ui/Modal';
import { useState } from 'react';

export default function SessionsPage() {
  const { user, refreshSession } = useAuth();
  const qc = useQueryClient();
  const [summaryModal, setSummaryModal] = useState<Session | null>(null);

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn: () => api.get('/sessions').then(r => r.data),
  });

  const { data: currentSession } = useQuery<Session | null>({
    queryKey: ['current-session'],
    queryFn: () => api.get('/sessions/current').then(r => r.data),
  });

  const openSession = async () => {
    try {
      await api.post('/sessions/open');
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['current-session'] });
      await refreshSession();
      toast.success('Session opened!');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const closeSession = async () => {
    if (!confirm('Close the current session? This will finalize all sales data.')) return;
    try {
      const { data } = await api.post('/sessions/close');
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['current-session'] });
      await refreshSession();
      setSummaryModal(data);
      toast.success('Session closed successfully');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  return (
    <PageLayout title="Session Management">
      {/* Current session card */}
      <div className="card mb-6 border-2 border-indigo-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Current Session</h2>
            {currentSession ? (
              <div className="mt-1">
                <span className="badge bg-green-100 text-green-700">OPEN</span>
                <p className="text-sm text-gray-500 mt-1">Opened {format(new Date(currentSession.openedAt), 'dd MMM yyyy, HH:mm')}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-1">No active session</p>
            )}
          </div>
          <div className="flex gap-3">
            {currentSession ? (
              <button onClick={closeSession} className="btn-danger flex items-center gap-2">
                <PowerOff size={16} /> Close Session
              </button>
            ) : (
              <button onClick={openSession} className="btn-primary flex items-center gap-2">
                <Power size={16} /> Open Session
              </button>
            )}
          </div>
        </div>

        {currentSession && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-xs text-gray-500">Live Orders</p>
              <p className="text-2xl font-bold text-indigo-600">—</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Opened At</p>
              <p className="text-sm font-bold">{format(new Date(currentSession.openedAt), 'HH:mm')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Session history */}
      <h2 className="text-base font-bold text-gray-800 mb-3">Session History</h2>
      <div className="space-y-3">
        {sessions.filter(s => s.status === 'CLOSED').map(s => (
          <div key={s.id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSummaryModal(s)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 p-2 rounded-xl"><Clock size={18} className="text-gray-600" /></div>
                <div>
                  <p className="font-medium">{(s.user as any)?.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(s.openedAt), 'dd MMM yyyy, HH:mm')} → {s.closedAt ? format(new Date(s.closedAt), 'HH:mm') : '—'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">₹{s.totalSales.toFixed(2)}</p>
                <p className="text-xs text-gray-500">{s.totalOrders} orders</p>
              </div>
            </div>
          </div>
        ))}
        {sessions.filter(s => s.status === 'CLOSED').length === 0 && (
          <p className="text-center text-gray-400 py-8">No closed sessions yet</p>
        )}
      </div>

      {/* Summary modal */}
      <Modal isOpen={!!summaryModal} onClose={() => setSummaryModal(null)} title="Session Summary" size="lg">
        {summaryModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
              <div><span className="font-medium">Opened:</span> {format(new Date(summaryModal.openedAt), 'dd MMM yyyy, HH:mm')}</div>
              {summaryModal.closedAt && <div><span className="font-medium">Closed:</span> {format(new Date(summaryModal.closedAt), 'dd MMM yyyy, HH:mm')}</div>}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total Sales', value: `₹${summaryModal.totalSales.toFixed(2)}`, icon: DollarSign, color: 'text-green-600 bg-green-50' },
                { label: 'Total Orders', value: summaryModal.totalOrders, icon: ShoppingBag, color: 'text-blue-600 bg-blue-50' },
                { label: 'Cash', value: `₹${summaryModal.cashAmount.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
                { label: 'UPI', value: `₹${summaryModal.upiAmount.toFixed(2)}`, icon: DollarSign, color: 'text-indigo-600 bg-indigo-50' },
                { label: 'Card', value: `₹${summaryModal.cardAmount.toFixed(2)}`, icon: DollarSign, color: 'text-purple-600 bg-purple-50' },
                { label: 'Tax Collected', value: `₹${summaryModal.taxCollected.toFixed(2)}`, icon: DollarSign, color: 'text-orange-600 bg-orange-50' },
              ].map(item => (
                <div key={item.label} className={clsx('rounded-xl p-3 flex items-center gap-3', item.color.split(' ')[1])}>
                  <item.icon size={20} className={item.color.split(' ')[0]} />
                  <div>
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="font-bold text-gray-900">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {summaryModal.discountsApplied > 0 && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Discounts Applied:</span> ₹{summaryModal.discountsApplied.toFixed(2)}
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageLayout>
  );
}
