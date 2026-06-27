'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Sidebar from '@/components/ui/Sidebar';
import { useSidebar } from '@/contexts/SidebarContext';
import api from '@/lib/api';
import clsx from 'clsx';
import { Plus, Check, X, AlertTriangle, TrendingDown, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

function NewWastageModal({ onClose, onSaved }: any) {
  const [form, setForm] = useState({ inventoryItemId: '', date: new Date().toISOString().split('T')[0], quantity: '', reasonId: '', notes: '', shift: 'MORNING' });
  const [saving, setSaving] = useState(false);
  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const { data: itemsData } = useQuery({ queryKey: ['inventory-items'], queryFn: () => api.get('/inventory/items').then(r => r.data) });
  const { data: reasons } = useQuery({ queryKey: ['wastage-reasons'], queryFn: () => api.get('/wastage/reasons').then(r => r.data) });
  const items = itemsData?.items ?? [];
  const selectedItem = items.find((i: any) => i.id === form.inventoryItemId);
  const estimatedCost = selectedItem && form.quantity ? (parseFloat(form.quantity) * selectedItem.unitCost).toFixed(2) : '0.00';

  const save = async () => {
    if (!form.inventoryItemId || !form.quantity || !form.reasonId) return toast.error('Please fill all required fields');
    setSaving(true);
    try {
      await api.post('/wastage', { ...form, quantity: parseFloat(form.quantity) });
      toast.success('Wastage entry submitted for approval');
      onSaved();
    } catch (e: any) { toast.error(e.response?.data?.message ?? 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-5 border-b flex items-center gap-3"><TrendingDown size={20} className="text-orange-500" /><h2 className="text-lg font-bold">Record Wastage</h2></div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date *</label><input type="date" className="input" value={form.date} onChange={e => f('date', e.target.value)} /></div>
            <div><label className="label">Shift *</label>
              <select className="input" value={form.shift} onChange={e => f('shift', e.target.value)}>
                <option value="MORNING">Morning</option><option value="AFTERNOON">Afternoon</option><option value="EVENING">Evening</option>
              </select>
            </div>
          </div>
          <div><label className="label">Item *</label>
            <select className="input" value={form.inventoryItemId} onChange={e => f('inventoryItemId', e.target.value)}>
              <option value="">Select ingredient/item</option>
              {items.map((i: any) => <option key={i.id} value={i.id}>{i.name} (stock: {i.currentStock} {i.unit})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Quantity *</label><input type="number" className="input" value={form.quantity} onChange={e => f('quantity', e.target.value)} placeholder={selectedItem ? `in ${selectedItem.unit}` : ''} /></div>
            <div><label className="label">Estimated Cost</label><div className="input bg-gray-50 text-gray-700 font-semibold">₹{estimatedCost}</div></div>
          </div>
          <div><label className="label">Reason *</label>
            <select className="input" value={form.reasonId} onChange={e => f('reasonId', e.target.value)}>
              <option value="">Select reason</option>
              {reasons?.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div><label className="label">Notes</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={e => f('notes', e.target.value)} /></div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 flex items-start gap-2">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>This entry will be submitted for manager approval before inventory is deducted.</span>
          </div>
        </div>
        <div className="p-5 border-t flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? 'Submitting...' : 'Submit for Approval'}</button>
        </div>
      </div>
    </div>
  );
}

export default function WastagePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { collapsed } = useSidebar();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: dashboard } = useQuery({ queryKey: ['wastage-dashboard'], queryFn: () => api.get('/wastage/dashboard').then(r => r.data) });
  const { data: entries } = useQuery({ queryKey: ['wastage-entries', statusFilter], queryFn: () => api.get('/wastage', { params: { status: statusFilter || undefined } }).then(r => r.data) });

  const approve = useMutation({
    mutationFn: (id: string) => api.put(`/wastage/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wastage-entries'] }); qc.invalidateQueries({ queryKey: ['wastage-dashboard'] }); toast.success('Wastage approved — stock updated'); },
  });

  const reject = useMutation({
    mutationFn: (id: string) => api.put(`/wastage/${id}/reject`, { rejectionReason: 'Rejected by manager' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wastage-entries'] }); qc.invalidateQueries({ queryKey: ['wastage-dashboard'] }); toast.success('Entry rejected'); },
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['wastage-entries'] }); qc.invalidateQueries({ queryKey: ['wastage-dashboard'] }); setAdding(false); };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={clsx('flex-1 flex flex-col min-w-0 transition-all duration-300 overflow-auto', collapsed ? 'lg:ml-20' : 'lg:ml-64')}>
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div><h1 className="text-xl font-bold text-gray-900">Wastage Management</h1><p className="text-sm text-gray-500">Track and approve all stock wastage</p></div>
          <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-2"><Plus size={16} /> Record Wastage</button>
        </header>

        <div className="p-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'This Month (₹)', value: `₹${(dashboard?.monthCost ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: TrendingDown, color: 'bg-red-500' },
              { label: 'This Week (₹)', value: `₹${(dashboard?.weekCost ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: AlertTriangle, color: 'bg-orange-500' },
              { label: 'Items Wasted', value: dashboard?.itemsWasted ?? 0, icon: Clock, color: 'bg-purple-500' },
              { label: 'Pending Approvals', value: dashboard?.pending ?? 0, icon: AlertCircle, color: 'bg-yellow-500' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
                <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center', color)}><Icon size={22} className="text-white" /></div>
                <div><p className="text-sm text-gray-500">{label}</p><p className="text-2xl font-bold text-gray-900">{value}</p></div>
              </div>
            ))}
          </div>

          {/* Filters + Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex gap-2">
              {['', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} className={clsx('text-xs px-3 py-1.5 rounded-full font-medium transition', statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                  {s || 'All'}{s === 'PENDING' && dashboard?.pending > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full px-1">{dashboard.pending}</span>}
                </button>
              ))}
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>{['Date', 'Item', 'Qty', 'Reason', 'Cost', 'Shift', 'Reported By', 'Status', 'Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries?.map((e: any) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 text-xs">{format(new Date(e.date), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3 font-medium">{e.inventoryItem?.name}</td>
                    <td className="px-4 py-3">{e.quantity} {e.unit}</td>
                    <td className="px-4 py-3 text-gray-600">{e.reason?.name}</td>
                    <td className="px-4 py-3 font-semibold text-red-600">₹{e.cost?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{e.shift}</td>
                    <td className="px-4 py-3 text-gray-600">{e.reportedByUser?.name}</td>
                    <td className="px-4 py-3"><span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[e.status])}>{e.status}</span></td>
                    <td className="px-4 py-3">
                      {e.status === 'PENDING' && (
                        <div className="flex gap-1">
                          <button onClick={() => approve.mutate(e.id)} className="p-1.5 hover:bg-green-50 rounded text-green-600" title="Approve"><Check size={14} /></button>
                          <button onClick={() => reject.mutate(e.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Reject"><X size={14} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {(!entries || entries.length === 0) && <tr><td colSpan={9} className="text-center py-12 text-gray-400">No wastage entries found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {adding && <NewWastageModal onClose={() => setAdding(false)} onSaved={refresh} />}
    </div>
  );
}
