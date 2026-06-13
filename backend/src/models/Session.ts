import mongoose, { Document, Schema } from 'mongoose';

export interface ISession extends Document {
  user: mongoose.Types.ObjectId;
  openedAt: Date;
  closedAt?: Date;
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

const sessionSchema = new Schema<ISession>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date },
    isOpen: { type: Boolean, default: true },
    summary: {
      totalSales: { type: Number, default: 0 },
      totalOrders: { type: Number, default: 0 },
      cashAmount: { type: Number, default: 0 },
      upiAmount: { type: Number, default: 0 },
      cardAmount: { type: Number, default: 0 },
      taxCollected: { type: Number, default: 0 },
      discountsApplied: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model<ISession>('Session', sessionSchema);
