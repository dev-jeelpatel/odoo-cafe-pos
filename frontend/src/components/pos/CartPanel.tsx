'use client';
import { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { Minus, Plus, Trash2, Tag, Ticket, ChefHat, CreditCard, Table2, Smartphone, X, ShoppingBag } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import TableSelector from './TableSelector';
import CustomerSearch from './CustomerSearch';
import PaymentModal from './PaymentModal';
import PendingMenuOrders from './PendingMenuOrders';
import clsx from 'clsx';

const ORDER_TYPES: Array<{ value: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'; label: string }> = [
  { value: 'DINE_IN', label: 'Dine-In' },
  { value: 'TAKEAWAY', label: 'Takeaway' },
  { value: 'DELIVERY', label: 'Delivery' },
];

export default function CartPanel() {
  const qc = useQueryClient();
  const cart = useCart();
  const [tableModal, setTableModal] = useState(false);
  const [customerModal, setCustomerModal] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [menuOrdersModal, setMenuOrdersModal] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);
  const [sendingKitchen, setSendingKitchen] = useState(false);
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);
  const [editingQtyValue, setEditingQtyValue] = useState('');

  const itemCount = cart.items.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && cart.items.length > 0 && !payModal) {
        e.preventDefault();
        setPayModal(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cart.items.length, payModal]);

  const commitQtyEdit = (productId: string) => {
    const qty = parseInt(editingQtyValue, 10);
    if (!isNaN(qty)) cart.updateQty(productId, qty);
    setEditingQtyId(null);
  };

  const buildOrderPayload = () => ({
    tableId: cart.selectedTable?.id || null,
    customerId: cart.selectedCustomer?.id || null,
    orderType: cart.orderType,
    notes: cart.notes,
    items: cart.items.map(i => ({
      productId: i.product.id,
      name: i.product.name,
      productName: i.product.name,
      price: i.product.price,
      quantity: i.quantity,
      tax: i.product.tax,
      categoryColor: i.product.category?.color,
    })),
    promotionDiscount: cart.promotionDiscount,
    couponDiscount: cart.couponDiscount,
    couponCode: cart.coupon?.code,
    promotionId: cart.promotion?.id,
  });

  const applyCoupon = async () => {
    if (!couponInput) return;
    try {
      const { data } = await api.post('/orders/apply-coupon', { code: couponInput, subtotal: cart.subtotal });
      cart.setCoupon(data.coupon, data.discount);
      toast.success(`Coupon applied! -₹${data.discount.toFixed(2)}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid coupon');
    }
  };

  const checkPromotions = async () => {
    if (cart.items.length === 0) return;
    try {
      const { data } = await api.post('/orders/apply-promotions', {
        items: cart.items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
        subtotal: cart.subtotal,
      });
      if (data.promotion) {
        cart.setPromotion(data.promotion, data.discount);
        toast.success(`Promotion applied: ${data.promotion.name} (-₹${data.discount.toFixed(2)})`);
      } else {
        toast('No promotions available for this order');
      }
    } catch {}
  };

  const saveOrder = async () => {
    if (cart.items.length === 0) { toast.error('Add items to cart'); return; }
    setSavingOrder(true);
    try {
      if (cart.currentOrderId) {
        await api.put(`/orders/${cart.currentOrderId}`, buildOrderPayload());
      } else {
        const { data } = await api.post('/orders', buildOrderPayload());
        cart.setCurrentOrderId(data.id);
      }
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order saved as draft');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save order');
    } finally {
      setSavingOrder(false);
    }
  };

  const sendToKitchen = async () => {
    if (cart.items.length === 0) { toast.error('Add items to cart'); return; }
    setSendingKitchen(true);
    try {
      let orderId = cart.currentOrderId;
      if (!orderId) {
        const { data } = await api.post('/orders', buildOrderPayload());
        orderId = data.id;
        cart.setCurrentOrderId(orderId);
      } else {
        await api.put(`/orders/${orderId}`, buildOrderPayload());
      }
      await api.post(`/orders/${orderId}/send-to-kitchen`);
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order sent to kitchen!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send to kitchen');
    } finally {
      setSendingKitchen(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Order type & table/customer */}
      <div className="p-3 border-b border-gray-100 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
            <ShoppingBag size={15} className="text-gray-400" /> Current Order
          </h2>
          {itemCount > 0 && (
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="flex gap-1.5">
          {ORDER_TYPES.map(t => (
            <button key={t.value} onClick={() => cart.setOrderType(t.value)} className={clsx('flex-1 py-1.5 text-xs rounded-lg font-medium transition-colors', cart.orderType === t.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600')}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTableModal(true)} className={clsx('flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg flex-1 justify-center font-medium transition-colors', cart.selectedTable ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-gray-100 text-gray-600')}>
            <Table2 size={14} /> {cart.selectedTable ? `Table ${cart.selectedTable.tableNumber}` : 'Select Table'}
          </button>
          <button onClick={() => setCustomerModal(true)} className={clsx('flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg flex-1 justify-center font-medium transition-colors', cart.selectedCustomer ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600')}>
            {cart.selectedCustomer ? cart.selectedCustomer.name : 'Add Customer'}
          </button>
        </div>
        <button onClick={() => setMenuOrdersModal(true)} className="w-full flex items-center justify-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium hover:bg-indigo-100 transition-colors">
          <Smartphone size={14} /> Customer Orders (Online)
        </button>
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.items.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <ChefHat size={40} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Cart is empty</p>
          </div>
        ) : cart.items.map(item => (
          <div key={item.product.id} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5">
            <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: item.product.category?.color || '#6366f1' }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{item.product.name}</p>
              <p className="text-xs text-gray-500">₹{item.product.price} each</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => cart.updateQty(item.product.id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300">
                <Minus size={12} />
              </button>
              {editingQtyId === item.product.id ? (
                <input
                  type="number"
                  min={1}
                  autoFocus
                  value={editingQtyValue}
                  onChange={e => setEditingQtyValue(e.target.value)}
                  onBlur={() => commitQtyEdit(item.product.id)}
                  onKeyDown={e => { if (e.key === 'Enter') commitQtyEdit(item.product.id); if (e.key === 'Escape') setEditingQtyId(null); }}
                  className="text-sm font-bold w-10 text-center border border-indigo-300 rounded-md py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              ) : (
                <span
                  onClick={() => { setEditingQtyId(item.product.id); setEditingQtyValue(String(item.quantity)); }}
                  className="text-sm font-bold w-5 text-center cursor-pointer hover:text-indigo-600"
                  title="Click to edit quantity"
                >
                  {item.quantity}
                </span>
              )}
              <button onClick={() => cart.updateQty(item.product.id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700">
                <Plus size={12} />
              </button>
            </div>
            <div className="text-right min-w-[50px]">
              <p className="text-sm font-bold text-gray-800">₹{(item.product.price * item.quantity).toFixed(0)}</p>
            </div>
            <button onClick={() => cart.removeItem(item.product.id)} className="p-1 hover:bg-red-100 rounded-lg text-red-400">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="px-3 pb-2">
        <textarea value={cart.notes} onChange={e => cart.setNotes(e.target.value)} placeholder="Order notes (No onion, Extra cheese...)" rows={2} className="input text-xs resize-none" />
      </div>

      {/* Discounts */}
      <div className="px-3 pb-2 space-y-2">
        {cart.coupon ? (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5 text-xs">
            <span className="flex items-center gap-1.5 text-green-700 font-medium">
              <Ticket size={12} /> {cart.coupon.code} (-₹{cart.couponDiscount.toFixed(2)})
            </span>
            <button onClick={() => cart.setCoupon(null, 0)} className="text-green-600 hover:text-green-800">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input value={couponInput} onChange={e => setCouponInput(e.target.value.toUpperCase())} placeholder="Coupon code" className="input text-xs flex-1" />
            <button onClick={applyCoupon} className="btn-secondary text-xs px-3 flex items-center gap-1">
              <Ticket size={12} /> Apply
            </button>
          </div>
        )}
        {cart.promotion ? (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5 text-xs">
            <span className="flex items-center gap-1.5 text-green-700 font-medium truncate">
              <Tag size={12} className="flex-shrink-0" /> {cart.promotion.name} (-₹{cart.promotionDiscount.toFixed(2)})
            </span>
            <button onClick={() => cart.setPromotion(null, 0)} className="text-green-600 hover:text-green-800 flex-shrink-0">
              <X size={14} />
            </button>
          </div>
        ) : (
          <button onClick={checkPromotions} className="w-full text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 justify-center py-1">
            <Tag size={12} /> Check Promotions
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="border-t border-gray-100 px-3 py-2 space-y-1 text-sm">
        <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{cart.subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between text-gray-500"><span>Tax</span><span>₹{cart.taxAmount.toFixed(2)}</span></div>
        {cart.promotionDiscount > 0 && <div className="flex justify-between text-green-600"><span>Promotion</span><span>-₹{cart.promotionDiscount.toFixed(2)}</span></div>}
        {cart.couponDiscount > 0 && <div className="flex justify-between text-green-600"><span>Coupon ({cart.coupon?.code})</span><span>-₹{cart.couponDiscount.toFixed(2)}</span></div>}
        <div className="flex justify-between font-bold text-gray-900 text-base border-t pt-1.5 mt-1">
          <span>Total</span><span>₹{cart.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={saveOrder} disabled={savingOrder || cart.items.length === 0} className="btn-secondary text-sm py-2">
            {savingOrder ? 'Saving...' : 'Save Draft'}
          </button>
          <button onClick={sendToKitchen} disabled={sendingKitchen || cart.items.length === 0} className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 font-medium text-sm flex items-center justify-center gap-1.5 disabled:opacity-50">
            <ChefHat size={16} /> {sendingKitchen ? 'Sending...' : 'To Kitchen'}
          </button>
        </div>
        <button onClick={() => setPayModal(true)} disabled={cart.items.length === 0} title="Ctrl+Enter" className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base">
          <CreditCard size={18} /> Charge ₹{cart.total.toFixed(2)}
        </button>
        {cart.items.length > 0 && (
          <button onClick={cart.clearCart} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">Clear Cart</button>
        )}
      </div>

      <Modal isOpen={tableModal} onClose={() => setTableModal(false)} title="Select Table" size="lg">
        <TableSelector onClose={() => setTableModal(false)} />
      </Modal>
      <Modal isOpen={customerModal} onClose={() => setCustomerModal(false)} title="Customer">
        <CustomerSearch onClose={() => setCustomerModal(false)} />
      </Modal>
      <Modal isOpen={menuOrdersModal} onClose={() => setMenuOrdersModal(false)} title="Customer Orders (Online)" size="lg">
        <PendingMenuOrders onClose={() => setMenuOrdersModal(false)} />
      </Modal>
      {payModal && (
        <PaymentModal isOpen={payModal} onClose={() => setPayModal(false)} onSuccess={() => { setPayModal(false); cart.clearCart(); qc.invalidateQueries({ queryKey: ['orders'] }); }} />
      )}
    </div>
  );
}
