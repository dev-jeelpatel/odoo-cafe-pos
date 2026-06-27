'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Sidebar from '@/components/ui/Sidebar';
import { useSidebar } from '@/contexts/SidebarContext';
import api from '@/lib/api';
import clsx from 'clsx';
import { Plus, Eye, Send, Trash2, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  RECEIVED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

function NewPOModal({ onClose, onSaved }: any) {
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ inventoryItemId: '', quantity: 1, unitPrice: 0 }]);
  const [saving, setSaving] = useState(false);

  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get('/suppliers').then(r => r.data) });
  const { data: itemsData } = useQuery({ queryKey: ['inventory-items'], queryFn: () => api.get('/inventory/items').then(r => r.data) });
  const items = itemsData?.items ?? [];

  const addLine = () => setLines(l => [...l, { inventoryItemId: '', quantity: 1, unitPrice: 0 }]);
  const removeLine = (i: number) => setLines(l => l.filter((_, idx) => idx !== i));
  const setLine = (i: number, k: string, v: any) => setLines(l => l.map((line, idx) => idx === i ? { ...line, [k]: v } : line));

  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  const save = async () => {
    if (!supplierId) return toast.error('Select a supplier');
    if (lines.some(l => !l.inventoryItemId)) return toast.error('All lines need an item');
    setSaving(true);
    try {
      await api.post('/purchase-orders', { supplierId, expectedDate: expectedDate || null, notes, items: lines });
      toast.success('Purchase Order created');
      onSaved();
    } catch (e: any) { toast.error(e.response?.data?.message ?? 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b"><h2 className="text-lg font-bold">New Purchase Order</h2></div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Supplier *</label>
              <select className="input" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                <option value="">Select supplier</option>
                {suppliers?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div><label className="label">Expected Delivery</label><input type="date" className="input" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} /></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label">Items</label>
              <button onClick={addLine} className="text-xs text-indigo-600 hover:underline flex items-center gap-1"><Plus size={12} /> Add Item</button>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="text-left px-3 py-2 text-xs">Item</th><th className="text-left px-3 py-2 text-xs">Qty</th><th className="text-left px-3 py-2 text-xs">Unit Price</th><th className="text-left px-3 py-2 text-xs">Total</th><th></th></tr></thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-2 py-1.5">
                        <select className="input text-xs" value={line.inventoryItemId} onChange={e => setLine(i, 'inventoryItemId', e.target.value)}>
                          <option value="">Select item</option>
                          {items.map((item: any) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5"><input type="number" className="input text-xs w-20" value={line.quantity} onChange={e => setLine(i, 'quantity', parseFloat(e.target.value) || 0)} /></td>
                      <td className="px-2 py-1.5"><input type="number" className="input text-xs w-24" value={line.unitPrice} onChange={e => setLine(i, 'unitPrice', parseFloat(e.target.value) || 0)} /></td>
                      <td className="px-2 py-1.5 text-gray-600">₹{(line.quantity * line.unitPrice).toFixed(2)}</td>
                      <td className="px-2 py-1.5"><button onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-right mt-2 font-semibold text-gray-800">Total: ₹{total.toFixed(2)}</div>
          </div>

          <div><label className="label">Notes</label><textarea className="input resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </div>
        <div className="p-5 border-t flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? 'Creating...' : 'Create PO'}</button>
        </div>
      </div>
    </div>
  );
}

export default function PurchaseOrdersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { collapsed } = useSidebar();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: pos } = useQuery({ queryKey: ['purchase-orders', statusFilter], queryFn: () => api.get('/purchase-orders', { params: { status: statusFilter || undefined } }).then(r => r.data) });

  const sendPO = useMutation({
    mutationFn: (id: string) => api.post(`/purchase-orders/${id}/send`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-orders'] }); toast.success('PO marked as Sent'); },
  });

  const delPO = useMutation({
    mutationFn: (id: string) => api.delete(`/purchase-orders/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-orders'] }); toast.success('PO deleted'); },
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['purchase-orders'] }); setAdding(false); };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={clsx('flex-1 flex flex-col min-w-0 transition-all duration-300', collapsed ? 'lg:ml-20' : 'lg:ml-64')}>
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Purchase Orders</h1>
          <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-2"><Plus size={16} /> New PO</button>
        </header>

        <div className="bg-white border-b border-gray-100 px-6 py-3 flex gap-2">
          {['', 'DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={clsx('text-xs px-3 py-1.5 rounded-full font-medium transition', statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {s || 'All'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>{['PO Number', 'Supplier', 'Items', 'Total', 'Expected', 'Status', 'Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pos?.map((po: any) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-indigo-600">{po.poNumber}</td>
                    <td className="px-4 py-3">{po.supplier?.name}</td>
                    <td className="px-4 py-3 text-gray-500">{po.items?.length} items</td>
                    <td className="px-4 py-3 font-medium">₹{po.totalAmount?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500">{po.expectedDate ? format(new Date(po.expectedDate), 'dd MMM yyyy') : '—'}</td>
                    <td className="px-4 py-3"><span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[po.status])}>{po.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {po.status === 'DRAFT' && <button onClick={() => sendPO.mutate(po.id)} title="Mark as Sent" className="p-1.5 hover:bg-blue-50 rounded text-blue-500"><Send size={14} /></button>}
                        {po.status === 'DRAFT' && <button onClick={() => { if (confirm('Delete this PO?')) delPO.mutate(po.id); }} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>}
                        <Link href={`/inventory/grn/new?poId=${po.id}`} className="p-1.5 hover:bg-green-50 rounded text-green-600" title="Receive Goods"><Package size={14} /></Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!pos || pos.length === 0) && <tr><td colSpan={7} className="text-center py-12 text-gray-400">No purchase orders yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {adding && <NewPOModal onClose={() => setAdding(false)} onSaved={refresh} />}
    </div>
  );
}
