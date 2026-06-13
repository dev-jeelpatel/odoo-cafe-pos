'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, ShoppingBag, IndianRupee, Receipt, Percent, Package,
  ArrowUp, ArrowDown, Utensils, Truck, CreditCard, Banknote, QrCode, Clock,
} from 'lucide-react';
import clsx from 'clsx';

const PERIODS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
];

const ORDER_TYPE_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  DINE_IN: { label: 'Dine In', icon: Utensils, color: '#6366f1', bg: 'bg-indigo-50 text-indigo-600' },
  TAKEAWAY: { label: 'Takeaway', icon: ShoppingBag, color: '#f59e0b', bg: 'bg-amber-50 text-amber-600' },
  DELIVERY: { label: 'Delivery', icon: Truck, color: '#14b8a6', bg: 'bg-teal-50 text-teal-600' },
};

const PAYMENT_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  CASH: { label: 'Cash', icon: Banknote, color: '#10b981', bg: 'bg-green-50 text-green-600' },
  UPI: { label: 'UPI', icon: QrCode, color: '#6366f1', bg: 'bg-indigo-50 text-indigo-600' },
  CARD: { label: 'Card', icon: CreditCard, color: '#f59e0b', bg: 'bg-amber-50 text-amber-600' },
};

const CAT_COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#84cc16'];

