'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import PageLayout from '@/components/ui/PageLayout';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, ShoppingBag, DollarSign, BarChart2 } from 'lucide-react';

const PERIODS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
];

export default function ReportsPage() {
  const [period, setPeriod] = useState('today');

  const { data, isLoading } = useQuery({
    queryKey: ['reports', period],
    queryFn: () => api.get('/reports/dashboard', { params: { period } }).then(r => r.data),
  });

  const metrics = [
    { label: 'Total Orders', value: data?.totalOrders || 0, icon: ShoppingBag, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Revenue', value: `₹${(data?.totalRevenue || 0).toFixed(2)}`, icon: DollarSign, color: 'bg-green-50 text-green-600' },
    { label: 'Avg Order Value', value: `₹${(data?.avgOrderValue || 0).toFixed(2)}`, icon: TrendingUp, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Top Products', value: data?.topProducts?.length || 0, icon: BarChart2, color: 'bg-purple-50 text-purple-600' },
  ];

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
          {/* Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map(m => (
              <div key={m.label} className="card">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${m.color}`}>
                  <m.icon size={20} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{m.value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Sales trend */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Sales Trend</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data?.salesTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [`₹${Number(v).toFixed(2)}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top products */}
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

            {/* Top orders */}
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Top Orders</h2>
              <div className="space-y-2">
                {(data?.topOrders || []).slice(0, 8).map((o: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                    <span className="text-xs font-mono text-indigo-600">{o.orderNumber}</span>
                    <span className="text-sm font-bold">₹{(o.totalAmount ?? o.total ?? 0).toFixed(2)}</span>
                  </div>
                ))}
                {(!data?.topOrders?.length) && <p className="text-gray-400 text-sm text-center py-4">No data</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
