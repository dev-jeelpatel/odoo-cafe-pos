'use client';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Order } from '@/types';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import {
  Search, Eye, Trash2, XCircle, ShoppingBag, Receipt, Wallet, Clock3,
  Utensils, Truck, Smartphone, CheckCircle2,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { getSocket } from '@/lib/socket';
import { statusColors } from '@/lib/orderStatus';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';

const STATUSES = ['DRAFT', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'];

const TYPE_ICONS: Record<string, typeof Utensils> = {
  DINE_IN: Utensils,
  TAKEAWAY: ShoppingBag,
  DELIVERY: Truck,
};

export default function OrdersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['orders', search, statusFilter],
    queryFn: () => api.get('/orders', { params: { search: search || undefined, status: statusFilter || undefined } }).then(r => r.data),
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

  const stats = {
    total: orders.length,
    revenue: orders.filter(o => o.isPaid).reduce((s, o) => s + o.totalAmount, 0),
    active: orders.filter(o => !['COMPLETED', 'CANCELLED', 'DRAFT'].includes(o.status)).length,
    online: orders.filter(o => !o.employeeId).length,
  };

  return (
    <PageLayout title="Orders">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl"><Receipt size={20} /></div>
          <div><p className="text-xs text-gray-500">Total Orders</p><p className="text-xl font-bold text-gray-900">{stats.total}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-green-50 text-green-600 p-2.5 rounded-xl"><Wallet size={20} /></div>
          <div><p className="text-xs text-gray-500">Revenue (Paid)</p><p className="text-xl font-bold text-gray-900">₹{stats.revenue.toFixed(2)}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-orange-50 text-orange-600 p-2.5 rounded-xl"><Clock3 size={20} /></div>
          <div><p className="text-xs text-gray-500">Active</p><p className="text-xl font-bold text-gray-900">{stats.active}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-purple-50 text-purple-600 p-2.5 rounded-xl"><Smartphone size={20} /></div>
          <div><p className="text-xs text-gray-500">Online Orders</p><p className="text-xl font-bold text-gray-900">{stats.online}</p></div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order number..." className="input pl-9" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input sm:w-48">
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
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
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Payment</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map(o => {
                const TypeIcon = TYPE_ICONS[o.orderType] || Utensils;
                const isOnline = !o.employeeId;
                return (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-600 group-hover:text-indigo-800 transition-colors">{o.orderNumber}</span>
                        {isOnline && (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full" title="Placed via customer menu">
                            <Smartphone size={10} /> Online
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{o.customer?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{o.table ? `T${o.table.tableNumber}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      <span className="flex items-center gap-1.5">
                        <TypeIcon size={13} className="text-gray-400 group-hover:text-indigo-500 transition-colors" />
                        {o.orderType.replace('_', '-').toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3"><span className={clsx('badge capitalize transition-transform group-hover:scale-105', statusColors[o.status])}>{o.status.toLowerCase()}</span></td>
                    <td className="px-4 py-3">
                      {o.isPaid ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600"><CheckCircle2 size={13} /> Paid</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-medium text-gray-400"><Wallet size={13} /> Unpaid</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">₹{o.totalAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(o.createdAt), 'dd MMM, HH:mm')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setSelectedOrder(o)} className="p-1.5 hover:bg-indigo-50 hover:scale-110 rounded-lg text-indigo-600 transition-all" title="View"><Eye size={14} /></button>
                        {!o.isPaid && o.status !== 'CANCELLED' && <button onClick={() => cancel(o.id)} className="p-1.5 hover:bg-orange-50 hover:scale-110 rounded-lg text-orange-500 transition-all" title="Cancel"><XCircle size={14} /></button>}
                        {o.status === 'DRAFT' && <button onClick={() => del(o.id)} className="p-1.5 hover:bg-red-50 hover:scale-110 rounded-lg text-red-500 transition-all" title="Delete"><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {orders.length === 0 && (
            <div className="text-center text-gray-400 py-16">
              <Receipt size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No orders found</p>
              <p className="text-sm mt-1">{search || statusFilter ? 'Try adjusting your search or filter.' : 'Orders will appear here once placed.'}</p>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`Order ${selectedOrder?.orderNumber}`} size="lg">
        {selectedOrder && (
          <div className="space-y-4">
            {!selectedOrder.employeeId && (
              <div className="flex items-center gap-2 bg-purple-50 text-purple-700 text-sm font-medium px-3 py-2 rounded-xl">
                <Smartphone size={15} /> Placed via Customer Menu (Online Order)
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Status:</span> <span className={clsx('badge capitalize ml-1', statusColors[selectedOrder.status])}>{selectedOrder.status.toLowerCase()}</span></div>
              <div><span className="text-gray-500">Payment:</span> {selectedOrder.isPaid ? (
                <span className="ml-1 inline-flex items-center gap-1 text-green-600 font-medium"><CheckCircle2 size={13} /> Paid</span>
              ) : (
                <span className="ml-1 inline-flex items-center gap-1 text-gray-400 font-medium"><Wallet size={13} /> Unpaid</span>
              )}</div>
              <div><span className="text-gray-500">Type:</span> <span className="ml-1 capitalize">{selectedOrder.orderType.replace('_', '-').toLowerCase()}</span></div>
              <div><span className="text-gray-500">Table:</span> <span className="ml-1">{selectedOrder.table ? `T${selectedOrder.table.tableNumber}` : '—'}</span></div>
              <div><span className="text-gray-500">Customer:</span> <span className="ml-1">{selectedOrder.customer?.name || '—'}</span></div>
              <div><span className="text-gray-500">Date:</span> <span className="ml-1">{format(new Date(selectedOrder.createdAt), 'dd MMM yyyy, HH:mm')}</span></div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Items</h3>
              {selectedOrder.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm py-1.5 border-b border-gray-50">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.categoryColor || '#6366f1' }} />
                    {item.productName} × {item.quantity}
                  </span>
                  <span className="font-medium">₹{item.totalPrice.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="text-sm space-y-1 border-t pt-3">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{selectedOrder.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Tax</span><span>₹{selectedOrder.taxAmount.toFixed(2)}</span></div>
              {selectedOrder.discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{selectedOrder.discountAmount.toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>₹{selectedOrder.totalAmount.toFixed(2)}</span></div>
            </div>
            {selectedOrder.isPaid && selectedOrder.payments.length > 0 && (
              <div>
                <h3 className="font-semibold mb-1 text-green-700">Payments</h3>
                {selectedOrder.payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm"><span className="capitalize">{p.paymentMethod.toLowerCase()}</span><span>₹{p.amount.toFixed(2)}</span></div>
                ))}
              </div>
            )}
            {selectedOrder.notes && <p className="text-sm text-gray-500 italic">📝 {selectedOrder.notes}</p>}
          </div>
        )}
      </Modal>
    </PageLayout>
  );
}
