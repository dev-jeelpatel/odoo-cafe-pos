'use client';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { CheckCircle2, Clock, ChefHat, Bell, PartyPopper } from 'lucide-react';

interface PublicOrder {
  id: string;
  orderNumber: string;
  status: string;
  kitchenStatus: string;
  orderType: string;
  items: { productName: string; unitPrice: number; quantity: number; totalPrice: number }[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: string;
}

const STEPS = [
  { key: 'PENDING', label: 'Order Placed', icon: CheckCircle2 },
  { key: 'PREPARING', label: 'Preparing', icon: ChefHat },
  { key: 'READY', label: 'Ready', icon: Bell },
  { key: 'COMPLETED', label: 'Completed', icon: PartyPopper },
];

function stepIndex(status: string, kitchenStatus: string) {
  if (status === 'COMPLETED' || status === 'SERVED') return 3;
  if (status === 'READY' || kitchenStatus === 'COMPLETED') return 2;
  if (status === 'PREPARING' || kitchenStatus === 'PREPARING' || kitchenStatus === 'TO_COOK') return 1;
  return 0;
}

export default function OrderStatusPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: order, isLoading } = useQuery<PublicOrder>({
    queryKey: ['public-order', id],
    queryFn: () => api.get(`/public/orders/${id}`).then(r => r.data),
    refetchInterval: 5000,
  });

  if (isLoading || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const current = stepIndex(order.status, order.kitchenStatus);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="max-w-md mx-auto p-4 pt-8">
      <div className="card text-center">
        <p className="text-sm text-gray-500">Order Number</p>
        <h1 className="text-2xl font-bold text-indigo-600">{order.orderNumber}</h1>
        <p className="text-xs text-gray-400 mt-1 capitalize">{order.orderType.replace('_', ' ').toLowerCase()} order</p>
      </div>

      {isCancelled ? (
        <div className="card mt-4 text-center text-red-600 font-medium">This order was cancelled.</div>
      ) : (
        <div className="card mt-4">
          <div className="space-y-4">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const active = idx <= current;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${active ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                  </div>
                  {idx === current && idx !== 3 && (
                    <span className="ml-auto text-xs text-indigo-600 flex items-center gap-1"><Clock size={12} /> In progress</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card mt-4">
        <h2 className="font-semibold mb-2 text-sm text-gray-700">Order Summary</h2>
        <div className="space-y-1.5">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-gray-600">{item.quantity} × {item.productName}</span>
              <span className="font-medium">₹{item.totalPrice.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 mt-2 pt-2 space-y-1">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span><span>₹{order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Tax</span><span>₹{order.taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Total</span><span>₹{order.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <button onClick={() => router.push('/menu')} className="btn-secondary w-full mt-4">
        Back to Menu
      </button>
    </div>
  );
}
