'use client';
import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { Product, CartItem, Table, Customer, Coupon, Promotion, Order } from '@/types';

interface CartContextType {
  items: CartItem[];
  selectedTable: Table | null;
  selectedCustomer: Customer | null;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  notes: string;
  coupon: Coupon | null;
  couponDiscount: number;
  promotion: Promotion | null;
  promotionDiscount: number;
  currentOrderId: string | null;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  setSelectedTable: (table: Table | null) => void;
  setSelectedCustomer: (customer: Customer | null) => void;
  setOrderType: (type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY') => void;
  setNotes: (notes: string) => void;
  setCoupon: (coupon: Coupon | null, discount: number) => void;
  setPromotion: (promotion: Promotion | null, discount: number) => void;
  setCurrentOrderId: (id: string | null) => void;
  loadOrder: (order: Order) => void;
  subtotal: number;
  taxAmount: number;
  total: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>('DINE_IN');
  const [notes, setNotes] = useState('');
  const [coupon, setCouponState] = useState<Coupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [promotion, setPromotionState] = useState<Promotion | null>(null);
  const [promotionDiscount, setPromotionDiscount] = useState(0);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  // Memoize totals so they only recompute when items or discount values change,
  // not on every render triggered by notes/table/customer state updates
  const subtotal = useMemo(() => items.reduce((s, i) => s + i.product.price * i.quantity, 0), [items]);
  const taxAmount = useMemo(() => items.reduce((s, i) => s + (i.product.price * i.quantity * i.product.tax) / 100, 0), [items]);
  const total = useMemo(() => Math.max(0, subtotal + taxAmount - couponDiscount - promotionDiscount), [subtotal, taxAmount, couponDiscount, promotionDiscount]);

  const addItem = useCallback((product: Product) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => setItems(prev => prev.filter(i => i.product.id !== productId)), []);

  const updateQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) { setItems(prev => prev.filter(i => i.product.id !== productId)); return; }
    setItems(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]); setSelectedTable(null); setSelectedCustomer(null);
    setOrderType('DINE_IN'); setNotes('');
    setCouponState(null); setCouponDiscount(0);
    setPromotionState(null); setPromotionDiscount(0);
    setCurrentOrderId(null);
  }, []);

  const setCoupon = useCallback((c: Coupon | null, discount: number) => { setCouponState(c); setCouponDiscount(discount); }, []);
  const setPromotion = useCallback((p: Promotion | null, discount: number) => { setPromotionState(p); setPromotionDiscount(discount); }, []);

  const loadOrder = useCallback((order: Order) => {
    setItems(
      order.items
        .filter(i => i.product)
        .map(i => ({ product: i.product as Product, quantity: i.quantity }))
    );
    setSelectedTable(order.table || null);
    setSelectedCustomer(order.customer || null);
    setOrderType(order.orderType);
    setNotes(order.notes);
    setCouponState(null); setCouponDiscount(0);
    setPromotionState(null); setPromotionDiscount(0);
    setCurrentOrderId(order.id);
  }, []);

  // Memoize the context value to prevent every consumer re-rendering
  // when unrelated state (notes, table, customer) changes
  const ctx = useMemo(() => ({
    items, selectedTable, selectedCustomer, orderType, notes,
    coupon, couponDiscount, promotion, promotionDiscount, currentOrderId,
    addItem, removeItem, updateQty, clearCart,
    setSelectedTable, setSelectedCustomer, setOrderType, setNotes,
    setCoupon, setPromotion, setCurrentOrderId, loadOrder,
    subtotal, taxAmount, total,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [items, selectedTable, selectedCustomer, orderType, notes, coupon, couponDiscount,
      promotion, promotionDiscount, currentOrderId, subtotal, taxAmount, total]);

  return (
    <CartContext.Provider value={ctx}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
