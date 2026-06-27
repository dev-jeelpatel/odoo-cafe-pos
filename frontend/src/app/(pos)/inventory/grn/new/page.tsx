'use client';
import { useState, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/ui/Sidebar';
import { useSidebar } from '@/contexts/SidebarContext';
import api from '@/lib/api';
import clsx from 'clsx';
import toast from 'react-hot-toast';

function GRNForm() {
  const params = useSearchParams();
  const poId = params.get('poId') ?? '';
  const router = useRouter();
  const { collapsed } = useSidebar();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const qc = useQueryClient();
  const [notes, setNotes] = useState('');
  const [discrepancy, setDiscrepancy] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const { data: po } = useQuery({
    queryKey: ['po', poId],
    queryFn: () => api.get(`/purchase-orders/${poId}`).then(r => r.data),
    enabled: !!poId,
  });

  const [lines, setLines] = useState<any[]>([]);
  const setLine = (i: number, k: string, v: any) => setLines(l => l.map((line, idx) => idx === i ? { ...line, [k]: v } : line));

  // Pre-fill lines from PO when PO loads
  if (po && lines.length === 0) {
    setLines(po.items.map((item: any) => ({
      inventoryItemId: item.inventoryItemId,
      orderedQty: item.quantity,
      receivedQty: item.quantity,
      unitPrice: item.unitPrice,
      batchNumber: '',
      expiryDate: '',
      itemName: item.inventoryItem?.name,
    })));
  }

  const save = async () => {
    if (lines.length === 0) return toast.error('No items to receive');
    setSaving(true);
    try {
      await api.post('/grn', { poId, receivedDate, notes, discrepancyNotes: discrepancy, items: lines.map(l => ({ ...l, expiryDate: l.expiryDate || null })) });
      toast.success('GRN saved — stock updated');
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      router.push('/inventory/purchase-orders');
    } catch (e: any) { toast.error(e.response?.data?.message ?? 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={clsx('flex-1 flex flex-col min-w-0 transition-all duration-300', collapsed ? 'lg:ml-20' : 'lg:ml-64')}>
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Receive Goods (GRN)</h1>
            {po && <p className="text-sm text-gray-500">PO: {po.poNumber} — {po.supplier?.name}</p>}
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div><label className="label">Received Date</label><input type="date" className="input" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} /></div>
            </div>

            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>{['Item', 'Ordered', 'Received', 'Unit Price', 'Batch #', 'Expiry Date'].map(h => <th key={h} className="text-left px-3 py-2 text-xs">{h}</th>)}</tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium">{l.itemName}</td>
                    <td className="px-3 py-2 text-gray-500">{l.orderedQty}</td>
                    <td className="px-3 py-2"><input type="number" className="input text-xs w-24" value={l.receivedQty} onChange={e => setLine(i, 'receivedQty', parseFloat(e.target.value) || 0)} /></td>
                    <td className="px-3 py-2"><input type="number" className="input text-xs w-28" value={l.unitPrice} onChange={e => setLine(i, 'unitPrice', parseFloat(e.target.value) || 0)} /></td>
                    <td className="px-3 py-2"><input className="input text-xs w-28" value={l.batchNumber} onChange={e => setLine(i, 'batchNumber', e.target.value)} placeholder="Batch #" /></td>
                    <td className="px-3 py-2"><input type="date" className="input text-xs w-36" value={l.expiryDate} onChange={e => setLine(i, 'expiryDate', e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div><label className="label">Notes</label><textarea className="input resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
              <div><label className="label">Discrepancy Notes</label><textarea className="input resize-none" rows={2} value={discrepancy} onChange={e => setDiscrepancy(e.target.value)} placeholder="Document any shortfall or damage" /></div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => router.back()} className="btn-secondary">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving GRN...' : 'Save GRN & Update Stock'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GRNNewPage() {
  return <Suspense><GRNForm /></Suspense>;
}
