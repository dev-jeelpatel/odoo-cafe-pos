'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Category, Product } from '@/types';
import Modal from '@/components/ui/Modal';
import { Search, Plus, Minus, ShoppingBag, Coffee, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface MenuCartItem {
  product: Product;
  quantity: number;
}

export default function CustomerMenuPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [cart, setCart] = useState<Record<string, MenuCartItem>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', orderType: 'dine-in' as 'dine-in' | 'takeaway', tableNumber: '', notes: '' });

  const { data, isLoading } = useQuery<{ categories: Category[]; products: Product[] }>({
    queryKey: ['public-menu'],
    queryFn: () => api.get('/public/menu').then(r => r.data),
  });

  const categories = data?.categories || [];
  const products = data?.products || [];

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = activeCategory === 'all' || p.category?._id === activeCategory;
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, search]);

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cartItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const taxAmount = cartItems.reduce((s, i) => s + (i.product.price * i.quantity * i.product.tax) / 100, 0);
  const total = subtotal + taxAmount;

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev[product._id];
      return { ...prev, [product._id]: { product, quantity: (existing?.quantity || 0) + 1 } };
    });
  };

  const updateQty = (productId: string, qty: number) => {
    setCart(prev => {
      if (qty <= 0) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: { ...prev[productId], quantity: qty } };
    });
  };

  const placeOrder = async () => {
    if (cartItems.length === 0) return;
    if (form.orderType === 'dine-in' && !form.tableNumber.trim()) {
      toast.error('Please enter your table number');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        items: cartItems.map(i => ({ product: i.product._id, quantity: i.quantity })),
        type: form.orderType,
        tableNumber: form.orderType === 'dine-in' ? form.tableNumber : undefined,
        notes: form.notes,
        customerName: form.name,
        customerPhone: form.phone,
      };
      const res = await api.post('/public/orders', payload);
      toast.success('Order placed!');
      router.push(`/menu/order/${res.data._id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
            <Coffee size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-gray-900">Our Menu</h1>
            <p className="text-xs text-gray-500">Browse &amp; order directly from your table</p>
          </div>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search for dishes, drinks..."
              className="input pl-9"
            />
          </div>
        </div>
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveCategory('all')}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeCategory === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All
          </button>
          {categories.map(c => (
            <button
              key={c._id}
              onClick={() => setActiveCategory(c._id)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeCategory === c._id ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              style={activeCategory === c._id ? { backgroundColor: c.color } : undefined}
            >
              {c.name}
            </button>
          ))}
        </div>
      </header>

      {/* Products */}
      <main className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No items found</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProducts.map(p => {
              const qty = cart[p._id]?.quantity || 0;
              return (
                <div key={p._id} className="card flex flex-col">
                  <div
                    className="h-20 rounded-lg flex items-center justify-center text-2xl font-bold mb-2"
                    style={{ backgroundColor: `${p.category?.color || '#6366f1'}1A`, color: p.category?.color || '#6366f1' }}
                  >
                    {p.name[0].toUpperCase()}
                  </div>
                  <p className="font-semibold text-sm text-gray-900 line-clamp-2 min-h-[2.5em]">{p.name}</p>
                  {p.description && <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{p.description}</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-bold text-indigo-600">₹{p.price.toFixed(2)}</span>
                    {qty === 0 ? (
                      <button onClick={() => addToCart(p)} className="bg-indigo-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1">
                        <Plus size={14} /> Add
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-indigo-50 rounded-lg px-1">
                        <button onClick={() => updateQty(p._id, qty - 1)} className="p-1 text-indigo-600 hover:bg-indigo-100 rounded"><Minus size={14} /></button>
                        <span className="text-sm font-semibold w-4 text-center">{qty}</span>
                        <button onClick={() => updateQty(p._id, qty + 1)} className="p-1 text-indigo-600 hover:bg-indigo-100 rounded"><Plus size={14} /></button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-3">
          <button
            onClick={() => setCartOpen(true)}
            className="max-w-5xl mx-auto w-full bg-indigo-600 text-white rounded-xl shadow-lg px-5 py-3.5 flex items-center justify-between hover:bg-indigo-700 transition-colors"
          >
            <span className="flex items-center gap-2 font-medium">
              <ShoppingBag size={18} />
              {cartCount} item{cartCount > 1 ? 's' : ''}
            </span>
            <span className="font-bold">View Cart · ₹{total.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
          <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-semibold text-lg">Your Order</h2>
              <button onClick={() => setCartOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {cartItems.length === 0 ? (
                <p className="text-center text-gray-400 py-10">Your cart is empty</p>
              ) : cartItems.map(({ product, quantity }) => (
                <div key={product._id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <p className="text-xs text-gray-400">₹{product.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-1 shrink-0">
                    <button onClick={() => updateQty(product._id, quantity - 1)} className="p-1 text-gray-600 hover:bg-gray-200 rounded"><Minus size={14} /></button>
                    <span className="text-sm font-semibold w-4 text-center">{quantity}</span>
                    <button onClick={() => updateQty(product._id, quantity + 1)} className="p-1 text-gray-600 hover:bg-gray-200 rounded"><Plus size={14} /></button>
                  </div>
                  <span className="font-semibold text-sm w-16 text-right shrink-0">₹{(product.price * quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            {cartItems.length > 0 && (
              <div className="border-t border-gray-100 p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax</span><span>₹{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-100">
                  <span>Total</span><span>₹{total.toFixed(2)}</span>
                </div>
                <button onClick={() => { setCartOpen(false); setCheckoutOpen(true); }} className="btn-primary w-full mt-2">
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout modal */}
      <Modal isOpen={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Checkout" size="sm">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setForm(f => ({ ...f, orderType: 'dine-in' }))}
              className={`py-2 rounded-lg text-sm font-medium border transition-colors ${form.orderType === 'dine-in' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600'}`}
            >
              Dine-in
            </button>
            <button
              onClick={() => setForm(f => ({ ...f, orderType: 'takeaway' }))}
              className={`py-2 rounded-lg text-sm font-medium border transition-colors ${form.orderType === 'takeaway' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600'}`}
            >
              Takeaway
            </button>
          </div>
          {form.orderType === 'dine-in' && (
            <input value={form.tableNumber} onChange={e => setForm(f => ({ ...f, tableNumber: e.target.value }))} placeholder="Table number" className="input" />
          )}
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" className="input" />
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" className="input" />
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Special instructions (optional)" className="input" rows={2} />

          <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
            <span>Total</span><span>₹{total.toFixed(2)}</span>
          </div>
          <button onClick={placeOrder} disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Placing order...' : 'Place Order'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
