import mongoose, { Document, Schema } from 'mongoose';

export interface IPromotion extends Document {
  name: string;
  type: 'product' | 'order';
  conditionProduct?: mongoose.Types.ObjectId;
  conditionQty?: number;
  conditionOrderValue?: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isActive: boolean;
}

const promotionSchema = new Schema<IPromotion>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['product', 'order'], required: true },
    conditionProduct: { type: Schema.Types.ObjectId, ref: 'Product' },
    conditionQty: { type: Number },
    conditionOrderValue: { type: Number },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IPromotion>('Promotion', promotionSchema);
