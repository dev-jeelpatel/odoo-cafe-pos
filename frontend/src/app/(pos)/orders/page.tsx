'use client';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Order } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import { Search, Eye, Trash2, XCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { getSocket } from '@/lib/socket';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700',
  ready: 'bg-indigo-100 text-indigo-700',
  served: 'bg-teal-100 text-teal-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function OrdersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['orders', search, statusFilter],
    queryFn: () => api.get('/orders', { params: { search, status: statusFilter || undefined } }).then(r => r.data),
  });

  useEffect(() => {
    const socket = getSocket();
    socket.on('order:updated', () => qc.invalidateQueries({ queryKey: ['orders'] }));
    socket.on('order:paid', () => qc.invalidateQueries({ queryKey: ['orders'] }));
    return () => { socket.off('order:updated'); socket.off('order:paid'); };
  }, [qc]);

  const del = async (id: string) => {
    if (!confirm('Delete this order?')) return;
    try { await api.delete(`/orders/${id}`); qc.invalidateQueries({ queryKey: ['orders'] }); toast.success('Deleted'); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const cancel = async (id: string) => {
    await api.put(`/orders/${id}/cancel`);
    qc.invalidateQueries({ queryKey: ['orders'] });
    toast.success('Order cancelled');
  };

  const STATUSES = ['draft', 'pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'];

  return (
    <PageLayout title="Orders">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order number..." className="input pl-9" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input sm:w-48">
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Order</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Table</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map(o => (
                <tr key={o._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-gray-700">{o.customer?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{o.table ? `T${o.table.number}` : '—'}</td>
                  <td className="px-4 py-3 capitalize text-gray-500 text-xs">{o.type}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('badge capitalize', statusColors[o.status])}>{o.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">₹{o.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(o.createdAt), 'dd MMM, HH:mm')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setSelectedOrder(o)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600"><Eye size={14} /></button>
                      {!o.isPaid && o.status !== 'cancelled' && <button onClick={() => cancel(o._id)} className="p-1.5 hover:bg-orange-50 rounded-lg text-orange-500"><XCircle size={14} /></button>}
                      {o.status === 'draft' && <button onClick={() => del(o._id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <p className="text-center text-gray-400 py-12">No orders found</p>}
        </div>
      </div>

      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`Order ${selectedOrder?.orderNumber}`} size="lg">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Status:</span> <span className={clsx('badge capitalize ml-1', statusColors[selectedOrder.status])}>{selectedOrder.status}</span></div>
              <div><span className="text-gray-500">Type:</span> <span className="ml-1 capitalize">{selectedOrder.type}</span></div>
              <div><span className="text-gray-500">Table:</span> <span className="ml-1">{selectedOrder.table ? `T${selectedOrder.table.number}` : '—'}</span></div>
              <div><span className="text-gray-500">Customer:</span> <span className="ml-1">{selectedOrder.customer?.name || '—'}</span></div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Items</h3>
              <div className="space-y-1">
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gray-50">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.categoryColor || '#6366f1' }} />
                      {item.name} × {item.quantity}
                    </span>
                    <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-sm space-y-1 border-t pt-3">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{selectedOrder.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Tax</span><span>₹{selectedOrder.taxAmount.toFixed(2)}</span></div>
              {selectedOrder.promotionDiscount > 0 && <div className="flex justify-between text-green-600"><span>Promotion discount</span><span>-₹{selectedOrder.promotionDiscount.toFixed(2)}</span></div>}
              {selectedOrder.couponDiscount > 0 && <div className="flex justify-between text-green-600"><span>Coupon ({selectedOrder.couponCode})</span><span>-₹{selectedOrder.couponDiscount.toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>₹{selectedOrder.total.toFixed(2)}</span></div>
            </div>
            {selectedOrder.isPaid && (
              <div>
                <h3 className="font-semibold mb-1 text-green-700">Payments</h3>
                {selectedOrder.payments.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm"><span className="capitalize">{p.method}</span><span>₹{p.amount.toFixed(2)}</span></div>
                ))}
              </div>
            )}
            {selectedOrder.notes && <p className="text-sm text-gray-500 italic">Note: {selectedOrder.notes}</p>}
          </div>
        )}
      </Modal>
    </PageLayout>
  );
}
