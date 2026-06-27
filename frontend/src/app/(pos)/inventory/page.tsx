'use client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import { useSidebar } from '@/contexts/SidebarContext';
import api from '@/lib/api';
import clsx from 'clsx';
import { Package, AlertTriangle, XCircle, TrendingUp, ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface DashboardData {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValue: number;
  lowStockList: any[];
  recentMovements: any[];
}

function KPICard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default function InventoryDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { collapsed } = useSidebar();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['inventory-dashboard'],
    queryFn: () => api.get('/inventory/dashboard/summary').then(r => r.data),
    refetchInterval: 30000,
  });

  const stockStatus = (item: any) => {
    if (item.currentStock <= 0) return { label: 'Out of Stock', cls: 'bg-red-100 text-red-700' };
    if (item.currentStock <= item.minStock) return { label: 'Low Stock', cls: 'bg-orange-100 text-orange-700' };
    return { label: 'OK', cls: 'bg-green-100 text-green-700' };
  };

  const movementColor: Record<string, string> = {
    ORDER_DEDUCTION: 'text-red-600',
    ORDER_RESTORE: 'text-green-600',
    PURCHASE: 'text-blue-600',
    WASTAGE: 'text-orange-600',
    ADJUSTMENT: 'text-purple-600',
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={clsx('flex-1 flex flex-col min-w-0 transition-all duration-300 overflow-auto', collapsed ? 'lg:ml-20' : 'lg:ml-64')}>
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Inventory Dashboard</h1>
            <p className="text-sm text-gray-500">Real-time stock overview</p>
          </div>
          <div className="flex gap-2">
            <Link href="/inventory/items" className="btn-secondary text-sm">Manage Items</Link>
            <Link href="/inventory/purchase-orders/new" className="btn-primary text-sm">+ Purchase Order</Link>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard icon={Package} label="Total Items" value={data?.totalItems ?? '—'} color="bg-indigo-500" />
            <KPICard icon={AlertTriangle} label="Low Stock" value={data?.lowStockCount ?? '—'} color="bg-orange-500" />
            <KPICard icon={XCircle} label="Out of Stock" value={data?.outOfStockCount ?? '—'} color="bg-red-500" />
            <KPICard icon={TrendingUp} label="Total Value" value={data ? `₹${data.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'} color="bg-green-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Low Stock Alerts */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2"><AlertTriangle size={16} className="text-orange-500" /> Low Stock Alerts</h2>
                <Link href="/inventory/items?status=LOW" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>
              </div>
              {isLoading ? (
                <div className="p-6 text-center text-gray-400 text-sm">Loading...</div>
              ) : data?.lowStockList.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">All stock levels are healthy</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {data?.lowStockList.slice(0, 8).map(item => {
                    const s = stockStatus(item);
                    return (
                      <div key={item.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.category?.name}</p>
                        </div>
                        <div className="text-right">
                          <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', s.cls)}>{s.label}</span>
                          <p className="text-xs text-gray-500 mt-0.5">{item.currentStock} / {item.minStock} {item.unit}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Clock size={16} className="text-indigo-500" />
                <h2 className="font-semibold text-gray-900">Recent Stock Activity</h2>
              </div>
              {isLoading ? (
                <div className="p-6 text-center text-gray-400 text-sm">Loading...</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {data?.recentMovements.slice(0, 8).map(mv => (
                    <div key={mv.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{mv.inventoryItem?.name}</p>
                        <p className="text-xs text-gray-500">{mv.createdByUser?.name} · {format(new Date(mv.createdAt), 'dd MMM, h:mm a')}</p>
                      </div>
                      <div className="text-right">
                        <span className={clsx('text-sm font-semibold', movementColor[mv.type] ?? 'text-gray-600')}>
                          {mv.quantity > 0 ? '+' : ''}{mv.quantity.toFixed(2)}
                        </span>
                        <p className="text-xs text-gray-400">{mv.type.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: '/inventory/items', label: 'Manage Items', icon: Package },
              { href: '/inventory/suppliers', label: 'Suppliers', icon: TrendingUp },
              { href: '/inventory/purchase-orders', label: 'Purchase Orders', icon: ArrowRight },
              { href: '/wastage', label: 'Wastage', icon: XCircle },
            ].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-indigo-300 hover:shadow-sm transition text-center">
                <Icon size={20} className="text-indigo-600" />
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
