import mongoose, { Document, Schema } from 'mongoose';

export interface IPaymentMethod extends Document {
  name: 'cash' | 'upi' | 'card';
  label: string;
  isEnabled: boolean;
}

const paymentMethodSchema = new Schema<IPaymentMethod>(
  {
    name: { type: String, enum: ['cash', 'upi', 'card'], required: true, unique: true },
    label: { type: String, required: true },
    isEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IPaymentMethod>('PaymentMethod', paymentMethodSchema);
