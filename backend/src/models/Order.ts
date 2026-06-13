import mongoose, { Document, Schema } from 'mongoose';

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  tax: number;
  kitchenCompleted: boolean;
  categoryColor?: string;
}

export interface IPaymentEntry {
  method: 'cash' | 'upi' | 'card';
  amount: number;
  transactionId?: string;
  reference?: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  table?: mongoose.Types.ObjectId;
  customer?: mongoose.Types.ObjectId;
  waiter?: mongoose.Types.ObjectId;
  session?: mongoose.Types.ObjectId;
  items: IOrderItem[];
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
  appliedPromotion?: mongoose.Types.ObjectId;
  payments: IPaymentEntry[];
  isPaid: boolean;
  createdAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  tax: { type: Number, default: 0 },
  kitchenCompleted: { type: Boolean, default: false },
  categoryColor: { type: String },
});

const paymentEntrySchema = new Schema<IPaymentEntry>({
  method: { type: String, enum: ['cash', 'upi', 'card'], required: true },
  amount: { type: Number, required: true },
  transactionId: { type: String },
  reference: { type: String },
});

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    table: { type: Schema.Types.ObjectId, ref: 'Table' },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    waiter: { type: Schema.Types.ObjectId, ref: 'User' },
    session: { type: Schema.Types.ObjectId, ref: 'Session' },
    items: [orderItemSchema],
    notes: { type: String, default: '' },
    type: { type: String, enum: ['dine-in', 'takeaway', 'delivery'], default: 'dine-in' },
    status: {
      type: String,
      enum: ['draft', 'pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'],
      default: 'draft',
    },
    kitchenStatus: {
      type: String,
      enum: ['pending', 'to-cook', 'preparing', 'completed'],
      default: 'pending',
    },
    subtotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    promotionDiscount: { type: Number, default: 0 },
    couponDiscount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    couponCode: { type: String },
    appliedPromotion: { type: Schema.Types.ObjectId, ref: 'Promotion' },
    payments: [paymentEntrySchema],
    isPaid: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IOrder>('Order', orderSchema);
