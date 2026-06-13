import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  category: mongoose.Types.ObjectId;
  price: number;
  unit: 'piece' | 'kg' | 'liter';
  tax: number;
  description: string;
  isAvailable: boolean;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    price: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: ['piece', 'kg', 'liter'], default: 'piece' },
    tax: { type: Number, default: 0, min: 0, max: 100 },
    description: { type: String, default: '' },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IProduct>('Product', productSchema);
