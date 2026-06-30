'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Search, Mail, ChevronDown, ChevronUp, Receipt as ReceiptIcon, IndianRupee, Calendar, Utensils, ShoppingBag, Truck, Banknote, QrCode, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, isToday } from 'date-fns';
import clsx from 'clsx';

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

const ORDER_TYPE_META: Record<string, { label: string; icon: any; bg: string }> = {
  DINE_IN: { label: 'Dine In', icon: Utensils, bg: 'bg-indigo-50 text-indigo-600' },
  TAKEAWAY: { label: 'Takeaway', icon: ShoppingBag, bg: 'bg-amber-50 text-amber-600' },
  DELIVERY: { label: 'Delivery', icon: Truck, bg: 'bg-teal-50 text-teal-600' },
};

const PAYMENT_META: Record<string, { label: string; icon: any }> = {
  CASH: { label: 'Cash', icon: Banknote },
  UPI: { label: 'UPI', icon: QrCode },
  CARD: { label: 'Card', icon: CreditCard },
};

export default function ReceiptsPage() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleExpand = (order: ReceiptOrder) => {
    const next = expanded === order.id ? null : order.id;
    setExpanded(next);
    // Pre-fill the email input with customer email when expanding, so it's editable
    if (next && emailInputs[order.id] === undefined && order.customer?.email) {
      setEmailInputs(prev => ({ ...prev, [order.id]: order.customer!.email! }));
    }
  };
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
    // emailInputs[order.id] is set on every keystroke; if undefined the input shows customer email as placeholder-value
    const typed = emailInputs[order.id];
    const email = typed !== undefined ? typed : (order.customer?.email ?? '');
    if (!email.trim()) { toast.error('Enter an email address'); return; }
    setSending(order.id);
    try {
      await api.post(`/receipt-email/${order.id}/send`, { email: email.trim() });
      toast.success(`Receipt sent to ${email.trim()}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send receipt');
    } finally {
      setSending(null);
    }
  };

  const stats = {
    total: orders.length,
    revenue: orders.reduce((s, o) => s + o.totalAmount, 0),
    today: orders.filter(o => isToday(new Date(o.createdAt))).length,
    avg: orders.length ? orders.reduce((s, o) => s + o.totalAmount, 0) / orders.length : 0,
  };

  return (
    <PageLayout title="Receipts" actions={
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders or customers..." className="input pl-8 py-2 text-sm w-64" />
      </div>
    }>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl"><ReceiptIcon size={20} /></div>
          <div><p className="text-xs text-gray-500">Total Receipts</p><p className="text-xl font-bold text-gray-900">{stats.total}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-green-50 text-green-600 p-2.5 rounded-xl"><IndianRupee size={20} /></div>
          <div><p className="text-xs text-gray-500">Total Revenue</p><p className="text-xl font-bold text-gray-900">₹{stats.revenue.toFixed(2)}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-amber-50 text-amber-600 p-2.5 rounded-xl"><Calendar size={20} /></div>
          <div><p className="text-xs text-gray-500">Today</p><p className="text-xl font-bold text-gray-900">{stats.today}</p></div>
        </div>
        <div className="card flex items-center gap-3 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="bg-purple-50 text-purple-600 p-2.5 rounded-xl"><ReceiptIcon size={20} /></div>
          <div><p className="text-xs text-gray-500">Avg. Receipt</p><p className="text-xl font-bold text-gray-900">₹{stats.avg.toFixed(2)}</p></div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full"><tbody><SkeletonTable rows={8} cols={5} /></tbody></table>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ReceiptIcon size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No paid orders found</p>
          <p className="text-sm mt-1">{search ? 'Try a different search.' : 'Completed orders will appear here.'}</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {filtered.map(order => {
            const isOpen = expanded === order.id;
            const email = emailInputs[order.id] ?? order.customer?.email ?? '';
            const typeMeta = ORDER_TYPE_META[order.orderType] || ORDER_TYPE_META.DINE_IN;
            const TypeIcon = typeMeta.icon;
            return (
              <div key={order.id} className={clsx('card hover:shadow-md transition-all overflow-hidden relative', isOpen && 'ring-1 ring-indigo-100')}>
                <div className={clsx('h-1 -mx-4 -mt-4 mb-3 bg-gradient-to-r', isOpen ? 'from-indigo-500 to-purple-500' : 'from-gray-200 to-gray-300')} />
                {/* Header row */}
                <button onClick={() => toggleExpand(order)} className="w-full flex items-center justify-between gap-4 text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110', typeMeta.bg)}>
                      <TypeIcon size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{order.customer?.name || 'Walk-in Customer'}</p>
                        <span className="badge bg-indigo-50 text-indigo-700 text-[10px] font-bold tracking-wide">#{order.orderNumber}</span>
                      </div>
                      <p className="text-xs text-gray-400">{format(new Date(order.createdAt), 'dd MMM yyyy, hh:mm aa')} · {order.table ? `Table ${order.table.tableNumber}` : typeMeta.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="font-bold text-gray-900 text-lg">₹{order.totalAmount.toFixed(2)}</span>
                    <span className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </div>
                </button>

                {/* Expanded panel */}
                {isOpen && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                    {/* Items */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wide">Items</p>
                      <div className="space-y-1.5 bg-gray-50 rounded-lg p-3">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-700">{item.productName} <span className="text-gray-400">× {item.quantity}</span></span>
                            <span className="font-medium">₹{item.totalPrice.toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-gray-200 mt-1.5">
                          <span>Total</span>
                          <span>₹{order.totalAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Payments */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wide">Payment</p>
                      <div className="flex flex-wrap gap-2">
                        {order.payments.map((pay, i) => {
                          const pm = PAYMENT_META[pay.paymentMethod] || PAYMENT_META.CASH;
                          const PIcon = pm.icon;
                          return (
                            <span key={i} className="inline-flex items-center gap-1.5 text-sm bg-gray-50 rounded-lg px-3 py-1.5">
                              <PIcon size={14} className="text-gray-400" />
                              <span className="text-gray-600">{pm.label}</span>
                              <span className="font-semibold">₹{pay.amount.toFixed(2)}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Send email */}
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wide">Send Receipt via Email</p>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="email"
                            value={email}
                            onChange={e => setEmailInputs(prev => ({ ...prev, [order.id]: e.target.value }))}
                            placeholder={order.customer?.email || 'customer@email.com'}
                            className="input pl-8 text-sm"
                          />
                        </div>
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