function ChangeBadge({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span className="text-xs text-gray-400">—</span>;
  const positive = value >= 0;
  return (
    <span className={clsx('inline-flex items-center gap-0.5 text-xs font-semibold', positive ? 'text-green-600' : 'text-red-500')}>
      {positive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState('today');

  const { data, isLoading } = useQuery({
    queryKey: ['reports', period],
    queryFn: () => api.get('/reports/dashboard', { params: { period } }).then(r => r.data),
  });

  const metrics = [
    { label: 'Total Revenue', value: `₹${(data?.totalRevenue || 0).toFixed(2)}`, change: data?.revenueChange, icon: IndianRupee, color: 'bg-green-50 text-green-600' },
    { label: 'Total Orders', value: data?.totalOrders || 0, change: data?.ordersChange, icon: ShoppingBag, color: 'bg-blue-50 text-blue-600' },
    { label: 'Avg Order Value', value: `₹${(data?.avgOrderValue || 0).toFixed(2)}`, change: data?.avgOrderChange, icon: TrendingUp, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Items Sold', value: data?.totalItems || 0, change: null, icon: Package, color: 'bg-purple-50 text-purple-600' },
    { label: 'Tax Collected', value: `₹${(data?.totalTax || 0).toFixed(2)}`, change: null, icon: Receipt, color: 'bg-orange-50 text-orange-600' },
    { label: 'Discounts Given', value: `₹${(data?.totalDiscount || 0).toFixed(2)}`, change: null, icon: Percent, color: 'bg-pink-50 text-pink-600' },
  ];

  const totalPaymentAmount = (data?.paymentBreakdown || []).reduce((s: number, p: any) => s + p.amount, 0);
  const totalCategoryRevenue = (data?.topCategories || []).reduce((s: number, c: any) => s + c.revenue, 0);

  return (
    <PageLayout title="Reports & Analytics">
      <div className="flex gap-2 mb-6">
        {PERIODS.map(p => (
          <button key={p.value} onClick={() => setPeriod(p.value)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${period === p.value ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {isLoading ? <p className="text-center text-gray-400 py-12">Loading analytics...</p> : (
        <div className="space-y-6">
          {/* KPI Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {metrics.map(m => (
              <div key={m.label} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.color}`}>
                    <m.icon size={20} />
                  </div>
                  <ChangeBadge value={m.change} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{m.value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Revenue trend */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Revenue Trend</h2>
              <span className="text-xs text-gray-400">vs previous period <ChangeBadge value={data?.revenueChange} /></span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data?.salesTrend || []}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [`₹${Number(v).toFixed(2)}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revenueGradient)" />
              </AreaChart>
            </ResponsiveContainer>
            {(!data?.salesTrend?.length) && <p className="text-gray-400 text-sm text-center py-4">No sales data for this period</p>}
          </div>

          {/* Sales by hour + Category breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} className="text-gray-400" />
                <h2 className="font-semibold text-gray-900">Sales by Hour</h2>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.salesByHour || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => [`₹${Number(v).toFixed(2)}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Sales by Category</h2>
              {data?.topCategories?.length ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={data.topCategories} dataKey="revenue" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                        {data.topCategories.map((c: any, i: number) => (
                          <Cell key={i} fill={c.color || CAT_COLORS[i % CAT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`₹${Number(v).toFixed(2)}`, 'Revenue']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {data.topCategories.slice(0, 5).map((c: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color || CAT_COLORS[i % CAT_COLORS.length] }} />
                          <span className="truncate text-gray-600">{c.name}</span>
                        </div>
                        <span className="font-semibold text-gray-900 flex-shrink-0">{totalCategoryRevenue ? ((c.revenue / totalCategoryRevenue) * 100).toFixed(0) : 0}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="text-gray-400 text-sm text-center py-12">No data</p>}
            </div>
          </div>

          {/* Order types + Payment methods */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Order Types</h2>
              {data?.orderTypeBreakdown?.length ? (
                <div className="grid grid-cols-3 gap-3">
                  {data.orderTypeBreakdown.map((t: any) => {
                    const meta = ORDER_TYPE_META[t.type] || ORDER_TYPE_META.DINE_IN;
                    return (
                      <div key={t.type} className="border border-gray-100 rounded-xl p-3 text-center">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-2 ${meta.bg}`}>
                          <meta.icon size={16} />
                        </div>
                        <p className="text-lg font-bold text-gray-900">{t.orders}</p>
                        <p className="text-xs text-gray-500">{meta.label}</p>
                        <p className="text-xs font-semibold text-gray-700 mt-1">₹{t.revenue.toFixed(0)}</p>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-gray-400 text-sm text-center py-12">No data</p>}
            </div>

            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Payment Methods</h2>
              {data?.paymentBreakdown?.length ? (
                <div className="space-y-3">
                  {data.paymentBreakdown.map((p: any) => {
                    const meta = PAYMENT_META[p.method] || PAYMENT_META.CASH;
                    const share = totalPaymentAmount ? (p.amount / totalPaymentAmount) * 100 : 0;
                    return (
                      <div key={p.method}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${meta.bg}`}>
                              <meta.icon size={14} />
                            </div>
                            <span className="text-sm font-medium text-gray-700">{meta.label}</span>
                            <span className="text-xs text-gray-400">({p.count})</span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">₹{p.amount.toFixed(2)}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: meta.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-gray-400 text-sm text-center py-12">No data</p>}
            </div>
          </div>

          {/* Top products & top orders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Top Products</h2>
              <div className="space-y-2">
                {(data?.topProducts || []).slice(0, 8).map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      <span className="text-sm font-medium">{p.name}</span>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <span className="font-semibold text-gray-900">₹{p.revenue.toFixed(0)}</span> · {p.qty} sold
                    </div>
                  </div>
                ))}
                {(!data?.topProducts?.length) && <p className="text-gray-400 text-sm text-center py-4">No data</p>}
              </div>
            </div>

            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Top Orders</h2>
              <div className="space-y-2">
                {(data?.topOrders || []).slice(0, 8).map((o: any, i: number) => {
                  const meta = ORDER_TYPE_META[o.orderType] || ORDER_TYPE_META.DINE_IN;
                  return (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                      <div className="flex items-center gap-2">
                        <span className={clsx('w-6 h-6 rounded-lg flex items-center justify-center', meta.bg)}><meta.icon size={12} /></span>
                        <span className="text-xs font-mono text-indigo-600">{o.orderNumber}</span>
                      </div>
                      <span className="text-sm font-bold">₹{(o.total ?? 0).toFixed(2)}</span>
                    </div>
                  );
                })}
                {(!data?.topOrders?.length) && <p className="text-gray-400 text-sm text-center py-4">No data</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
