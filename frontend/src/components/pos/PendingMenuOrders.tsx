'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Order } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { statusColors } from '@/lib/orderStatus';
import { Smartphone, Utensils, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PendingMenuOrders({ onClose }: { onClose: () => void }) {
  const cart = useCart();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['orders', 'menu-pending'],
    queryFn: () => api.get('/orders', { params: { source: 'menu', isPaid: 'false' } }).then(r => r.data),
    refetchInterval: 10000,
  });

  const load = (order: Order) => {
    cart.loadOrder(order);
    toast.success(`Loaded order ${order.orderNumber} into cart`);
    onClose();
  };

  return (
    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
      {isLoading ? (
        <p className="text-center text-gray-400 py-8 text-sm">Loading...</p>
      ) : orders.length === 0 ? (
        <div className="text-center text-gray-400 py-10">
          <Smartphone size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No pending online orders</p>
        </div>
      ) : orders.map(order => (
        <button
          key={order.id}
          onClick={() => load(order)}
          className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            {order.orderType === 'DINE_IN' ? <Utensils size={16} /> : <ShoppingBag size={16} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-indigo-600">{order.orderNumber}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[order.status]}`}>{order.status}</span>
            </div>
            <p className="text-xs text-gray-500 truncate">
              {order.customer?.name || 'Guest'} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
              {order.notes && ` · ${order.notes}`}
            </p>
          </div>
          <span className="font-bold text-sm text-gray-800 flex-shrink-0">₹{order.totalAmount.toFixed(2)}</span>
        </button>
      ))}
    </div>
  );
}
