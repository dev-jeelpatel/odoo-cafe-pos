'use client';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Order } from '@/types';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { ChefHat, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STAGES: { key: Order['kitchenStatus']; label: string; color: string }[] = [
  { key: 'to-cook', label: 'To Cook', color: 'border-red-400 bg-red-50' },
  { key: 'preparing', label: 'Preparing', color: 'border-yellow-400 bg-yellow-50' },
  { key: 'completed', label: 'Completed', color: 'border-green-400 bg-green-50' },
];

const NEXT: Record<string, Order['kitchenStatus']> = { 'to-cook': 'preparing', preparing: 'completed' };

export default function KDSPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['kds-orders'],
    queryFn: () => api.get('/orders', { params: { kitchenStatus: undefined } }).then(r =>
      r.data.filter((o: Order) => ['to-cook', 'preparing', 'completed'].includes(o.kitchenStatus))
    ),
    refetchInterval: 10000,
  });

  useEffect(() => {
    const socket = getSocket();
    socket.on('kitchen:new-order', () => qc.invalidateQueries({ queryKey: ['kds-orders'] }));
    socket.on('kitchen:status-update', () => qc.invalidateQueries({ queryKey: ['kds-orders'] }));
    socket.on('kitchen:item-update', () => qc.invalidateQueries({ queryKey: ['kds-orders'] }));
    return () => {
      socket.off('kitchen:new-order');
      socket.off('kitchen:status-update');
      socket.off('kitchen:item-update');
    };
  }, [qc]);

  const moveStage = async (order: Order) => {
    const next = NEXT[order.kitchenStatus];
    if (!next) return;
    try {
      await api.put(`/orders/${order._id}/kitchen-status`, { kitchenStatus: next });
      qc.invalidateQueries({ queryKey: ['kds-orders'] });
      toast.success(`Order ${order.orderNumber} → ${next}`);
    } catch { toast.error('Failed to update'); }
  };

  const toggleItem = async (order: Order, itemId: string, current: boolean) => {
    await api.put(`/orders/${order._id}/items/${itemId}/kitchen-complete`, { kitchenCompleted: !current });
    qc.invalidateQueries({ queryKey: ['kds-orders'] });
  };

  const filtered = orders.filter(o =>
    !search || o.orderNumber.includes(search) || o.items.some(i => i.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 px-6 py-4 flex items-center gap-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="bg-orange-500 p-2 rounded-xl"><ChefHat size={22} /></div>
          <h1 className="text-xl font-bold">Kitchen Display System</h1>
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order or item..." className="bg-gray-700 border border-gray-600 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-56" />
        </div>
      </header>

      <div className="grid grid-cols-3 gap-4 p-4 h-[calc(100vh-73px)]">
        {STAGES.map(stage => {
          const stageOrders = filtered.filter(o => o.kitchenStatus === stage.key);
          return (
            <div key={stage.key} className="flex flex-col">
              <div className={clsx('text-center py-2 rounded-t-xl font-bold text-sm border-t-4', stage.color, 'text-gray-800')}>
                {stage.label} ({stageOrders.length})
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pt-3">
                {stageOrders.map(order => (
                  <div key={order._id} className="bg-gray-800 border border-gray-600 rounded-xl overflow-hidden hover:border-gray-400 transition-colors">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-700 cursor-pointer" onClick={() => moveStage(order)}>
                      <div>
                        <span className="font-bold text-orange-400 font-mono">{order.orderNumber}</span>
                        {order.table && <span className="text-gray-400 text-xs ml-2">T{order.table.number}</span>}
                      </div>
                      <div className="text-xs text-gray-400">
                        {order.type}
                        {stage.key !== 'completed' && <span className="ml-2 text-orange-400">→ Click to advance</span>}
                      </div>
                    </div>
                    <div className="p-3 space-y-1.5">
                      {order.items.map(item => (
                        <div key={item._id} className="flex items-center gap-2 cursor-pointer" onClick={() => toggleItem(order, item._id, item.kitchenCompleted)}>
                          <div className={clsx('w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors', item.kitchenCompleted ? 'bg-green-500 border-green-500' : 'border-gray-500 hover:border-green-400')}>
                            {item.kitchenCompleted && <span className="text-white text-xs">✓</span>}
                          </div>
                          <span className={clsx('text-sm', item.kitchenCompleted && 'line-through text-gray-500')}>
                            <span className="font-bold text-white">{item.quantity}×</span> {item.name}
                          </span>
                          {item.categoryColor && <span className="ml-auto w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.categoryColor }} />}
                        </div>
                      ))}
                    </div>
                    {order.notes && (
                      <div className="px-3 pb-2 text-xs text-yellow-400 italic">📝 {order.notes}</div>
                    )}
                  </div>
                ))}
                {stageOrders.length === 0 && (
                  <div className="text-center text-gray-600 py-8 text-sm">No orders</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
