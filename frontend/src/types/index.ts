export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
  archived: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  categoryId: string;
  price: number;
  unit: 'PIECE' | 'KG' | 'LITER';
  tax: number;
  description: string;
  imageUrl?: string | null;
  active: boolean;
}

export interface Floor {
  id: string;
  name: string;
}

export interface Table {
  id: string;
  tableNumber: string;
  seats: number;
  floor: Floor;
  floorId: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'DISABLED';
  active: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt?: string;
  orderCount?: number;
  totalSpent?: number;
  lastVisit?: string | null;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  active: boolean;
  expiryDate?: string | null;
}

export interface Promotion {
  id: string;
  name: string;
  promotionType: 'PRODUCT' | 'ORDER';
  conditionProduct?: Product | null;
  conditionProductId?: string | null;
  minQuantity?: number | null;
  minOrderAmount?: number | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  active: boolean;
}

export interface PaymentMethod {
  id: string;
  method: 'CASH' | 'UPI' | 'CARD' | 'TEST';
  label: string;
  enabled: boolean;
  upiId?: string | null;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  tax: number;
  kitchenCompleted: boolean;
  categoryColor?: string | null;
  product?: Product;
}

export interface PaymentEntry {
  method: 'CASH' | 'UPI' | 'CARD' | 'TEST';
  amount: number;
  transactionId?: string;
  reference?: string;
}

export interface Payment {
  id: string;
  paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'TEST';
  amount: number;
  transactionId?: string | null;
  referenceNumber?: string | null;
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  paidAt?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  table?: Table | null;
  tableId?: string | null;
  customer?: Customer | null;
  customerId?: string | null;
  employee?: Pick<User, 'id' | 'name'> | null;
  employeeId?: string | null;
  sessionId?: string | null;
  items: OrderItem[];
  notes: string;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  status: 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED' | 'CANCELLED';
  kitchenStatus: 'PENDING' | 'TO_COOK' | 'PREPARING' | 'COMPLETED';
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  couponCode?: string | null;
  promotion?: Promotion | null;
  payments: Payment[];
  isPaid: boolean;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  user?: Pick<User, 'id' | 'name' | 'email'>;
  openedAt: string;
  closedAt?: string | null;
  status: 'OPEN' | 'CLOSED';
  openingAmount: number;
  closingAmount: number;
  totalSales: number;
  totalOrders: number;
  cashAmount: number;
  upiAmount: number;
  cardAmount: number;
  taxCollected: number;
  discountsApplied: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  user?: { name: string } | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: any;
  createdAt: string;
}
