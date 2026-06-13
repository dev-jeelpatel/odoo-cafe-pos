'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import { Search, Mail, CheckCircle, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface ReceiptOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  totalAmount: number;
  customer?: { name: string; email?: string } | null;
  table?: { tableNumber: string } | null;
  orderType: string;
  items: { productName: string; quantity: number; unitPrice: number; totalPrice: number }[];
  payments: { paymentMethod: string; amount: number }[];
}

export default function ReceiptsPage() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [emailInputs, setEmailInputs] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery<ReceiptOrder[]>({
    queryKey: ['receipt-orders'],
    queryFn: () => api.get('/receipt-email').then(r => r.data),
  });

  const filtered = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.orderNumber.toLowerCase().includes(q) || o.customer?.name?.toLowerCase().includes(q) || o.customer?.email?.toLowerCase().includes(q);
  });

  const sendEmail = async (order: ReceiptOrder) => {
    const email = emailInputs[order.id] || order.customer?.email;
    if (!email) { toast.error('Enter an email address'); return; }
    setSending(order.id);
    try {
      await api.post(`/receipt-email/${order.id}/send`, { email });
      toast.success(`Receipt sent to ${email}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send receipt');
    } finally {
      setSending(null);
    }
  };

  return (
    <PageLayout title="Receipts" actions={
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders or customers..." className="input pl-8 py-2 text-sm w-64" />
      </div>
    }>
      {isLoading ? (
        <p className="text-center text-gray-400 py-12">Loading paid orders...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No paid orders found</p>
          <p className="text-sm mt-1">{search ? 'Try a different search.' : 'Completed orders will appear here.'}</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {filtered.map(order => {
            const isOpen = expanded === order.id;
            const email = emailInputs[order.id] ?? order.customer?.email ?? '';
            return (
              <div key={order.id} className="card">
                {/* Header row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-indigo-50 text-indigo-700 font-bold text-sm px-3 py-1.5 rounded-lg whitespace-nowrap">#{order.orderNumber}</div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{order.customer?.name || 'Walk-in Customer'}</p>
                      <p className="text-xs text-gray-400">{format(new Date(order.createdAt), 'dd MMM yyyy, hh:mm aa')} · {order.table ? `Table ${order.table.tableNumber}` : order.orderType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-gray-900">₹{order.totalAmount.toFixed(2)}</span>
                    <button onClick={() => setExpanded(isOpen ? null : order.id)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded panel */}
                {isOpen && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                    {/* Items */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</p>
                      <div className="space-y-1.5">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-700">{item.productName} × {item.quantity}</span>
                            <span className="font-medium">₹{item.totalPrice.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Payments */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Payment</p>
                      <div className="space-y-1">
                        {order.payments.map((pay, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-500">{pay.paymentMethod}</span>
                            <span>₹{pay.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Send email */}
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Send Receipt via Email</p>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmailInputs(prev => ({ ...prev, [order.id]: e.target.value }))}
                          placeholder={order.customer?.email || 'customer@email.com'}
                          className="input flex-1 text-sm"
                        />
                        <button
                          onClick={() => sendEmail(order)}
                          disabled={sending === order.id}
                          className="btn-primary flex items-center gap-2 whitespace-nowrap disabled:opacity-60"
                        >
                          {sending === order.id ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Mail size={15} />
                          )}
                          {sending === order.id ? 'Sending...' : 'Send'}
                        </button>
                      </div>
                      {order.customer?.email && (
                        <p className="text-xs text-gray-400 mt-1">Customer email: {order.customer.email}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}
