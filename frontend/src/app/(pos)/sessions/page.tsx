'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Session } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Power, PowerOff, Clock, DollarSign, ShoppingBag, Banknote } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Modal from '@/components/ui/Modal';
import { useState } from 'react';

export default function SessionsPage() {
  const { user, refreshSession } = useAuth();
  const qc = useQueryClient();
  const [summaryModal, setSummaryModal] = useState<Session | null>(null);
  const [openingModal, setOpeningModal] = useState(false);
  const [openingCash, setOpeningCash] = useState('');

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn: () => api.get('/sessions').then(r => r.data),
  });

  const { data: currentSession } = useQuery<Session | null>({
    queryKey: ['current-session'],
    queryFn: () => api.get('/sessions/current').then(r => r.data),
  });

  const { data: liveSummary } = useQuery({
    queryKey: ['current-session-summary'],
    queryFn: () => api.get('/sessions/current/summary').then(r => r.data),
    enabled: !!currentSession,
    refetchInterval: 15000,
  });

  const confirmOpenSession = async () => {
    try {
      await api.post('/sessions/open', { openingAmount: parseFloat(openingCash) || 0 });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['current-session'] });
      qc.invalidateQueries({ queryKey: ['current-session-summary'] });
      await refreshSession();
      setOpeningModal(false);
      setOpeningCash('');
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
              <button onClick={() => { setOpeningCash(''); setOpeningModal(true); }} className="btn-primary flex items-center gap-2">
                <Power size={16} /> Open Session
              </button>
            )}
          </div>
        </div>

        {currentSession && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-xs text-gray-500">Orders Today</p>
              <p className="text-2xl font-bold text-indigo-600">{liveSummary?.totalOrders ?? '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Total Sales</p>
              <p className="text-2xl font-bold text-green-600">₹{(liveSummary?.totalSales ?? 0).toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Opened At</p>
              <p className="text-sm font-bold mt-1">{format(new Date(currentSession.openedAt), 'HH:mm')}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Cash In Hand</p>
              <p className="text-2xl font-bold text-emerald-600">₹{(liveSummary?.cashInHand ?? 0).toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Cash in / cash out summary */}
      {currentSession && (
        <div className="card mb-6">
          <h2 className="text-base font-bold text-gray-800 mb-3">Today's Sale — Cash In / Out</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Opening Cash', value: liveSummary?.openingAmount ?? 0, color: 'text-gray-700 bg-gray-50' },
              { label: 'Cash Sales', value: liveSummary?.cashAmount ?? 0, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'UPI Sales', value: liveSummary?.upiAmount ?? 0, color: 'text-indigo-600 bg-indigo-50' },
              { label: 'Card Sales', value: liveSummary?.cardAmount ?? 0, color: 'text-purple-600 bg-purple-50' },
            ].map(item => (
              <div key={item.label} className={clsx('rounded-xl p-3', item.color.split(' ')[1])}>
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className={clsx('text-lg font-bold', item.color.split(' ')[0])}>₹{item.value.toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Expected Cash in Drawer</span>
            <span className="text-xl font-bold text-emerald-700">₹{(liveSummary?.cashInHand ?? 0).toFixed(2)}</span>
          </div>
        </div>
      )}

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

      {/* Opening cash modal */}
      <Modal isOpen={openingModal} onClose={() => setOpeningModal(false)} title="Open New Session" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-indigo-50 rounded-xl p-4">
            <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-xl"><Banknote size={22} /></div>
            <div>
              <p className="text-sm font-semibold text-indigo-800">Opening Cash in Drawer (Galla)</p>
              <p className="text-xs text-indigo-500 mt-0.5">Enter the cash currently in the drawer before starting the session.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Opening Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={openingCash}
                onChange={e => setOpeningCash(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmOpenSession()}
                className="input pl-7"
                autoFocus
              />
            </div>
            {openingCash && !isNaN(parseFloat(openingCash)) && (
              <p className="text-xs text-gray-400 mt-1">
                Opening with <span className="font-semibold text-gray-700">₹{parseFloat(openingCash).toFixed(2)}</span> in drawer
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => setOpeningModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={confirmOpenSession} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Power size={15} /> Start Session
            </button>
          </div>
        </div>
      </Modal>

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
