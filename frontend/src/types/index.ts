export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee' | 'cashier';
  isArchived: boolean;
  createdAt: string;
}

export interface Category {
  _id: string;
  name: string;
  color: string;
}

export interface Product {
  _id: string;
  name: string;
  category: Category;
  price: number;
  unit: 'piece' | 'kg' | 'liter';
  tax: number;
  description: string;
  isAvailable: boolean;
}

export interface Floor {
  _id: string;
  name: string;
}

export interface Table {
  _id: string;
  number: string;
  seats: number;
  floor: Floor;
  status: 'available' | 'occupied' | 'reserved' | 'disabled';
  isActive: boolean;
}

export interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

export interface Coupon {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isActive: boolean;
}

export interface Promotion {
  _id: string;
  name: string;
  type: 'product' | 'order';
  conditionProduct?: Product;
  conditionQty?: number;
  conditionOrderValue?: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isActive: boolean;
}

export interface PaymentMethod {
  _id: string;
  name: 'cash' | 'upi' | 'card';
  label: string;
  isEnabled: boolean;
}

export interface OrderItem {
  _id: string;
  product: string;
  name: string;
  price: number;
  quantity: number;
  tax: number;
  kitchenCompleted: boolean;
  categoryColor?: string;
}

export interface PaymentEntry {
  method: 'cash' | 'upi' | 'card';
  amount: number;
  transactionId?: string;
  reference?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  table?: Table;
  customer?: Customer;
  waiter?: User;
  session?: string;
  items: OrderItem[];
  notes: string;
  type: 'dine-in' | 'takeaway' | 'delivery';
  status: 'draft' | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
  kitchenStatus: 'pending' | 'to-cook' | 'preparing' | 'completed';
  subtotal: number;
  taxAmount: number;
  promotionDiscount: number;
  couponDiscount: number;
  total: number;
  couponCode?: string;
  appliedPromotion?: Promotion;
  payments: PaymentEntry[];
  isPaid: boolean;
  createdAt: string;
}

export interface Session {
  _id: string;
  user: User | string;
  openedAt: string;
  closedAt?: string;
  isOpen: boolean;
  summary?: {
    totalSales: number;
    totalOrders: number;
    cashAmount: number;
    upiAmount: number;
    cardAmount: number;
    taxCollected: number;
    discountsApplied: number;
  };
}

export interface CartItem {
  product: Product;
  quantity: number;
}
