'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PaymentMethod } from '@/types';
import { useCart } from '@/contexts/CartContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { CreditCard, Banknote, QrCode, Plus, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PayEntry { method: 'cash' | 'upi' | 'card'; amount: number; transactionId?: string; reference?: string; }

const icons: Record<string, React.ReactNode> = {
  cash: <Banknote size={18} />,
  upi: <QrCode size={18} />,
  card: <CreditCard size={18} />,
};

export default function PaymentModal({ isOpen, onClose, onSuccess }: Props) {
  const cart = useCart();
  const [payments, setPayments] = useState<PayEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [activeMethod, setActiveMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [upiRef, setUpiRef] = useState('');
  const [cardTxId, setCardTxId] = useState('');

  const { data: methods = [] } = useQuery<PaymentMethod[]>({
    queryKey: ['payment-methods'],
    queryFn: () => api.get('/payment-methods').then(r => r.data),
  });

  const enabledMethods = methods.filter(m => m.isEnabled);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, cart.total - totalPaid);
  const change = Math.max(0, totalPaid - cart.total);

  const addPayment = () => {
    const amount = activeMethod === 'cash' ? parseFloat(cashReceived) || remaining : remaining;
    if (amount <= 0) return;
    setPayments(prev => [...prev, {
      method: activeMethod,
      amount,
      transactionId: cardTxId || undefined,
      reference: upiRef || undefined,
    }]);
    setCashReceived('');
    setUpiRef('');
    setCardTxId('');
  };

  const processPayment = async () => {
    if (payments.length === 0) { toast.error('Add at least one payment'); return; }
    if (totalPaid < cart.total) { toast.error('Insufficient payment amount'); return; }
    setProcessing(true);
    try {
      let orderId = cart.currentOrderId;
      if (!orderId) {
        const { data } = await api.post('/orders', {
          table: cart.selectedTable?._id,
          customer: cart.selectedCustomer?._id,
          type: cart.orderType,
          notes: cart.notes,
          items: cart.items.map(i => ({ product: i.product._id, name: i.product.name, price: i.product.price, quantity: i.quantity, tax: i.product.tax })),
          subtotal: cart.subtotal, taxAmount: cart.taxAmount,
          promotionDiscount: cart.promotionDiscount, couponDiscount: cart.couponDiscount,
          total: cart.total,
        });
        orderId = data._id;
      }
      await api.post(`/orders/${orderId}/payment`, { payments });
      toast.success('Payment successful!');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-5 border-b">
          <h2 className="text-lg font-bold">Process Payment</h2>
          <p className="text-2xl font-bold text-indigo-600 mt-1">₹{cart.total.toFixed(2)}</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Method selector */}
          <div className="flex gap-2">
            {enabledMethods.map(m => (
              <button key={m._id} onClick={() => setActiveMethod(m.name)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeMethod === m.name ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {icons[m.name]} {m.label}
              </button>
            ))}
          </div>

          {/* Method inputs */}
          {activeMethod === 'cash' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Cash Received</label>
              <input type="number" value={cashReceived} onChange={e => setCashReceived(e.target.value)} placeholder={`₹${remaining.toFixed(2)}`} className="input text-lg font-bold" />
              {parseFloat(cashReceived) > cart.total && (
                <p className="text-green-600 text-sm">Change: ₹{(parseFloat(cashReceived) - cart.total + totalPaid - remaining).toFixed(2)}</p>
              )}
            </div>
          )}
          {activeMethod === 'upi' && (
            <div className="space-y-3">
              <div className="flex justify-center">
                <QRCodeSVG value={`upi://pay?amount=${remaining}&cu=INR`} size={140} />
              </div>
              <input value={upiRef} onChange={e => setUpiRef(e.target.value)} placeholder="UPI Reference number" className="input" />
            </div>
          )}
          {activeMethod === 'card' && (
            <div className="space-y-2">
              <input value={cardTxId} onChange={e => setCardTxId(e.target.value)} placeholder="Transaction ID" className="input" />
            </div>
          )}

          <button onClick={addPayment} disabled={remaining <= 0} className="w-full btn-secondary flex items-center justify-center gap-2">
            <Plus size={16} /> Add ₹{activeMethod === 'cash' ? (parseFloat(cashReceived) || remaining).toFixed(2) : remaining.toFixed(2)} {enabledMethods.find(m => m.name === activeMethod)?.label}
          </button>

          {/* Payment list */}
          {payments.length > 0 && (
            <div className="space-y-1">
              {payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-sm capitalize">{p.method}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">₹{p.amount.toFixed(2)}</span>
                    <button onClick={() => setPayments(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between font-bold text-sm pt-1 border-t">
                <span>Total Paid</span><span>₹{totalPaid.toFixed(2)}</span>
              </div>
              {remaining > 0 && <p className="text-red-500 text-xs text-right">Remaining: ₹{remaining.toFixed(2)}</p>}
              {change > 0 && <p className="text-green-600 text-sm text-right font-medium">Change: ₹{change.toFixed(2)}</p>}
            </div>
          )}
        </div>

        <div className="p-5 border-t flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={processPayment} disabled={processing || totalPaid < cart.total} className="btn-primary flex-1 py-3">
            {processing ? 'Processing...' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
