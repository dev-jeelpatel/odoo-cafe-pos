'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Product, CartItem, Table, Customer, Coupon, Promotion } from '@/types';

interface CartContextType {
  items: CartItem[];
  selectedTable: Table | null;
  selectedCustomer: Customer | null;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
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
  setOrderType: (type: 'dine-in' | 'takeaway' | 'delivery') => void;
  setNotes: (notes: string) => void;
  setCoupon: (coupon: Coupon | null, discount: number) => void;
  setPromotion: (promotion: Promotion | null, discount: number) => void;
  setCurrentOrderId: (id: string | null) => void;
  subtotal: number;
  taxAmount: number;
  total: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway' | 'delivery'>('dine-in');
  const [notes, setNotes] = useState('');
  const [coupon, setCouponState] = useState<Coupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [promotion, setPromotionState] = useState<Promotion | null>(null);
  const [promotionDiscount, setPromotionDiscount] = useState(0);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const taxAmount = items.reduce((s, i) => s + (i.product.price * i.quantity * i.product.tax) / 100, 0);
  const total = Math.max(0, subtotal + taxAmount - couponDiscount - promotionDiscount);

  const addItem = (product: Product) => {
    setItems(prev => {
      const existing = prev.find(i => i.product._id === product._id);
      if (existing) return prev.map(i => i.product._id === product._id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeItem = (productId: string) => setItems(prev => prev.filter(i => i.product._id !== productId));

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) { removeItem(productId); return; }
    setItems(prev => prev.map(i => i.product._id === productId ? { ...i, quantity: qty } : i));
  };

  const clearCart = () => {
    setItems([]);
    setSelectedTable(null);
    setSelectedCustomer(null);
    setOrderType('dine-in');
    setNotes('');
    setCouponState(null);
    setCouponDiscount(0);
    setPromotionState(null);
    setPromotionDiscount(0);
    setCurrentOrderId(null);
  };

  const setCoupon = (c: Coupon | null, discount: number) => { setCouponState(c); setCouponDiscount(discount); };
  const setPromotion = (p: Promotion | null, discount: number) => { setPromotionState(p); setPromotionDiscount(discount); };

  return (
    <CartContext.Provider value={{
      items, selectedTable, selectedCustomer, orderType, notes,
      coupon, couponDiscount, promotion, promotionDiscount, currentOrderId,
      addItem, removeItem, updateQty, clearCart,
      setSelectedTable, setSelectedCustomer, setOrderType, setNotes,
      setCoupon, setPromotion, setCurrentOrderId,
      subtotal, taxAmount, total,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
