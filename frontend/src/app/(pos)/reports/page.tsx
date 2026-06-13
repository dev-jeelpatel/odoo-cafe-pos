'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, ShoppingBag, IndianRupee, Receipt, Percent, Package,
  ArrowUp, ArrowDown, Utensils, Truck, CreditCard, Banknote, QrCode, Clock,
  Sparkles, Download, Trophy, Flame, Wallet,
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

function ChangeBadge({ value, inverted }: { value: number | null | undefined; inverted?: boolean }) {
  if (value === null || value === undefined) return <span className="text-xs text-gray-400">—</span>;
  const positive = inverted ? value <= 0 : value >= 0;
  return (
    <span className={clsx('inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md', positive ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50')}>
      {value >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function ChartTooltip({ active, payload, label, prefix = '₹' }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white rounded-lg px-3 py-2 shadow-xl text-xs">
      {label && <p className="text-gray-400 mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-semibold">{prefix}{Number(p.value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState('today');

  const { data, isLoading } = useQuery({
    queryKey: ['reports', period],
    queryFn: () => api.get('/reports/dashboard', { params: { period } }).then(r => r.data),
  });

  const metrics = [
    { label: 'Total Orders', value: (data?.totalOrders || 0).toLocaleString('en-IN'), change: data?.ordersChange, icon: ShoppingBag, color: 'from-blue-500 to-blue-600' },
    { label: 'Avg Order Value', value: `₹${(data?.avgOrderValue || 0).toFixed(2)}`, change: data?.avgOrderChange, icon: TrendingUp, color: 'from-indigo-500 to-indigo-600' },
    { label: 'Items Sold', value: (data?.totalItems || 0).toLocaleString('en-IN'), change: null, icon: Package, color: 'from-purple-500 to-purple-600' },
    { label: 'Tax Collected', value: `₹${(data?.totalTax || 0).toFixed(2)}`, change: null, icon: Receipt, color: 'from-orange-500 to-orange-600' },
    { label: 'Discounts Given', value: `₹${(data?.totalDiscount || 0).toFixed(2)}`, change: null, icon: Percent, color: 'from-pink-500 to-pink-600' },
  ];

  const totalPaymentAmount = (data?.paymentBreakdown || []).reduce((s: number, p: any) => s + p.amount, 0);
  const totalCategoryRevenue = (data?.topCategories || []).reduce((s: number, c: any) => s + c.revenue, 0);
  const maxProductRevenue = Math.max(1, ...(data?.topProducts || []).map((p: any) => p.revenue));
  const maxOrderTotal = Math.max(1, ...(data?.topOrders || []).map((o: any) => o.total ?? 0));

  return (
    <PageLayout title="Reports & Analytics" actions={
      <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 text-sm"><Download size={15} />Export</button>
    }>
      {/* Period selector */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="inline-flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={clsx(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                period === p.value ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === 'today' && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Live data
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-36 bg-white rounded-2xl border border-gray-100" />
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100" />)}</div>
          <div className="h-72 bg-white rounded-2xl border border-gray-100" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Hero revenue card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-600 text-white shadow-lg">
            <div
              className="absolute inset-0 opacity-20 mix-blend-overlay"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='1'%3E%3Ccircle cx='30' cy='170' r='40'/%3E%3Ccircle cx='180' cy='30' r='60'/%3E%3Cpath d='M0 100 C50 60 100 140 200 80'/%3E%3Cpath d='M0 160 C70 120 130 200 200 150'/%3E%3Ccircle cx='150' cy='150' r='4' fill='%23ffffff'/%3E%3Ccircle cx='60' cy='40' r='3' fill='%23ffffff'/%3E%3Ccircle cx='110' cy='90' r='2' fill='%23ffffff'/%3E%3C/g%3E%3C/svg%3E")`,
                backgroundSize: '320px 320px',
                backgroundRepeat: 'repeat',
              }}
            />
            <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -right-4 bottom-0 w-40 h-40 rounded-full bg-white/10 blur-xl" />
            <div className="relative p-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-indigo-100 text-sm font-medium mb-2">
                  <Sparkles size={15} />
                  Total Revenue · {PERIODS.find(p => p.value === period)?.label}
                </div>
                <div className="flex items-end gap-3 flex-wrap">
                  <p className="text-4xl sm:text-5xl font-extrabold tracking-tight">₹{(data?.totalRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                  {data?.revenueChange !== null && data?.revenueChange !== undefined && (
                    <span className={clsx('inline-flex items-center gap-1 text-sm font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm', data.revenueChange >= 0 ? 'bg-emerald-400/20 text-emerald-200' : 'bg-red-400/20 text-red-200')}>
                      {data.revenueChange >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                      {Math.abs(data.revenueChange).toFixed(1)}% vs previous
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full lg:w-72 h-24 -mb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.salesTrend || []}>
                    <defs>
                      <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="revenue" stroke="#ffffff" strokeWidth={2} fill="url(#heroGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* KPI Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {metrics.map(m => (
              <div key={m.label} className="card hover:shadow-md hover:-translate-y-0.5 transition-all group overflow-hidden relative">
                <div className={clsx('absolute -right-6 -top-6 w-20 h-20 rounded-full bg-gradient-to-br opacity-10 group-hover:opacity-20 transition-opacity', m.color)} />
                <div className="flex items-center justify-between mb-3">
                  <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm bg-gradient-to-br transition-transform group-hover:scale-110 group-hover:rotate-3', m.color)}>
                    <m.icon size={18} />
                  </div>
                  <ChangeBadge value={m.change} />
                </div>
                <p className="text-2xl font-bold text-gray-900 tracking-tight">{m.value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Revenue trend */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg"><TrendingUp size={16} /></div>
                <div>
                  <h2 className="font-semibold text-gray-900">Revenue Trend</h2>
                  <p className="text-xs text-gray-400">Performance over the selected period</p>
                </div>
              </div>
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
                <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#revenueGradient)" activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
            {(!data?.salesTrend?.length) && <p className="text-gray-400 text-sm text-center py-4">No sales data for this period</p>}
          </div>

          {/* Sales by hour + Category breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-amber-50 text-amber-600 p-2 rounded-lg"><Clock size={16} /></div>
                <div>
                  <h2 className="font-semibold text-gray-900">Sales by Hour</h2>
                  <p className="text-xs text-gray-400">Find your peak business hours</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.salesByHour || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#6366f1', opacity: 0.06 }} />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-purple-50 text-purple-600 p-2 rounded-lg"><Package size={16} /></div>
                <h2 className="font-semibold text-gray-900">Sales by Category</h2>
              </div>
              {data?.topCategories?.length ? (
                <>
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={data.topCategories} dataKey="revenue" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3} cornerRadius={6}>
                          {data.topCategories.map((c: any, i: number) => (
                            <Cell key={i} fill={c.color || CAT_COLORS[i % CAT_COLORS.length]} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginTop: -4 }}>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total</p>
                        <p className="text-sm font-bold text-gray-900">₹{totalCategoryRevenue.toFixed(0)}</p>
                      </div>
                    </div>
                  </div>
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
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-teal-50 text-teal-600 p-2 rounded-lg"><Utensils size={16} /></div>
                <h2 className="font-semibold text-gray-900">Order Types</h2>
              </div>
              {data?.orderTypeBreakdown?.length ? (
                <div className="grid grid-cols-3 gap-3">
                  {data.orderTypeBreakdown.map((t: any) => {
                    const meta = ORDER_TYPE_META[t.type] || ORDER_TYPE_META.DINE_IN;
                    return (
                      <div key={t.type} className="border border-gray-100 rounded-xl p-3 text-center hover:shadow-md hover:-translate-y-0.5 transition-all group">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-2 transition-transform group-hover:scale-110 ${meta.bg}`}>
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
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-green-50 text-green-600 p-2 rounded-lg"><Wallet size={16} /></div>
                <h2 className="font-semibold text-gray-900">Payment Methods</h2>
              </div>
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
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${share}%`, backgroundColor: meta.color }} />
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
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-yellow-50 text-yellow-600 p-2 rounded-lg"><Trophy size={16} /></div>
                <h2 className="font-semibold text-gray-900">Top Products</h2>
              </div>
              <div className="space-y-3">
                {(data?.topProducts || []).slice(0, 8).map((p: any, i: number) => (
                  <div key={i} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={clsx(
                          'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                          i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-indigo-50 text-indigo-600'
                        )}>{i + 1}</span>
                        <span className="text-sm font-medium text-gray-700 truncate group-hover:text-indigo-700 transition-colors">{p.name}</span>
                      </div>
                      <div className="text-right text-xs text-gray-500 flex-shrink-0 ml-2">
                        <span className="font-semibold text-gray-900">₹{p.revenue.toFixed(0)}</span> · {p.qty} sold
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-700" style={{ width: `${(p.revenue / maxProductRevenue) * 100}%` }} />
                    </div>
                  </div>
                ))}
                {(!data?.topProducts?.length) && <p className="text-gray-400 text-sm text-center py-4">No data</p>}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-rose-50 text-rose-600 p-2 rounded-lg"><Flame size={16} /></div>
                <h2 className="font-semibold text-gray-900">Top Orders</h2>
              </div>
              <div className="space-y-3">
                {(data?.topOrders || []).slice(0, 8).map((o: any, i: number) => {
                  const meta = ORDER_TYPE_META[o.orderType] || ORDER_TYPE_META.DINE_IN;
                  return (
                    <div key={i} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={clsx('w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110', meta.bg)}><meta.icon size={12} /></span>
                          <span className="text-xs font-mono text-indigo-600 truncate">{o.orderNumber}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900 flex-shrink-0 ml-2">₹{(o.total ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${((o.total ?? 0) / maxOrderTotal) * 100}%`, backgroundColor: meta.color }} />
                      </div>
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
