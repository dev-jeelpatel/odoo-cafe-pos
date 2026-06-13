'use client';
import { useQuery } from '@tanstack/react-query';
import { Order } from '@/types';
import api from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { getSocket } from '@/lib/socket';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { statusColors } from '@/lib/orderStatus';
import clsx from 'clsx';
import { Smartphone } from 'lucide-react';

interface Props {
  onSelect: (order: Order) => void;
}

export default function PendingMenuOrders({ onSelect }: Props) {
  const qc = useQueryClient();
  const { loadOrder } = useCart();

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['pending-menu-orders'],
    queryFn: () => api.get('/orders', { params: { source: 'menu', isPaid: false } }).then(r => r.data),
  });

  useEffect(() => {
    const socket = getSocket();
    const refresh = () => qc.invalidateQueries({ queryKey: ['pending-menu-orders'] });
    socket.on('order:updated', refresh);
    socket.on('kitchen:new-order', refresh);
    return () => { socket.off('order:updated', refresh); socket.off('kitchen:new-order', refresh); };
  }, [qc]);

  const select = (order: Order) => {
    loadOrder(order);
    onSelect(order);
  };

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {orders.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm">No pending customer orders</p>
      ) : orders.map(order => (
        <button
          key={order._id}
          onClick={() => select(order)}
          className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-colors flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Smartphone size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-indigo-600">{order.orderNumber}</span>
              <span className={clsx('badge capitalize', statusColors[order.status])}>{order.status}</span>
            </div>
            <p className="text-xs text-gray-500 truncate">
              {order.customer?.name || 'Guest'} · {order.customer?.phone}
              {order.notes && ` · ${order.notes}`}
            </p>
            <p className="text-xs text-gray-400">{order.items.length} item{order.items.length > 1 ? 's' : ''} · <span className="capitalize">{order.type}</span></p>
          </div>
          <span className="font-bold text-sm">₹{order.total.toFixed(2)}</span>
        </button>
      ))}
    </div>
  );
}
