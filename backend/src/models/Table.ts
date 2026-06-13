import mongoose, { Document, Schema } from 'mongoose';

export interface ITable extends Document {
  number: string;
  seats: number;
  floor: mongoose.Types.ObjectId;
  status: 'available' | 'occupied' | 'reserved' | 'disabled';
  isActive: boolean;
}

const tableSchema = new Schema<ITable>(
  {
    number: { type: String, required: true, trim: true },
    seats: { type: Number, required: true, min: 1 },
    floor: { type: Schema.Types.ObjectId, ref: 'Floor', required: true },
    status: { type: String, enum: ['available', 'occupied', 'reserved', 'disabled'], default: 'available' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ITable>('Table', tableSchema);
